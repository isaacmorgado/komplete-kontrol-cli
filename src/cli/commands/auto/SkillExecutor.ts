/**
 * Skill Executor - Executes autonomous skill commands
 *
 * Handles execution of /checkpoint, /commit, /compact, /re commands
 * Based on Claude agent skill invocation patterns
 */

import type { CommandContext } from '../../types';
import type { AutoConfig } from '../../types';
import type { ReflexionCycle } from '../../../core/agents/reflexion';
import type { Message } from '../../../core/llm/types';
import { CheckpointCommand } from '../CheckpointCommand';
import { CommitCommand } from '../CommitCommand';
import { CompactCommand } from '../CompactCommand';
import { ReCommand } from '../ReCommand';
import { ContextManager } from '../../../core/llm/ContextManager';

export interface SkillExecutorDeps {
  checkpointCommand: CheckpointCommand;
  commitCommand: CommitCommand;
  compactCommand: CompactCommand;
  reCommand: ReCommand;
  contextManager?: ContextManager;
  logger: {
    info(message: string): void;
    warn(message: string): void;
    success(message: string): void;
  };
}

export interface SkillExecutorState {
  iterations: number;
  lastCheckpointIteration: number;
  lastCommitIteration: number;
  lastCompactIteration: number;
  lastReIteration: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  conversationHistory: Message[];
}

/**
 * Executes autonomous skills based on triggers and thresholds
 */
export class SkillExecutor {
  private checkpointCommand: CheckpointCommand;
  private commitCommand: CommitCommand;
  private compactCommand: CompactCommand;
  private reCommand: ReCommand;
  private contextManager?: ContextManager;
  private logger: SkillExecutorDeps['logger'];

  constructor(deps: SkillExecutorDeps) {
    this.checkpointCommand = deps.checkpointCommand;
    this.commitCommand = deps.commitCommand;
    this.compactCommand = deps.compactCommand;
    this.reCommand = deps.reCommand;
    this.contextManager = deps.contextManager;
    this.logger = deps.logger;
  }

  /**
   * Invoke skills based on current state and triggers
   *
   * Follows Claude agent skill patterns:
   * - /checkpoint: Before major edits, at natural breakpoints, after failures
   * - /commit: For permanent milestones when work is stable
   * - /compact: When context full, at checkpoints or natural breakpoints
   * - /re: For reverse engineering tasks
   */
  async invokeSkills(
    context: CommandContext,
    config: AutoConfig,
    state: SkillExecutorState,
    cycle: ReflexionCycle,
    isGoalAchieved: boolean,
    currentTaskType: string
  ): Promise<void> {
    const checkpointThreshold = config.checkpointThreshold || 10;
    const commitThreshold = 20; // Commit less frequently than checkpoints

    // /checkpoint: Trigger at threshold intervals, before experimental changes, or after failures
    const shouldCheckpoint =
      (state.iterations % checkpointThreshold === 0) || // Regular checkpoints
      (state.consecutiveFailures >= 3) || // After failures for recovery
      (state.iterations - state.lastCheckpointIteration >= checkpointThreshold && state.consecutiveSuccesses >= 5); // After progress

    if (shouldCheckpoint) {
      await this.performCheckpoint(context, config.goal, state);

      // After checkpoint, also consider compacting (Claude best practice)
      if (this.contextManager && state.conversationHistory.length > 0) {
        const health = this.contextManager.checkContextHealth(state.conversationHistory);
        if (health.status === 'warning' || health.status === 'critical') {
          await this.performCompact(context, state, 'conservative');
        }
      }
    }

    // /commit: Trigger for milestones when work is stable
    const shouldCommit =
      (state.iterations % commitThreshold === 0 && state.consecutiveSuccesses >= 10) || // Milestone after progress
      (isGoalAchieved && state.iterations - state.lastCommitIteration >= 5); // Final milestone

    if (shouldCommit) {
      await this.performCommit(context, config.goal, state);
    }

    // /re: Trigger for reverse engineering tasks
    const shouldInvokeRe =
      currentTaskType === 'reverse-engineering' &&
      (state.iterations % 15 === 0 || state.iterations - state.lastReIteration >= 15);

    if (shouldInvokeRe) {
      await this.performReCommand(context, config.goal, state);
    }
  }

  /**
   * Perform checkpoint (session-level recovery)
   * Use before major edits, at natural breakpoints, or when trying experimental changes
   */
  async performCheckpoint(context: CommandContext, goal: string, state: SkillExecutorState): Promise<void> {
    this.logger.info('📸 Auto-checkpoint triggered');

    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Auto checkpoint at iteration ${state.iterations}: ${goal}`
      });

      if (result.success) {
        this.logger.success('Checkpoint saved - session can be resumed from this point');
      } else {
        this.logger.warn('Checkpoint failed (continuing anyway)');
      }

      state.lastCheckpointIteration = state.iterations;
    } catch (error) {
      this.logger.warn('Checkpoint failed (continuing anyway)');
    }
  }

  /**
   * Perform commit (permanent version history)
   * Use for milestones, when work is stable and ready to share
   */
  async performCommit(context: CommandContext, goal: string, state: SkillExecutorState): Promise<void> {
    this.logger.info('💾 Auto-commit triggered (milestone)');

    try {
      const result = await this.commitCommand.execute(context, {
        message: `Milestone: ${goal} - iteration ${state.iterations}`,
        push: false // Don't auto-push by default
      });

      if (result.success) {
        this.logger.success('Commit created - milestone saved to version history');
      } else {
        this.logger.warn('Commit failed (continuing anyway)');
      }

      state.lastCommitIteration = state.iterations;
    } catch (error) {
      this.logger.warn('Commit failed (continuing anyway)');
    }
  }

  /**
   * Perform compact (context optimization)
   * Use when context window is getting full, proactively at checkpoints or natural breakpoints
   */
  async performCompact(context: CommandContext, state: SkillExecutorState, level: 'aggressive' | 'conservative' = 'conservative'): Promise<void> {
    this.logger.info('🔄 Auto-compact triggered');

    try {
      const result = await this.compactCommand.execute(context, { level });

      if (result.success) {
        this.logger.success('Memory compacted - context optimized');
      } else {
        this.logger.warn('Compact failed (continuing anyway)');
      }

      state.lastCompactIteration = state.iterations;
    } catch (error) {
      this.logger.warn('Compact failed (continuing anyway)');
    }
  }

  /**
   * Perform final checkpoint before completion
   */
  async performFinalCheckpoint(context: CommandContext, goal: string, iterations: number): Promise<void> {
    this.logger.info('📸 Final checkpoint before completion');

    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Goal achieved: ${goal} after ${iterations} iterations`
      });

      if (result.success) {
        this.logger.success('Final checkpoint saved');
      } else {
        this.logger.warn('Final checkpoint failed');
      }
    } catch (error) {
      this.logger.warn('Final checkpoint failed');
    }
  }

  /**
   * Perform /re command for reverse engineering tasks
   */
  async performReCommand(context: CommandContext, goal: string, state: SkillExecutorState): Promise<void> {
    this.logger.info('🔬 Reverse engineering command triggered');

    try {
      // Determine target from goal
      const targetMatch = goal.match(/(?:analyze|extract|deobfuscate|understand)\s+(.+?)(?:\s|$)/i);
      const target = targetMatch ? targetMatch[1] : '.';

      const result = await this.reCommand.execute(context, {
        action: 'analyze',
        target: target
      });

      if (result.success) {
        this.logger.success('Reverse engineering analysis complete');
      } else {
        this.logger.warn('Reverse engineering failed');
      }

      state.lastReIteration = state.iterations;
    } catch (error) {
      this.logger.warn('Reverse engineering failed');
    }
  }
}
