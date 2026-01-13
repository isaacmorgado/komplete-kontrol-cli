/**
 * /auto Command - Autonomous Mode
 *
 * Implements the ReAct + Reflexion loop with:
 * - Smart LLM routing
 * - Memory integration
 * - Auto-checkpoint at thresholds
 * - Auto-commit for milestones
 * - Auto-compact for context optimization
 * - Continuous execution until goal achieved
 * - Reverse engineering integration
 * - Prompt selection based on task type
 *
 * Skill Invocation Logic (based on Claude agent skills):
 * - /checkpoint: Before major edits, at natural breakpoints, or when trying experimental changes
 * - /commit: For permanent version history and collaboration, when work is stable and ready to share
 * - /compact: When context window is getting full, proactively at checkpoints or natural breakpoints
 * - /re: For reverse engineering tasks (analyze, extract, deobfuscate)
 */

import chalk from 'chalk';
import { BaseCommand } from '../BaseCommand';
import type { CommandContext, CommandResult, AutoConfig } from '../types';
import { ReflexionAgent, type ReflexionCycle } from '../../core/agents/reflexion';
import { MemoryManagerBridge } from '../../core/llm/bridge/BashBridge';
import { ErrorHandler } from '../../core/llm/ErrorHandler';
import { ContextManager, COMPACTION_STRATEGIES } from '../../core/llm/ContextManager';
import type { Message } from '../../core/llm/types';
import { CheckpointCommand } from './CheckpointCommand';
import { CommitCommand } from './CommitCommand';
import { CompactCommand } from './CompactCommand';
import { ReCommand, type ReOptions } from './ReCommand';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AutoCommand extends BaseCommand {
  name = 'auto';
  description = 'Enter autonomous mode with ReAct + Reflexion loop';

  private iterations = 0;
  private memory: MemoryManagerBridge;
  private errorHandler: ErrorHandler;
  private contextManager?: ContextManager;
  private conversationHistory: Message[] = [];
  
  // Skill commands for autonomous invocation
  private checkpointCommand: CheckpointCommand;
  private commitCommand: CommitCommand;
  private compactCommand: CompactCommand;
  private reCommand: ReCommand;
  
  // Track skill invocation state
  private lastCheckpointIteration = 0;
  private lastCommitIteration = 0;
  private lastCompactIteration = 0;
  private lastReIteration = 0;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  
  // Task type detection
  private currentTaskType: TaskType = 'general';

  constructor() {
    super();
    this.memory = new MemoryManagerBridge();
    this.errorHandler = new ErrorHandler();
    this.checkpointCommand = new CheckpointCommand();
    this.commitCommand = new CommitCommand();
    this.compactCommand = new CompactCommand();
    this.reCommand = new ReCommand();
  }

  async execute(context: CommandContext, config: AutoConfig): Promise<CommandResult> {
    try {
      // Validate config
      if (!config.goal) {
        return this.createFailure('Goal is required. Usage: komplete auto "your goal"');
      }

      // Detect task type for prompt selection
      this.currentTaskType = this.detectTaskType(config.goal);
      
      // Initialize
      this.info(`🤖 Autonomous mode activated`);
      this.info(`Goal: ${chalk.bold(config.goal)}`);
      this.info(`Task Type: ${chalk.cyan(this.currentTaskType)}`);
      console.log('');

      // Set up memory context
      await this.memory.setTask(config.goal, 'Autonomous mode execution');
      await this.memory.addContext(`Model: ${config.model || 'auto-routed'}`, 9);
      await this.memory.addContext(`Task Type: ${this.currentTaskType}`, 8);

      // Execute reverse engineering tools if task type matches
      if (this.currentTaskType === 'reverse-engineering') {
        await this.executeReverseEngineeringTools(context, config.goal);
      }

      // Initialize ContextManager with 80% compaction threshold
      this.contextManager = new ContextManager(
        {
          maxTokens: 128000,  // Claude Sonnet 4.5 context window
          warningThreshold: 70,
          compactionThreshold: 80,
          strategy: COMPACTION_STRATEGIES.balanced
        },
        context.llmRouter
      );

      // Create ReflexionAgent
      // Create ReflexionAgent with LLM router for real action execution
      const agent = new ReflexionAgent(config.goal, context.llmRouter);

      // Run autonomous loop
      const result = await this.runAutonomousLoop(agent, context, config);

      if (result.success) {
        this.success(`Goal achieved in ${this.iterations} iterations`);

        // Record success to memory
        await this.memory.recordEpisode(
          'task_complete',
          `Completed: ${config.goal}`,
          'success',
          `Iterations: ${this.iterations}`
        );
      } else {
        this.error(`Failed after ${this.iterations} iterations`);
      }

      return result;
    } catch (error) {
      const err = error as Error;
      this.failSpinner('Autonomous mode failed');

      // Classify error and provide helpful remediation
      const classified = this.errorHandler.classify(error);
      const errorMessage = this.errorHandler.formatError(classified);
      const remediations = this.errorHandler.getRemediation(classified.type);

      // Display error details
      this.error(errorMessage);
      if (remediations.length > 0) {
        console.log(chalk.gray('\nSuggested actions:'));
        remediations.forEach(r => console.log(chalk.gray(`  • ${r}`)));
      }

      return this.createFailure(errorMessage, err);
    }
  }

  /**
   * Run the autonomous ReAct + Reflexion loop
   */
  private async runAutonomousLoop(
    agent: ReflexionAgent,
    context: CommandContext,
    config: AutoConfig
  ): Promise<CommandResult> {
    const maxIterations = config.maxIterations || 50;
    let goalAchieved = false;

    this.startSpinner('Starting autonomous loop...');

    while (this.iterations < maxIterations && !goalAchieved) {
      this.iterations++;

      this.updateSpinner(`Iteration ${this.iterations}/${maxIterations}`);

      try {
        // Step 1: Check context health and auto-compact if needed
        await this.handleContextCompaction(config);

        // Step 2: Execute one ReAct + Reflexion cycle
        const cycle = await this.executeReflexionCycle(agent, context, config);

        // Display cycle results
        this.displayCycle(cycle, config.verbose || false);

        // Track consecutive successes/failures for skill invocation
        if (cycle.success) {
          this.consecutiveSuccesses++;
          this.consecutiveFailures = 0;
        } else {
          this.consecutiveFailures++;
          this.consecutiveSuccesses = 0;
        }

        // Step 3: Check if goal is achieved
        goalAchieved = await this.checkGoalAchievement(
          agent,
          context,
          config.goal
        );

        // Step 4: Invoke skills based on Claude agent skills logic
        await this.invokeSkills(context, config, cycle, goalAchieved);

        // Brief pause between iterations
        await this.sleep(500);

      } catch (error) {
        const err = error as Error;
        this.warn(`Iteration ${this.iterations} failed: ${err.message}`);

        // Record failure and continue
        await this.memory.recordEpisode(
          'error_encountered',
          `Iteration ${this.iterations} error`,
          'failed',
          err.message
        );

        // Don't stop - autonomous mode should be resilient
        continue;
      }
    }

    this.succeedSpinner(`Autonomous loop completed`);

    // Final checkpoint before completion
    if (goalAchieved) {
      await this.performFinalCheckpoint(context, config.goal);
    }

    if (!goalAchieved && this.iterations >= maxIterations) {
      return this.createFailure(
        `Max iterations (${maxIterations}) reached without achieving goal`
      );
    }

    return this.createSuccess('Goal achieved', {
      iterations: this.iterations,
      history: agent.getHistory()
    });
  }

  /**
   * Handle context compaction based on Claude agent skills:
   * - Compact when context window is getting full
   * - Proactively compact at checkpoints or natural breakpoints
   */
  private async handleContextCompaction(config: AutoConfig): Promise<void> {
    if (!this.contextManager || this.conversationHistory.length === 0) {
      return;
    }

    const health = this.contextManager.checkContextHealth(this.conversationHistory);

    if (health.status === 'warning') {
      this.warn(`Context at ${health.percentage.toFixed(1)}% - approaching limit`);
    }

    if (health.shouldCompact) {
      this.info(`🔄 Context at ${health.percentage.toFixed(1)}% - compacting...`);
      const { messages, result } = await this.contextManager.compactMessages(
        this.conversationHistory,
        `Goal: ${config.goal}`
      );

      this.conversationHistory = messages;
      this.success(
        `Compacted ${result.originalMessageCount} → ${result.compactedMessageCount} messages ` +
        `(${(result.compressionRatio * 100).toFixed(0)}% of original)`
      );

      // Record compaction to memory
      await this.memory.addContext(
        `Context compacted: ${result.compressionRatio.toFixed(2)}x compression`,
        6
      );

      this.lastCompactIteration = this.iterations;
    }
  }

  /**
   * Invoke skills based on Claude agent skills logic:
   *
   * /checkpoint: Before major edits, at natural breakpoints, or when trying experimental changes
   * - Triggered: Every N iterations (configurable), before experimental changes, or after failures
   *
   * /commit: For permanent version history and collaboration, when work is stable and ready to share
   * - Triggered: After consecutive successes, at milestones, or when goal is achieved
   *
   * /compact: When context window is getting full, proactively at checkpoints or natural breakpoints
   * - Triggered: Handled by handleContextCompaction(), can also be invoked at checkpoints
   */
  private async invokeSkills(
    context: CommandContext,
    config: AutoConfig,
    cycle: ReflexionCycle,
    isGoalAchieved: boolean
  ): Promise<void> {
    const checkpointThreshold = config.checkpointThreshold || 10;
    const commitThreshold = 20; // Commit less frequently than checkpoints

    // /checkpoint: Trigger at threshold intervals, before experimental changes, or after failures
    const shouldCheckpoint =
      (this.iterations % checkpointThreshold === 0) || // Regular checkpoints
      (this.consecutiveFailures >= 3) || // After failures for recovery
      (this.iterations - this.lastCheckpointIteration >= checkpointThreshold && this.consecutiveSuccesses >= 5); // After progress

    if (shouldCheckpoint) {
      await this.performCheckpoint(context, config.goal);
      
      // After checkpoint, also consider compacting (Claude best practice)
      if (this.contextManager && this.conversationHistory.length > 0) {
        const health = this.contextManager.checkContextHealth(this.conversationHistory);
        if (health.status === 'warning' || health.status === 'critical') {
          await this.performCompact(context, 'conservative');
        }
      }
    }

    // /commit: Trigger for milestones when work is stable
    const shouldCommit =
      (this.iterations % commitThreshold === 0 && this.consecutiveSuccesses >= 10) || // Milestone after progress
      (isGoalAchieved && this.iterations - this.lastCommitIteration >= 5); // Final milestone

    if (shouldCommit) {
      await this.performCommit(context, config.goal);
    }
    
    // /re: Trigger for reverse engineering tasks
    const shouldInvokeRe =
      this.currentTaskType === 'reverse-engineering' &&
      (this.iterations % 15 === 0 || this.iterations - this.lastReIteration >= 15);
    
    if (shouldInvokeRe) {
      await this.performReCommand(context, config.goal);
    }
  }

  /**
   * Perform checkpoint (session-level recovery)
   * Use before major edits, at natural breakpoints, or when trying experimental changes
   */
  private async performCheckpoint(context: CommandContext, goal: string): Promise<void> {
    this.info('📸 Auto-checkpoint triggered');

    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Auto checkpoint at iteration ${this.iterations}: ${goal}`
      });
      
      if (result.success) {
        this.success('Checkpoint saved - session can be resumed from this point');
      } else {
        this.warn('Checkpoint failed (continuing anyway)');
      }
      
      this.lastCheckpointIteration = this.iterations;
    } catch (error) {
      this.warn('Checkpoint failed (continuing anyway)');
    }
  }

  /**
   * Perform commit (permanent version history)
   * Use for milestones, when work is stable and ready to share
   */
  private async performCommit(context: CommandContext, goal: string): Promise<void> {
    this.info('💾 Auto-commit triggered (milestone)');

    try {
      const result = await this.commitCommand.execute(context, {
        message: `Milestone: ${goal} - iteration ${this.iterations}`,
        push: false // Don't auto-push by default
      });
      
      if (result.success) {
        this.success('Commit created - milestone saved to version history');
      } else {
        this.warn('Commit failed (continuing anyway)');
      }
      
      this.lastCommitIteration = this.iterations;
    } catch (error) {
      this.warn('Commit failed (continuing anyway)');
    }
  }

  /**
   * Perform compact (context optimization)
   * Use when context window is getting full, proactively at checkpoints or natural breakpoints
   */
  private async performCompact(context: CommandContext, level: 'aggressive' | 'conservative' = 'conservative'): Promise<void> {
    this.info('🔄 Auto-compact triggered');

    try {
      const result = await this.compactCommand.execute(context, { level });
      
      if (result.success) {
        this.success('Memory compacted - context optimized');
      } else {
        this.warn('Compact failed (continuing anyway)');
      }
      
      this.lastCompactIteration = this.iterations;
    } catch (error) {
      this.warn('Compact failed (continuing anyway)');
    }
  }

  /**
   * Perform final checkpoint before completion
   */
  private async performFinalCheckpoint(context: CommandContext, goal: string): Promise<void> {
    this.info('📸 Final checkpoint before completion');

    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Goal achieved: ${goal} after ${this.iterations} iterations`
      });
      
      if (result.success) {
        this.success('Final checkpoint saved');
      }
    } catch (error) {
      this.warn('Final checkpoint failed');
    }
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
    const memoryContext = await this.memory.getWorking();
    const recentEpisodes = await this.memory.searchEpisodes(config.goal, 5);

    // Build prompt with context
    const prompt = this.buildCyclePrompt(config.goal, memoryContext, recentEpisodes);

    // Add to conversation history
    const userMessage: Message = { role: 'user', content: prompt };
    this.conversationHistory.push(userMessage);

    // Use LLM to generate thought
    const llmResponse = await context.llmRouter.route(
      {
        messages: [{ role: 'user', content: prompt }],
        system: 'You are an autonomous AI agent executing tasks. Think step by step.'
      },
      {
        taskType: 'reasoning',
        priority: 'quality',
        preferredModel: config.model,  // Supports provider/model syntax
        requiresUnrestricted: false
      }
    );

    // Extract text from response (handle different content types)
    const firstContent = llmResponse.content[0];
    const thought = firstContent.type === 'text' ? firstContent.text : 'Unable to extract thought';

    // Add assistant response to history
    const assistantMessage: Message = {
      role: 'assistant',
      content: llmResponse.content
    };
    this.conversationHistory.push(assistantMessage);

    // Execute the cycle with LLM-generated thought
    const cycle = await agent.cycle(thought);

    // Record to memory
    await this.memory.addContext(
      `Iteration ${this.iterations}: ${cycle.thought}`,
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

What is the next step to achieve this goal? Think through:
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
        this.warn('LLM verification unavailable, using heuristic');
        return allSuccessful && recentCycles.length >= 3;
      }
    }

    return false;
  }

  /**
   * Display cycle results
   */
  private displayCycle(cycle: ReflexionCycle, verbose: boolean): void {
    console.log('');
    console.log(chalk.bold(`Iteration ${this.iterations}:`));

    if (verbose) {
      console.log(chalk.gray(`Thought: ${cycle.thought}`));
      console.log(chalk.gray(`Action: ${cycle.action}`));
      console.log(chalk.gray(`Result: ${cycle.observation}`));
      console.log(chalk.gray(`Reflection: ${cycle.reflection}`));
    }

    const status = cycle.success ? chalk.green('✓ Success') : chalk.red('✗ Failed');
    console.log(status);
    console.log('');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Task type detection for prompt selection
   */
  private detectTaskType(goal: string): TaskType {
    const lowerGoal = goal.toLowerCase();
    
    // Reverse engineering patterns
    if (lowerGoal.includes('reverse engineer') ||
        lowerGoal.includes('deobfuscate') ||
        lowerGoal.includes('analyze code') ||
        lowerGoal.includes('understand code') ||
        lowerGoal.includes('extract') && (lowerGoal.includes('extension') || lowerGoal.includes('electron') || lowerGoal.includes('app'))) {
      return 'reverse-engineering';
    }
    
    // Research patterns
    if (lowerGoal.includes('research') ||
        lowerGoal.includes('investigate') ||
        lowerGoal.includes('find') && lowerGoal.includes('examples') ||
        lowerGoal.includes('search') && (lowerGoal.includes('github') || lowerGoal.includes('patterns'))) {
      return 'research';
    }
    
    // Debugging patterns
    if (lowerGoal.includes('debug') ||
        lowerGoal.includes('fix') && lowerGoal.includes('bug') ||
        lowerGoal.includes('error') ||
        lowerGoal.includes('issue')) {
      return 'debugging';
    }
    
    // Documentation patterns
    if (lowerGoal.includes('document') ||
        lowerGoal.includes('docs') ||
        lowerGoal.includes('readme') ||
        lowerGoal.includes('api docs')) {
      return 'documentation';
    }
    
    // Refactoring patterns
    if (lowerGoal.includes('refactor') ||
        lowerGoal.includes('clean up') ||
        lowerGoal.includes('improve code') ||
        lowerGoal.includes('optimize')) {
      return 'refactoring';
    }
    
    return 'general';
  }

  /**
   * Select appropriate prompt based on task type
   */
  private selectPromptForTaskType(goal: string, taskType: TaskType): string {
    const memoryContext = this.conversationHistory.length > 0
      ? this.conversationHistory.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n\n')
      : '';
    
    switch (taskType) {
      case 'reverse-engineering':
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Reverse Engineering:
1. Analyze the target code thoroughly
2. Identify patterns, architecture, and dependencies
3. Document findings clearly
4. Suggest improvements or security concerns

What is your analysis approach?
`.trim();

      case 'research':
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Research:
1. Search memory for relevant information
2. Search GitHub for code examples and patterns
3. Analyze findings and synthesize insights
4. Provide actionable recommendations

What research approach will you take?
`.trim();

      case 'debugging':
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Debugging:
1. Reproduce the issue
2. Analyze the code path causing the error
3. Form hypotheses about root cause
4. Test each hypothesis
5. Apply fix and verify

What is your debugging strategy?
`.trim();

      case 'documentation':
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Documentation:
1. Identify what needs to be documented
2. Structure the documentation logically
3. Include clear examples and usage
4. Ensure completeness and accuracy

What documentation structure will you create?
`.trim();

      case 'refactoring':
        return `
Goal: ${goal}

Context:
${memoryContext}

Instructions for Refactoring:
1. Analyze current code structure
2. Identify code smells and anti-patterns
3. Apply SOLID principles and best practices
4. Ensure tests pass after refactoring

What refactoring approach will you use?
`.trim();

      default:
        return `
Goal: ${goal}

Context:
${memoryContext}

What is the next step to achieve this goal? Think through:
1. What has been done so far?
2. What remains to be done?
3. What is the best next action?

Provide your reasoning and proposed action.
`.trim();
    }
  }

  /**
   * Execute reverse engineering tools
   */
  private async executeReverseEngineeringTools(context: CommandContext, goal: string): Promise<void> {
    this.info('🔬 Reverse engineering tools detected');
    
    try {
      // Determine target from goal
      const targetMatch = goal.match(/(?:analyze|extract|deobfuscate|understand)\s+(.+?)(?:\s|$)/i);
      const target = targetMatch ? targetMatch[1] : '.';
      
      // Run re-analyze.sh for code analysis
      this.info('Running code pattern analysis...');
      try {
        const { stdout: analyzeOutput } = await execAsync(`bash src/reversing/re-analyze.sh analyze "${target}"`);
        this.success('Code analysis complete');
        console.log(chalk.gray(analyzeOutput.substring(0, 500) + '...'));
      } catch (error) {
        this.warn('Code analysis failed, continuing...');
      }
      
      // Run re-docs.sh for documentation generation
      this.info('Generating documentation...');
      try {
        const { stdout: docsOutput } = await execAsync(`bash src/reversing/re-docs.sh project "${target}"`);
        this.success('Documentation generated');
        console.log(chalk.gray(docsOutput.substring(0, 300) + '...'));
      } catch (error) {
        this.warn('Documentation generation failed, continuing...');
      }
      
      // Run re-prompt.sh for optimized prompts
      this.info('Generating optimized prompts...');
      try {
        const { stdout: promptOutput } = await execAsync(`bash src/reversing/re-prompt.sh understand "${target}"`);
        this.success('Optimized prompts generated');
        console.log(chalk.gray(promptOutput.substring(0, 300) + '...'));
      } catch (error) {
        this.warn('Prompt generation failed, continuing...');
      }
      
      // Record to memory
      await this.memory.recordEpisode(
        'reverse_engineering',
        `RE tools executed for: ${target}`,
        'success',
        're-analyze, re-docs, re-prompt'
      );
    } catch (error) {
      this.warn('Reverse engineering tools encountered errors');
    }
  }
}

/**
 * Task type enumeration
 */
type TaskType =
  | 'reverse-engineering'
  | 'research'
  | 'debugging'
  | 'documentation'
  | 'refactoring'
  | 'general';
