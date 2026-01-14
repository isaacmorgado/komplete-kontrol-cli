/**
 * ReAct + Reflexion Pattern Implementation
 * Source: /auto hooks/react-reflexion.sh
 *
 * Pattern: Think → Act → Observe → Reflect
 */

import { ActionExecutor, type Action, type ActionResult } from '../ActionExecutor';
import type { LLMRouter } from '../../llm/Router';

/**
 * A single cycle in the ReAct + Reflexion loop
 */
export interface ReflexionCycle {
  /** The reasoning step: what should be done next */
  thought: string;
  /** The action taken based on the thought */
  action: string;
  /** The observed result of the action */
  observation: string;
  /** Self-critique and lessons learned */
  reflection: string;
  /** Whether this cycle succeeded */
  success: boolean;
}

/**
 * Metadata value types
 */
export type MetadataValue = string | number | boolean | null | undefined | MetadataValue[] | { [key: string]: MetadataValue };

/**
 * Agent execution context
 */
export interface Context {
  /** The high-level goal the agent is working towards */
  goal: string;
  /** History of all ReAct + Reflexion cycles */
  history: ReflexionCycle[];
  /** Additional context metadata */
  metadata: Record<string, MetadataValue>;
  /** Progress metrics */
  metrics: {
    filesCreated: number;
    filesModified: number;
    linesChanged: number;
    iterations: number;
  };
}

/**
 * ReAct + Reflexion Agent
 *
 * Implements the Think-Act-Observe-Reflect loop with real action execution.
 * This agent autonomously works towards a goal by:
 * 1. **Thinking**: Reasoning about what to do next
 * 2. **Acting**: Executing the chosen action
 * 3. **Observing**: Recording the outcome
 * 4. **Reflecting**: Learning from the result
 *
 * @example
 * ```ts
 * const agent = new ReflexionAgent("Create a TypeScript config file", llmRouter);
 * const cycle = await agent.cycle("Start with basic tsconfig.json");
 * console.log(cycle.reflection); // Learn from the outcome
 * ```
 */
export class ReflexionAgent {
  private context: Context;
  private executor?: ActionExecutor;
  private llmRouter?: LLMRouter;
  private preferredModel?: string;

  /**
   * Create a new ReflexionAgent
   *
   * @param goal - The high-level goal to work towards
   * @param llmRouter - Optional LLM router for generating thoughts (if not provided, uses templates)
   * @param preferredModel - Optional preferred model to use for reasoning
   */
  constructor(goal: string, llmRouter?: LLMRouter, preferredModel?: string) {
    this.context = {
      goal,
      history: [],
      metadata: {},
      metrics: {
        filesCreated: 0,
        filesModified: 0,
        linesChanged: 0,
        iterations: 0
      }
    };

    this.llmRouter = llmRouter;
    this.preferredModel = preferredModel;

    // Initialize ActionExecutor if LLM router provided
    if (llmRouter) {
      this.executor = new ActionExecutor(llmRouter);
    }
  }

  /**
   * Execute a complete ReAct + Reflexion cycle
   *
   * Runs one iteration of Think → Act → Observe → Reflect.
   * Each cycle:
   * - Checks for stagnation and repetition
   * - Generates reasoning about what to do
   * - Executes the chosen action
   * - Observes and validates the result
   * - Reflects and learns from the outcome
   *
   * @param input - The current input or context for this cycle
   * @returns A completed ReflexionCycle with thought, action, observation, and reflection
   * @throws {Error} If the agent is stuck (stagnation or repetition detected)
   *
   * @example
   * ```ts
   * const cycle = await agent.cycle("Implement login function");
   * if (cycle.success) {
   *   console.log("Action succeeded:", cycle.observation);
   * } else {
   *   console.log("Action failed, reflection:", cycle.reflection);
   * }
   * ```
   */
  async cycle(input: string): Promise<ReflexionCycle> {
    this.context.metrics.iterations++;

    // Check for stagnation before continuing
    if (this.detectStagnation()) {
      throw new Error('Agent stuck: No progress for multiple iterations');
    }

    // Check for repetition
    if (this.detectRepetition(input)) {
      throw new Error('Agent stuck: Repeating same actions');
    }

    // THINK: Generate reasoning
    const thought = await this.think(input);

    // ACT: Execute action
    const action = await this.act(thought);

    // OBSERVE: Record outcome
    let observation = await this.observe(action);

    // Validate observable changes match goal
    const goalAlignment = this.validateGoalAlignment(observation);
    if (!goalAlignment.aligned) {
      observation += `\n⚠️ Goal misalignment: ${goalAlignment.reason}`;
    }

    // REFLECT: Learn from outcome
    const reflection = await this.reflect(thought, action, observation);

    const cycle: ReflexionCycle = {
      thought,
      action,
      observation,
      reflection,
      success: this.evaluateSuccess(observation)
    };

    this.context.history.push(cycle);

    return cycle;
  }

  /**
   * THINK: Generate explicit reasoning about what to do
   */
  private async think(input: string): Promise<string> {
    // Special handling for error inputs - pass through directly
    if (input.startsWith('[ERROR]')) {
      return input;
    }

    // If no LLM router, fallback to template
    if (!this.llmRouter) {
      return `Reasoning about: ${input} with goal: ${this.context.goal}`;
    }

    // Build context from history
    const recentHistory = this.context.history.slice(-3).map(cycle =>
      `Previous: ${cycle.thought} → ${cycle.action} → ${cycle.observation} → ${cycle.reflection}`
    ).join('\n');

    const progressSummary = `Progress: ${this.context.metrics.filesCreated} created, ${this.context.metrics.filesModified} modified, ${this.context.metrics.linesChanged} lines changed`;

    // Construct prompt for LLM
    const systemPrompt = `You are a reasoning agent using the ReAct pattern. Given a goal and current input, generate explicit reasoning about what action to take next.

Your response should:
1. Analyze the current situation and input
2. Consider past actions and their outcomes
3. Propose the next logical step towards the goal
4. Be specific and actionable (mention exact filenames, actions, etc.)

Keep your reasoning concise (2-3 sentences max).`;

    const userPrompt = `Goal: ${this.context.goal}

Current Input: ${input}

${recentHistory ? `Recent History:\n${recentHistory}\n` : ''}
${progressSummary}

What should I do next? Provide specific, actionable reasoning.`;

    try {
      // Route request through LLM
      const response = await this.llmRouter.route(
        {
          messages: [
            { role: 'user', content: userPrompt }
          ],
          system: systemPrompt,
          max_tokens: 200,
          temperature: 0.7
        },
        {
          taskType: 'reasoning',
          priority: 'balanced',
          requiresTools: false,
          requiresVision: false,
          preferredModel: this.preferredModel  // Use agent's preferred model if set
        }
      );

      // Extract text from response
      const textContent = response.content.find(block => block.type === 'text');
      if (textContent && 'text' in textContent) {
        return textContent.text.trim();
      }

      return `Reasoning about: ${input} with goal: ${this.context.goal}`;
    } catch (error) {
      // Fallback on LLM error
      console.error('[ReflexionAgent] LLM think() failed:', error);
      return `Reasoning about: ${input} with goal: ${this.context.goal}`;
    }
  }

  /**
   * ACT: Execute the action based on reasoning
   */
  private async act(thought: string): Promise<string> {
    // If thought contains an error, propagate it
    if (thought.includes('[ERROR]')) {
      return thought;
    }

    if (!this.executor) {
      // Fallback to placeholder if no executor
      return `[PLACEHOLDER] Action based on: ${thought}`;
    }

    try {
      // Parse thought into actionable command
      const action: Action = await this.executor.parseThoughtToAction(
        thought,
        this.context.goal
      );

      // Execute the action
      const result: ActionResult = await this.executor.execute(action);

      // Update metrics based on action result
      if (result.success && result.metadata) {
        if (action.type === 'file_write') {
          if (result.metadata.existed) {
            this.context.metrics.filesModified++;
            this.context.metrics.linesChanged += result.metadata.lines || 0;
          } else {
            this.context.metrics.filesCreated++;
            this.context.metrics.linesChanged += result.metadata.lines || 0;
          }
        }
      }

      // Auto-validate TypeScript files after file_write
      if (action.type === 'file_write' && action.params.path?.endsWith('.ts')) {
        const validationResult = await this.executor.validateTypeScript([action.params.path]);
        if (!validationResult.success) {
          return `${action.type}(${JSON.stringify(action.params)}): ${result.output}\n⚠️ TypeScript validation failed: ${validationResult.error}`;
        }
      }

      // Return action description and result
      return `${action.type}(${JSON.stringify(action.params)}): ${result.output}`;
    } catch (error) {
      const err = error as Error;
      return `[ERROR] Failed to execute action: ${err.message}`;
    }
  }

  /**
   * OBSERVE: Record the result of the action
   */
  private async observe(action: string): Promise<string> {
    // Parse action result
    if (action.startsWith('[ERROR]')) {
      return `Action failed: ${action}`;
    }

    if (action.startsWith('[PLACEHOLDER]')) {
      return `Placeholder action (no real execution): ${action}`;
    }

    // Extract meaningful observation from action result
    const actionTypeMatch = action.match(/^(\w+)\(/);
    const actionType = actionTypeMatch ? actionTypeMatch[1] : 'unknown';

    // Extract filename context from action
    let filename: string | null = null;
    const filenameMatch = action.match(/"path":"([^"]+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }

    // Check if this was a file creation vs modification
    let observation = '';
    switch (actionType) {
      case 'file_write':
        if (action.includes('File created:')) {
          observation = filename
            ? `File successfully created: ${filename}`
            : 'File successfully created';
        } else if (action.includes('File updated:')) {
          observation = filename
            ? `File successfully updated: ${filename}`
            : 'File successfully updated';
        } else {
          observation = filename
            ? `File successfully created/updated: ${filename}`
            : 'File successfully created/updated';
        }
        break;
      case 'file_read':
        observation = filename
          ? `File contents retrieved: ${filename}`
          : 'File contents retrieved';
        break;
      case 'command':
        observation = 'Command executed successfully';
        break;
      case 'llm_generate':
        observation = 'Code generated successfully';
        break;
      default:
        observation = `Action completed: ${action}`;
    }

    return observation;
  }

  /**
   * REFLECT: Self-critique and extract lessons
   */
  private async reflect(
    thought: string,
    action: string,
    observation: string
  ): Promise<string> {
    const reflections: string[] = [];

    // 1. Check for error patterns FIRST (highest priority)
    if (observation.includes('[ERROR]') || observation.toLowerCase().includes('failed')) {
      reflections.push(
        `❌ Action failed. Need to adjust approach or check preconditions.`
      );
      // Early return for errors - don't add success messages
      return reflections.join('\n');
    }

    // 2. Check for expectation mismatches
    const expectedOutcome = this.extractExpectedOutcome(thought);
    const actualOutcome = this.extractActualOutcome(observation);

    if (expectedOutcome && actualOutcome && expectedOutcome !== actualOutcome) {
      reflections.push(
        `⚠️ Expectation mismatch: Expected "${expectedOutcome}" but got "${actualOutcome}"`
      );
    }

    // 3. Check if goal is being addressed
    if (!this.isProgressTowardsGoal(action, observation)) {
      reflections.push(
        `⚠️ Current action may not be contributing to goal: ${this.context.goal}`
      );
    }

    // 4. Analyze progress metrics
    const { metrics } = this.context;
    if (metrics.iterations > 5 && metrics.filesCreated === 0 && metrics.filesModified === 0) {
      reflections.push(
        `⚠️ ${metrics.iterations} iterations with no file changes. May be stuck in planning loop.`
      );
    }

    // 5. Success patterns (only if no errors)
    if (observation.includes('successfully') || observation.includes('created')) {
      reflections.push(
        `✅ Action succeeded. Continue with next step towards goal.`
      );
    }

    // Combine reflections or provide default
    if (reflections.length > 0) {
      return reflections.join('\n');
    }

    return `Reflection: ${thought} → ${action} → ${observation}`;
  }

  /**
   * Extract expected outcome from thought
   */
  private extractExpectedOutcome(thought: string): string | null {
    // Simple heuristic: look for action verbs and their objects
    const patterns = [
      /create (\w+\.ts)/i,
      /update (\w+\.ts)/i,
      /add (\w+ \w+)/i,
      /implement (\w+)/i
    ];

    for (const pattern of patterns) {
      const match = thought.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract actual outcome from observation
   */
  private extractActualOutcome(observation: string): string | null {
    // Extract file names or actions from observations
    const fileMatch = observation.match(/(\w+\.ts)/);
    if (fileMatch) {
      return fileMatch[1];
    }

    if (observation.includes('failed') || observation.includes('[ERROR]')) {
      return 'failure';
    }

    if (observation.includes('successfully') || observation.includes('created')) {
      return 'success';
    }

    return null;
  }

  /**
   * Check if action/observation contributes to goal
   */
  private isProgressTowardsGoal(action: string, observation: string): boolean {
    const { goal } = this.context;
    const goalLower = goal.toLowerCase();
    const actionLower = action.toLowerCase();
    const obsLower = observation.toLowerCase();

    // Extract key terms from goal
    const goalTerms = goalLower
      .split(/\s+/)
      .filter(term => term.length > 3);

    // Check if action or observation contains goal terms
    const hasGoalTerms = goalTerms.some(term =>
      actionLower.includes(term) || obsLower.includes(term)
    );

    return hasGoalTerms;
  }

  /**
   * Evaluate if the cycle was successful based on the observation
   *
   * @param observation - The observation string from the action
   * @returns true if the action succeeded, false otherwise
   */
  private evaluateSuccess(observation: string): boolean {
    // Check for explicit failure indicators
    if (observation.includes('[ERROR]') || observation.includes('failed')) {
      return false;
    }

    // Check for success indicators
    if (observation.includes('successfully') || observation.includes('created') || observation.includes('updated')) {
      return true;
    }

    // Default to true for neutral observations
    return true;
  }

  /**
   * Get the full history of all ReAct + Reflexion cycles
   *
   * @returns Array of all completed cycles, in chronological order
   *
   * @example
   * ```ts
   * const history = agent.getHistory();
   * const failures = history.filter(c => !c.success);
   * console.log(`Failed ${failures.length} times`);
   * ```
   */
  getHistory(): ReflexionCycle[] {
    return this.context.history;
  }

  /**
   * Get current progress metrics
   *
   * @returns Object with counts of files created/modified, lines changed, and iterations
   *
   * @example
   * ```ts
   * const metrics = agent.getMetrics();
   * console.log(`Created ${metrics.filesCreated} files in ${metrics.iterations} iterations`);
   * ```
   */
  getMetrics(): Context['metrics'] {
    return this.context.metrics;
  }

  /**
   * Detect if agent is stuck (no progress for N iterations)
   */
  private detectStagnation(): boolean {
    const STAGNATION_THRESHOLD = 5;
    const { history } = this.context;

    // Check if we have enough history
    if (history.length < STAGNATION_THRESHOLD) {
      return false;
    }

    // Get recent history
    const recentHistory = history.slice(-STAGNATION_THRESHOLD);

    // If no file changes in last N iterations, we're stagnant
    const noProgress = recentHistory.every(cycle => {
      return !cycle.action.includes('file_write') || cycle.action.includes('[ERROR]');
    });

    return noProgress;
  }

  /**
   * Detect if agent is repeating the same actions
   */
  private detectRepetition(_input: string): boolean {
    const REPETITION_THRESHOLD = 3;
    const { history } = this.context;

    if (history.length < REPETITION_THRESHOLD) {
      return false;
    }

    // Get last N cycles
    const recentCycles = history.slice(-REPETITION_THRESHOLD);

    // Check if all recent cycles have identical thoughts
    const thoughts = recentCycles.map(c => c.thought);
    const allSame = thoughts.every(t => t === thoughts[0]);

    return allSame;
  }

  /**
   * Validate if observable changes align with stated goal
   */
  private validateGoalAlignment(observation: string): { aligned: boolean; reason?: string } {
    const { goal } = this.context;

    // Extract key terms from goal
    const goalLower = goal.toLowerCase();
    const observationLower = observation.toLowerCase();

    // Simple heuristic: check if goal mentions specific files/actions
    // that should be reflected in observations

    // Extract filename from observation (now includes filenames!)
    const obsFileMatch = observation.match(/(\w+)\.ts/);

    if (obsFileMatch) {
      const obsFile = obsFileMatch[1]; // e.g., "unrelated-file" from "unrelated-file.ts"

      // Check if goal mentions this filename (with or without extension)
      const goalMentionsFile = goalLower.includes(obsFile.toLowerCase());

      if (!goalMentionsFile) {
        // Goal doesn't mention the file being created/modified
        return {
          aligned: false,
          reason: `Goal does not mention ${obsFileMatch[0]} but action affected it`
        };
      }
    }

    // Check exact filename match if goal has explicit .ts file
    const goalFileMatch = goal.match(/(\w+\.ts)/);
    if (goalFileMatch && obsFileMatch) {
      const goalFile = goalFileMatch[1];
      const obsFile = obsFileMatch[0];

      if (goalFile !== obsFile) {
        return {
          aligned: false,
          reason: `Goal mentions ${goalFile} but action affected ${obsFile}`
        };
      }
    }

    // Check for action type alignment
    if (goalLower.includes('create') && observationLower.includes('updated')) {
      return {
        aligned: false,
        reason: 'Goal is to create file but observation shows update'
      };
    }

    if (goalLower.includes('update') && observationLower.includes('created')) {
      return {
        aligned: false,
        reason: 'Goal is to update file but observation shows creation'
      };
    }

    return { aligned: true };
  }
}
