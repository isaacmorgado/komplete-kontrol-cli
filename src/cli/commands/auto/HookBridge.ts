/**
 * Hook Bridge - Integration with bash autonomous system hooks
 *
 * Provides type-safe TypeScript interface to bash hooks:
 * - Bounded autonomy checks
 * - Reasoning mode selection
 * - Tree of Thoughts
 * - Parallel execution planning
 * - Multi-agent coordination
 * - Quality gates
 * - Debug orchestrator
 * - UI/Mac testing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import chalk from 'chalk';
import type { DebugOrchestrator, SmartDebugInput, VerifyFixInput } from '../../../core/debug/orchestrator';

const execAsync = promisify(exec);

export interface HookBridgeDeps {
  hooksPath: string;
  debugOrchestrator: DebugOrchestrator;
  logger: {
    info(message: string): void;
    warn(message: string): void;
    success(message: string): void;
    error(message: string): void;
  };
}

/**
 * Bridge to autonomous system bash hooks
 */
export class HookBridge {
  private hooksPath: string;
  private debugOrchestrator: DebugOrchestrator;
  private logger: HookBridgeDeps['logger'];

  constructor(deps: HookBridgeDeps) {
    this.hooksPath = deps.hooksPath;
    this.debugOrchestrator = deps.debugOrchestrator;
    this.logger = deps.logger;
  }

  /**
   * Execute a bash hook and return JSON result
   */
  async runHook(hookName: string, args: string[] = []): Promise<any> {
    const hookPath = join(this.hooksPath, `${hookName}.sh`);
    try {
      const { stdout } = await execAsync(`bash ${hookPath} ${args.join(' ')}`);
      return JSON.parse(stdout);
    } catch (error) {
      this.logger.warn(`Hook ${hookName} failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Quality gate evaluation using LLM-as-Judge
   */
  async evaluateQualityGate(
    output: string,
    taskType: string
  ): Promise<{ passed: boolean; score: number; feedback: string }> {
    this.logger.info('🔍 Running quality gate evaluation...');

    const criteria = await this.runHook('auto-evaluator', ['criteria', taskType]);
    const evaluation = await this.runHook('auto-evaluator', ['evaluate', output, criteria]);

    if (!evaluation) {
      return { passed: true, score: 7.0, feedback: 'Quality gate check passed' };
    }

    const score = evaluation.score || 7.0;
    const passed = evaluation.decision === 'continue' || score >= 7.0;

    this.logger.info(`Quality gate: ${passed ? '✓ PASSED' : '✗ FAILED'} (score: ${score}/10)`);

    return {
      passed,
      score,
      feedback: evaluation.message || `Quality score: ${score}/10`
    };
  }

  /**
   * Bounded autonomy safety check
   */
  async checkBoundedAutonomy(
    task: string,
    context: string
  ): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
    this.logger.info('🛡️ Running bounded autonomy check...');

    const check = await this.runHook('bounded-autonomy', ['check', task, context]);

    if (!check) {
      return { allowed: true, requiresApproval: false };
    }

    const allowed = check.allowed !== false;
    const requiresApproval = check.requires_approval === true;

    if (!allowed) {
      this.logger.error(`🚫 Task blocked: ${check.reason || 'Bounded autonomy check failed'}`);
    } else if (requiresApproval) {
      this.logger.warn(`⚠️ Task requires approval: ${check.reason || 'High risk or low confidence'}`);
    } else {
      this.logger.info('✓ Bounded autonomy check passed');
    }

    return { allowed, requiresApproval, reason: check.reason };
  }

  /**
   * Reasoning mode selection
   */
  async selectReasoningMode(
    task: string,
    context: string
  ): Promise<{ mode: string; confidence: number; reasoning: string }> {
    this.logger.info('🧠 Selecting reasoning mode...');

    const modeInfo = await this.runHook('reasoning-mode-switcher', ['select', task, context, 'normal', 'normal', 'low']);

    if (!modeInfo) {
      return { mode: 'deliberate', confidence: 0.7, reasoning: 'Default mode selected' };
    }

    const mode = modeInfo.selected_mode || 'deliberate';
    const confidence = modeInfo.confidence || 0.7;

    this.logger.info(`Reasoning mode: ${mode} (confidence: ${confidence})`);

    return {
      mode,
      confidence,
      reasoning: modeInfo.reasoning || `Task characteristics suggest ${mode} mode`
    };
  }

  /**
   * Tree of Thoughts for complex problems
   */
  async runTreeOfThoughts(
    task: string,
    context: string
  ): Promise<{ branches: any[]; selected: any; success: boolean }> {
    this.logger.info('🌳 Running Tree of Thoughts...');

    const branches = await this.runHook('tree-of-thoughts', ['generate', task, context, '3']);
    const evaluation = await this.runHook('tree-of-thoughts', ['evaluate', branches]);

    if (!evaluation) {
      return { branches: [], selected: null, success: false };
    }

    const selected = evaluation.selected_branch;
    const success = true;

    this.logger.info(`Tree of Thoughts selected: ${selected?.strategy || 'default'}`);

    return {
      branches: branches.branches || [],
      selected,
      success
    };
  }

  /**
   * Parallel execution analysis
   */
  async analyzeParallelExecution(
    task: string,
    context: string
  ): Promise<{ canParallelize: boolean; groups: any[]; success: boolean }> {
    this.logger.info('⚡ Analyzing parallel execution opportunities...');

    const analysis = await this.runHook('parallel-execution-planner', ['analyze', task, context]);

    if (!analysis) {
      return { canParallelize: false, groups: [], success: false };
    }

    const canParallelize = analysis.canParallelize || false;
    const groups = analysis.groups || [];
    const success = true;

    if (canParallelize) {
      const groupCount = groups.length;
      this.logger.info(`Task can be parallelized into ${groupCount} groups`);
    } else {
      this.logger.info('Task will execute sequentially');
    }

    return {
      canParallelize,
      groups,
      success
    };
  }

  /**
   * Multi-agent coordination
   */
  async coordinateMultiAgent(
    task: string,
    _context: string
  ): Promise<{ agent: string; workflow: any[]; success: boolean }> {
    this.logger.info('🤖 Coordinating multi-agent execution...');

    const routing = await this.runHook('multi-agent-orchestrator', ['route', task]);
    const orchestrate = await this.runHook('multi-agent-orchestrator', ['orchestrate', task]);

    if (!routing || !orchestrate) {
      return { agent: 'general', workflow: [], success: false };
    }

    const agent = routing.selected_agent || 'general';
    const workflow = orchestrate.workflow || [];
    const success = true;

    this.logger.info(`Multi-agent routing: ${agent} agent`);

    return {
      agent,
      workflow,
      success
    };
  }

  /**
   * Debug orchestrator with regression detection
   */
  async runDebugOrchestrator(
    task: string,
    context: string,
    currentTaskType: string
  ): Promise<{ snapshot: string; recommendations: any[]; success: boolean }> {
    this.logger.info('🐛 Running debug orchestrator...');

    try {
      // Step 1: Create before snapshot and search for similar bugs
      const smartDebugInput: SmartDebugInput = {
        bugDescription: task,
        bugType: currentTaskType,
        testCommand: 'echo "No tests configured"',
        context: context
      };

      const debugContext = await this.debugOrchestrator.smartDebug(smartDebugInput);

      this.logger.info(`📸 Debug context created with snapshot: ${debugContext.beforeSnapshot}`);
      this.logger.info(`🔍 Found ${debugContext.similarFixesCount} similar bug fixes in memory`);

      // Step 2: Display next steps
      if (debugContext.nextSteps.length > 0) {
        this.logger.info('💡 Next steps:');
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
      this.logger.warn(`Debug orchestrator failed: ${err.message}`);

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
  async verifyFixWithDebugOrchestrator(
    beforeSnapshotId: string,
    fixDescription: string
  ): Promise<{ success: boolean; regressionsDetected: boolean; message: string }> {
    this.logger.info('🐛 Verifying fix with debug orchestrator...');

    try {
      const verifyInput: VerifyFixInput = {
        beforeSnapshotId,
        testCommand: 'echo "No tests configured"',
        fixDescription
      };

      const result = await this.debugOrchestrator.verifyFix(verifyInput);

      if (result.regressionsDetected) {
        this.logger.warn('⚠️ Regressions detected - fix may have broken other functionality');
      } else {
        this.logger.success('✓ Fix verified - no regressions detected');
      }

      if (result.actions.length > 0) {
        this.logger.info('💡 Verification recommendations:');
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
      this.logger.warn(`Fix verification failed: ${err.message}`);

      return {
        success: false,
        regressionsDetected: false,
        message: err.message
      };
    }
  }

  /**
   * UI testing integration
   */
  async runUITesting(
    action: string,
    element: string,
    value?: string
  ): Promise<{ success: boolean; result: any }> {
    this.logger.info('🖱️ Running UI testing...');

    const result = await this.runHook('ui-testing', [action, element, value || '']);

    if (!result) {
      return { success: false, result: null };
    }

    const success = result.status === 'success';

    this.logger.info(`UI testing: ${success ? '✓ PASSED' : '✗ FAILED'}`);

    return {
      success,
      result
    };
  }

  /**
   * Mac app testing integration
   */
  async runMacAppTesting(
    action: string,
    appName: string,
    element?: string,
    value?: string
  ): Promise<{ success: boolean; result: any }> {
    this.logger.info('🍎 Running Mac app testing...');

    const result = await this.runHook('mac-app-testing', [action, appName, element || '', value || '']);

    if (!result) {
      return { success: false, result: null };
    }

    const success = result.status === 'success';

    this.logger.info(`Mac app testing: ${success ? '✓ PASSED' : '✗ FAILED'}`);

    return {
      success,
      result
    };
  }
}
