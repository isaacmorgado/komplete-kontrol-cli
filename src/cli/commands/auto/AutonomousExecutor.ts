/**
 * AutonomousExecutor - Runs the autonomous ReAct + Reflexion loop
 *
 * Handles:
 * - Loop execution with max iterations
 * - Reflexion cycle execution
 * - Goal achievement checking
 * - Context compaction management
 * - Skill invocation coordination
 */

import type { CommandContext, AutoConfig, CommandResult } from '../../types';
import type { ReflexionAgent, ReflexionCycle } from '../../../core/agents/reflexion';
import type { Message } from '../../../core/llm/types';
import { MemoryManagerBridge } from '../../../core/llm/bridge/BashBridge';
import { ContextManager } from '../../../core/llm/ContextManager';

export interface ExecutorDependencies {
  memory: MemoryManagerBridge;
  contextManager?: ContextManager;
  conversationHistory: Message[];
  taskType: string;
}

export interface ExecutorCallbacks {
  onInfo: (message: string) => void;
  onWarn: (message: string) => void;
  onSuccess: (message: string) => void;
  onSpinnerUpdate: (message: string) => void;
  onCycleDisplay: (cycle: ReflexionCycle, verbose: boolean) => void;
  onSkillInvocation: (context: CommandContext, config: AutoConfig, cycle: ReflexionCycle, isGoalAchieved: boolean) => Promise<void>;
  onContextCompaction: (config: AutoConfig) => Promise<void>;
}

export interface ExecutorState {
  iterations: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  taskInProgress: boolean;
}

export class AutonomousExecutor {
  private state: ExecutorState = {
    iterations: 0,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    taskInProgress: false
  };

  constructor(
    private deps: ExecutorDependencies,
    private callbacks: ExecutorCallbacks
  ) {}

  /**
   * Run the autonomous ReAct + Reflexion loop
   */
  async runLoop(
    agent: ReflexionAgent,
    context: CommandContext,
    config: AutoConfig
  ): Promise<CommandResult> {
    const maxIterations = config.maxIterations || 50;
    let goalAchieved = false;

    while (this.state.iterations < maxIterations && !goalAchieved) {
      this.state.iterations++;
      this.callbacks.onSpinnerUpdate(`Iteration ${this.state.iterations}/${maxIterations}`);

      try {
        // Step 1: Check context health for sliding autocompaction
        await this.callbacks.onContextCompaction(config);

        // Step 2: Execute one ReAct + Reflexion cycle
        this.state.taskInProgress = true;
        const cycle = await this.executeReflexionCycle(agent, context, config);
        this.state.taskInProgress = false;

        // Display cycle results
        this.callbacks.onCycleDisplay(cycle, config.verbose || false);

        // Track consecutive successes/failures
        if (cycle.success) {
          this.state.consecutiveSuccesses++;
          this.state.consecutiveFailures = 0;
        } else {
          this.state.consecutiveFailures++;
          this.state.consecutiveSuccesses = 0;
        }

        // Step 3: Check if goal is achieved
        goalAchieved = await this.checkGoalAchievement(agent, context, config.goal);

        // Step 4: Invoke skills
        await this.callbacks.onSkillInvocation(context, config, cycle, goalAchieved);

        // Brief pause between iterations
        await this.sleep(500);

      } catch (error) {
        const err = error as Error;
        this.callbacks.onWarn(`Iteration ${this.state.iterations} failed: ${err.message}`);

        // Record failure and continue
        await this.deps.memory.recordEpisode(
          'error_encountered',
          `Iteration ${this.state.iterations} error`,
          'failed',
          err.message
        );

        // Don't stop - autonomous mode should be resilient
        continue;
      }
    }

    if (!goalAchieved && this.state.iterations >= maxIterations) {
      return {
        success: false,
        message: `Max iterations (${maxIterations}) reached without achieving goal`
      };
    }

    return {
      success: true,
      message: 'Goal achieved',
      data: {
        iterations: this.state.iterations,
        history: agent.getHistory()
      }
    };
  }

  /**
   * Execute one ReAct + Reflexion cycle
   */
  private async executeReflexionCycle(
    agent: ReflexionAgent,
    context: CommandContext,
    config: AutoConfig
  ): Promise<ReflexionCycle> {
    // Get current context from memory
    const memoryContext = await this.deps.memory.getWorking();
    const recentEpisodes = await this.deps.memory.searchEpisodes(config.goal, 5);

    // Build prompt with context
    const prompt = this.buildCyclePrompt(config.goal, memoryContext, recentEpisodes);

    // Add to conversation history
    const userMessage: Message = { role: 'user', content: prompt };
    this.deps.conversationHistory.push(userMessage);

    // Use LLM to generate thought
    const llmResponse = await context.llmRouter.route(
      {
        messages: [{ role: 'user', content: prompt }],
        system: 'You are an autonomous AI agent executing tasks. Think step by step.'
      },
      {
        taskType: 'reasoning',
        priority: 'quality',
        preferredModel: config.model,
        requiresUnrestricted: false
      }
    );

    // Extract text from response
    const firstContent = llmResponse.content[0];
    const thought = firstContent.type === 'text' ? firstContent.text : 'Unable to extract thought';

    // Add assistant response to history
    const assistantMessage: Message = {
      role: 'assistant',
      content: llmResponse.content
    };
    this.deps.conversationHistory.push(assistantMessage);

    // Execute cycle with LLM-generated thought
    const cycle = await agent.cycle(thought);

    // Record to memory
    await this.deps.memory.addContext(
      `Iteration ${this.state.iterations}: ${cycle.thought}`,
      7
    );

    return cycle;
  }

  /**
   * Build prompt for ReAct cycle
   */
  private buildCyclePrompt(
    goal: string,
    memoryContext: string,
    recentEpisodes: string
  ): string {
    return `
Goal: ${goal}

Context:
${memoryContext}

Recent History:
${recentEpisodes}

What is next step to achieve this goal? Think through:
1. What has been done so far?
2. What remains to be done?
3. What is the best next action?

Provide your reasoning and proposed action.
`.trim();
  }

  /**
   * Check if goal has been achieved
   */
  private async checkGoalAchievement(
    agent: ReflexionAgent,
    context: CommandContext,
    goal: string
  ): Promise<boolean> {
    const history = agent.getHistory();

    // Simple heuristic: Check last 3 cycles for success
    const recentCycles = history.slice(-3);
    const allSuccessful = recentCycles.every(c => c.success);

    if (allSuccessful && recentCycles.length >= 3) {
      try {
        // Use LLM to verify goal achievement
        const verificationPrompt = `
Goal: ${goal}

Recent actions and results:
${recentCycles.map(c => `
Thought: ${c.thought}
Action: ${c.action}
Result: ${c.observation}
`).join('\n')}

Has the goal been achieved? Answer with just "YES" or "NO" and brief explanation.
`.trim();

        const response = await context.llmRouter.route(
          {
            messages: [{ role: 'user', content: verificationPrompt }],
            system: 'You are evaluating if a goal has been achieved. Be objective.'
          },
          {
            taskType: 'reasoning',
            priority: 'speed'
          }
        );

        // Extract text from response
        const firstContent = response.content[0];
        const answer = firstContent.type === 'text' ? firstContent.text : 'NO';
        return answer.toUpperCase().startsWith('YES');
      } catch (error) {
        // If LLM verification fails, use simple heuristic
        this.callbacks.onWarn('LLM verification unavailable, using heuristic');
        return allSuccessful && recentCycles.length >= 3;
      }
    }

    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current state
   */
  getState(): Readonly<ExecutorState> {
    return { ...this.state };
  }
}
