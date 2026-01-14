/**
 * SkillInvoker - Handles autonomous skill invocation
 *
 * Based on Claude agent skills logic:
 * - /checkpoint: Before major edits, at natural breakpoints, or when trying experimental changes
 * - /commit: For permanent version history and collaboration, when work is stable and ready to share
 * - /compact: When context window is getting full, proactively at checkpoints or natural breakpoints
 * - /debug-orchestrator: Run debug orchestrator for regression detection
 */

import type { CommandContext, AutoConfig } from '../../types';
import type { ReflexionCycle } from '../../../core/agents/reflexion';
import type { Message } from '../../../core/llm/types';
import { CheckpointCommand } from '../CheckpointCommand';
import { CommitCommand } from '../CommitCommand';
import { CompactCommand } from '../CompactCommand';
import { ContextManager } from '../../../core/llm/ContextManager';

export interface SkillInvokerState {
  iterations: number;
  lastCheckpointIteration: number;
  lastCommitIteration: number;
  lastCompactIteration: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
}

export interface SkillInvokerCallbacks {
  onInfo: (message: string) => void;
  onWarn: (message: string) => void;
  onSuccess: (message: string) => void;
}

export class SkillInvoker {
  private checkpointCommand: CheckpointCommand;
  private commitCommand: CommitCommand;
  private compactCommand: CompactCommand;

  constructor(
    private state: SkillInvokerState,
    private callbacks: SkillInvokerCallbacks
  ) {
    this.checkpointCommand = new CheckpointCommand();
    this.commitCommand = new CommitCommand();
    this.compactCommand = new CompactCommand();
  }

  /**
   * Invoke skills based on Claude agent skills logic
   */
  async invoke(
    context: CommandContext,
    config: AutoConfig,
    cycle: ReflexionCycle,
    isGoalAchieved: boolean,
    contextManager?: ContextManager,
    conversationHistory?: Message[]
  ): Promise<void> {
    const checkpointThreshold = config.checkpointThreshold || 10;
    const commitThreshold = 20;

    // /checkpoint: Trigger at threshold intervals, before experimental changes, or after failures
    const shouldCheckpoint =
      (this.state.iterations % checkpointThreshold === 0) ||
      (this.state.consecutiveFailures >= 3) ||
      (this.state.iterations - this.state.lastCheckpointIteration >= checkpointThreshold && this.state.consecutiveSuccesses >= 5);

    if (shouldCheckpoint) {
      await this.performCheckpoint(context, config.goal);

      // After checkpoint, also consider compacting
      if (contextManager && conversationHistory && conversationHistory.length > 0) {
        const health = contextManager.checkContextHealth(conversationHistory);
        if (health.status === 'warning' || health.status === 'critical') {
          await this.performCompact(context, 'conservative');
        }
      }
    }

    // /commit: Trigger for milestones when work is stable
    const shouldCommit =
      (this.state.iterations % commitThreshold === 0 && this.state.consecutiveSuccesses >= 10) ||
      (isGoalAchieved && this.state.iterations - this.state.lastCommitIteration >= 5);

    if (shouldCommit) {
      await this.performCommit(context, config.goal);
    }
  }

  /**
   * Perform checkpoint (session-level recovery)
   */
  private async performCheckpoint(context: CommandContext, goal: string): Promise<void> {
    this.callbacks.onInfo('📸 Auto-checkpoint triggered');

    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Auto checkpoint at iteration ${this.state.iterations}: ${goal}`
      });

      if (result.success) {
        this.callbacks.onSuccess('Checkpoint saved - session can be resumed from this point');
      } else {
        this.callbacks.onWarn('Checkpoint failed (continuing anyway)');
      }

      this.state.lastCheckpointIteration = this.state.iterations;
    } catch (error) {
      this.callbacks.onWarn('Checkpoint failed (continuing anyway)');
    }
  }

  /**
   * Perform commit (permanent version history)
   */
  private async performCommit(context: CommandContext, goal: string): Promise<void> {
    this.callbacks.onInfo('💾 Auto-commit triggered (milestone)');

    try {
      const result = await this.commitCommand.execute(context, {
        message: `Milestone: ${goal} - iteration ${this.state.iterations}`,
        push: false
      });

      if (result.success) {
        this.callbacks.onSuccess('Commit created - milestone saved to version history');
      } else {
        this.callbacks.onWarn('Commit failed (continuing anyway)');
      }

      this.state.lastCommitIteration = this.state.iterations;
    } catch (error) {
      this.callbacks.onWarn('Commit failed (continuing anyway)');
    }
  }

  /**
   * Perform compact (context optimization)
   */
  private async performCompact(context: CommandContext, level: 'aggressive' | 'conservative' = 'conservative'): Promise<void> {
    this.callbacks.onInfo('🔄 Auto-compact triggered');

    try {
      const result = await this.compactCommand.execute(context, { level });

      if (result.success) {
        this.callbacks.onSuccess('Memory compacted - context optimized');
      } else {
        this.callbacks.onWarn('Compact failed (continuing anyway)');
      }

      this.state.lastCompactIteration = this.state.iterations;
    } catch (error) {
      this.callbacks.onWarn('Compact failed (continuing anyway)');
    }
  }

  /**
   * Perform final checkpoint before completion
   */
  async performFinalCheckpoint(context: CommandContext, goal: string): Promise<void> {
    this.callbacks.onInfo('📸 Final checkpoint before completion');

    try {
      const result = await this.checkpointCommand.execute(context, {
        summary: `Goal achieved: ${goal} after ${this.state.iterations} iterations`
      });

      if (result.success) {
        this.callbacks.onSuccess('Final checkpoint saved');
      } else {
        this.callbacks.onWarn('Final checkpoint failed');
      }
    } catch (error) {
      this.callbacks.onWarn('Final checkpoint failed');
    }
  }
}
