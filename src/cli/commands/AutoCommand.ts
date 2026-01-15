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
import { ReCommand } from './ReCommand';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DebugOrchestrator, createDebugOrchestrator, type SmartDebugInput, type VerifyFixInput } from '../../core/debug/orchestrator';
import { AutonomousExecutor } from './auto/AutonomousExecutor';
import { HookIntegration } from './auto/HookIntegration';
import { SkillInvoker } from './auto/SkillInvoker';
import { TestingIntegration } from './auto/TestingIntegration';

const execAsync = promisify(exec);

export class AutoCommand extends BaseCommand {
  name = 'auto';
  description = 'Enter autonomous mode with ReAct + Reflexion loop';

  private iterations = 0;
  private memory: MemoryManagerBridge;
  private errorHandler: ErrorHandler;
  private contextManager?: ContextManager;
  private conversationHistory: Message[] = [];

  // Module integrations
  private hookIntegration: HookIntegration;
  private skillInvoker: SkillInvoker;
  private testingIntegration: TestingIntegration;
  private reCommand: ReCommand;
  private debugOrchestrator: DebugOrchestrator;

  // Track skill invocation state
  private lastCheckpointIteration = 0;
  private lastCommitIteration = 0;
  private lastCompactIteration = 0;
  private lastReIteration = 0;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;

  // Task type detection
  private currentTaskType: TaskType = 'general';

  // Sliding autocompaction state
  private taskInProgress = false;
  private pendingCompaction = false;
  private contextExceededThreshold = false;

  constructor() {
    super();
    this.memory = new MemoryManagerBridge();
    this.errorHandler = new ErrorHandler();
    this.hookIntegration = new HookIntegration();
    this.testingIntegration = new TestingIntegration();
    this.skillInvoker = new SkillInvoker(
      {
        iterations: 0,
        lastCheckpointIteration: 0,
        lastCommitIteration: 0,
        lastCompactIteration: 0,
        consecutiveSuccesses: 0,
        consecutiveFailures: 0
      },
      {
        onInfo: (msg) => this.info(msg),
        onWarn: (msg) => this.warn(msg),
        onSuccess: (msg) => this.success(msg)
      }
    );
    this.reCommand = new ReCommand();
    this.debugOrchestrator = createDebugOrchestrator();
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

      // Initialize ContextManager with 40% compaction threshold (sliding autocompaction)
      this.contextManager = new ContextManager(
        {
          maxTokens: 128000,  // Claude Sonnet 4.5 context window
          warningThreshold: 30,  // Warning at 30%
          compactionThreshold: 40,  // Compaction at 40% (sliding threshold)
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
    this.startSpinner('Starting autonomous loop...');

    // Phase 0: Initial analysis and planning
    this.info('📊 Phase 0: Initial analysis and planning');

    // Select reasoning mode
    const reasoningMode = await this.hookIntegration.selectReasoningMode(config.goal, '');
    this.info(`Reasoning mode: ${reasoningMode.mode} (confidence: ${reasoningMode.confidence})`);

    // Check bounded autonomy
    const autonomyCheck = await this.hookIntegration.checkBoundedAutonomy(config.goal, '');
    if (!autonomyCheck.allowed) {
      return this.createFailure(`Task blocked: ${autonomyCheck.reason || 'Bounded autonomy check failed'}`);
    }
    if (autonomyCheck.requiresApproval) {
      this.warn(`⚠️ Task requires approval: ${autonomyCheck.reason || 'High risk or low confidence'}`);
    }

    // Phase 1: Pre-execution intelligence
    this.info('🧠 Phase 1: Pre-execution intelligence');

    // Run Tree of Thoughts for complex problems
    const totResult = await this.hookIntegration.runTreeOfThoughts(config.goal, '');
    if (totResult.branches.length > 0) {
      this.info(`Tree of Thoughts: ${totResult.branches.length} branches, selected: ${totResult.selected?.strategy || 'default'}`);
    }

    // Analyze parallel execution opportunities
    const parallelAnalysis = await this.hookIntegration.analyzeParallelExecution(config.goal, '');
    if (parallelAnalysis.canParallelize) {
      this.info(`Parallel execution: ${parallelAnalysis.groups.length} groups detected`);
    }

    // Coordinate multi-agent routing
    const multiAgentResult = await this.hookIntegration.coordinateMultiAgent(config.goal, '');
    this.info(`Multi-agent routing: ${multiAgentResult.agent} agent`);

    // Phase 2: Execution with monitoring
    this.info('⚡ Phase 2: Execution with monitoring');

    // Create executor with dependencies and callbacks
    const executor = new AutonomousExecutor(
      {
        memory: this.memory,
        contextManager: this.contextManager,
        conversationHistory: this.conversationHistory,
        taskType: this.currentTaskType
      },
      {
        onInfo: (msg) => this.info(msg),
        onWarn: (msg) => this.warn(msg),
        onSuccess: (msg) => this.success(msg),
        onSpinnerUpdate: (msg) => this.updateSpinner(msg),
        onCycleDisplay: (cycle, verbose) => this.displayCycle(cycle, verbose),
        onSkillInvocation: async (ctx, cfg, cycle, isGoalAchieved) => {
          // Update skill invoker state
          this.skillInvoker['state'].iterations = this.iterations;
          this.skillInvoker['state'].consecutiveSuccesses = this.consecutiveSuccesses;
          this.skillInvoker['state'].consecutiveFailures = this.consecutiveFailures;

          await this.skillInvoker.invoke(ctx, cfg, cycle, isGoalAchieved, this.contextManager, this.conversationHistory);

          // Update quality gate evaluation
          const qualityGate = await this.hookIntegration.evaluateQualityGate(cycle.observation || '', this.currentTaskType);
          if (!qualityGate.passed) {
            this.warn(`Quality gate failed: ${qualityGate.feedback}`);
          }

          // Sync state back
          this.lastCheckpointIteration = this.skillInvoker['state'].lastCheckpointIteration;
          this.lastCommitIteration = this.skillInvoker['state'].lastCommitIteration;
          this.lastCompactIteration = this.skillInvoker['state'].lastCompactIteration;
        },
        onContextCompaction: async (cfg) => await this.handleContextCompaction(cfg)
      }
    );

    // Run the autonomous loop
    const result = await executor.runLoop(agent, context, config);

    // Update iterations from executor state
    this.iterations = executor.getState().iterations;
    this.consecutiveSuccesses = executor.getState().consecutiveSuccesses;
    this.consecutiveFailures = executor.getState().consecutiveFailures;

    this.succeedSpinner(`Autonomous loop completed`);

    // Final checkpoint if goal achieved
    if (result.success) {
      // Update skill invoker state before final checkpoint
      this.skillInvoker['state'].iterations = this.iterations;
      await this.skillInvoker.performFinalCheckpoint(context, config.goal);
    }

    return result.success
      ? this.createSuccess(result.message, result.data)
      : this.createFailure(result.message || 'Autonomous loop failed');
  }

  /**
   * Handle context compaction based on Claude agent skills:
   * - Compact when context window is getting full
   * - Proactively compact at checkpoints or natural breakpoints
   * 
   * SLIDING AUTOCOMPACTION (40% threshold with task completion priority):
   * - When context exceeds 40%, mark pending compaction
   * - Allow current task to complete before triggering compaction
   * - Trigger /compact command only after task completes
   */
  private async handleContextCompaction(config: AutoConfig): Promise<void> {
    if (!this.contextManager || this.conversationHistory.length === 0) {
      return;
    }

    const health = this.contextManager.checkContextHealth(this.conversationHistory);

    if (health.status === 'warning') {
      this.warn(`Context at ${health.percentage.toFixed(1)}% - approaching limit`);
    }

    // Sliding threshold logic:
    // - If context >= 40% and no task is in progress, compact immediately
    // - If context >= 40% and task is in progress, mark as pending
    // - If pending compaction exists and task just completed, compact now
    if (health.shouldCompact && !this.taskInProgress) {
      // Task not in progress - compact immediately
      await this.performCompaction(config);
      this.pendingCompaction = false;
      this.contextExceededThreshold = false;
    } else if (health.shouldCompact && this.taskInProgress) {
      // Task in progress - mark as pending, don't interrupt
      if (!this.contextExceededThreshold) {
        this.info(`⏳ Context at ${health.percentage.toFixed(1)}% - pending compaction after task completes`);
        this.contextExceededThreshold = true;
        this.pendingCompaction = true;
      }
    } else if (this.pendingCompaction && !this.taskInProgress) {
      // Task just completed and compaction was pending - do it now
      this.info(`🔄 Task complete - executing pending compaction...`);
      await this.performCompaction(config);
      this.pendingCompaction = false;
      this.contextExceededThreshold = false;
    }
  }

  /**
   * Perform actual compaction operation
   */
  private async performCompaction(config: AutoConfig): Promise<void> {
    if (!this.contextManager) {
      return;
    }

    this.info(`🔄 Context compacting...`);
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


  /**
   * Perform /re command for reverse engineering tasks
   */
  private async performReCommand(context: CommandContext, goal: string): Promise<void> {
    this.info('🔬 Reverse engineering command triggered');

    try {
      // Determine target from goal
      const targetMatch = goal.match(/(?:analyze|extract|deobfuscate|understand)\s+(.+?)(?:\s|$)/i);
      const target = targetMatch ? targetMatch[1] : '.';
      
      const result = await this.reCommand.execute(context, {
        action: 'analyze',
        target: target
      });
      
      if (result.success) {
        this.success('Reverse engineering analysis complete');
      } else {
        this.warn('Reverse engineering analysis failed (continuing anyway)');
      }
      
      this.lastReIteration = this.iterations;
    } catch (error) {
      this.warn('Reverse engineering command failed (continuing anyway)');
    }
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


  /**
   * Debug orchestrator with regression detection
   */
  private async runDebugOrchestrator(
    task: string,
    context: string
  ): Promise<{ snapshot: string; recommendations: any[]; success: boolean }> {
    this.info('🐛 Running debug orchestrator...');

    try {
      // Step 1: Create before snapshot and search for similar bugs
      const smartDebugInput: SmartDebugInput = {
        bugDescription: task,
        bugType: this.currentTaskType,
        testCommand: 'echo "No tests configured"',
        context: context
      };

      const debugContext = await this.debugOrchestrator.smartDebug(smartDebugInput);

      this.info(`📸 Debug context created with snapshot: ${debugContext.beforeSnapshot}`);
      this.info(`🔍 Found ${debugContext.similarFixesCount} similar bug fixes in memory`);

      // Step 2: Display next steps
      if (debugContext.nextSteps.length > 0) {
        this.info('💡 Next steps:');
        debugContext.nextSteps.forEach((step, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${step}`));
        });
      }

      return {
        snapshot: debugContext.beforeSnapshot,
        recommendations: debugContext.nextSteps,
        success: true
      };
    } catch (error) {
      const err = error as Error;
      this.warn(`Debug orchestrator failed: ${err.message}`);

      return {
        snapshot: `error_${Date.now()}`,
        recommendations: [],
        success: false
      };
    }
  }

  /**
   * Verify fix using debug orchestrator (after applying fix)
   */
  private async verifyFixWithDebugOrchestrator(
    beforeSnapshotId: string,
    fixDescription: string
  ): Promise<{ success: boolean; regressionsDetected: boolean; message: string }> {
    this.info('🐛 Verifying fix with debug orchestrator...');

    try {
      const verifyInput: VerifyFixInput = {
        beforeSnapshotId,
        testCommand: 'echo "No tests configured"',
        fixDescription
      };

      const result = await this.debugOrchestrator.verifyFix(verifyInput);

      if (result.regressionsDetected) {
        this.warn('⚠️ Regressions detected - fix may have broken other functionality');
      } else {
        this.success('✓ Fix verified - no regressions detected');
      }

      if (result.actions.length > 0) {
        this.info('💡 Verification recommendations:');
        result.actions.forEach((action, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${action}`));
        });
      }

      return {
        success: result.status === 'success',
        regressionsDetected: result.regressionsDetected,
        message: result.message || 'Fix verification complete'
      };
    } catch (error) {
      const err = error as Error;
      this.warn(`Fix verification failed: ${err.message}`);

      return {
        success: false,
        regressionsDetected: false,
        message: err.message
      };
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
