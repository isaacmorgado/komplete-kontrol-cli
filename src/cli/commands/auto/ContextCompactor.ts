/**
 * Context Compactor - Sliding context window management
 *
 * Implements task-aware context compaction:
 * - 40% threshold with task completion priority
 * - Marks pending when task in progress
 * - Executes when task completes
 * - Prevents mid-task interruption
 */

import type { AutoConfig } from '../../types';
import type { Message } from '../../../core/llm/types';
import type { ContextManager } from '../../../core/llm/ContextManager';
import type { MemoryManagerBridge } from '../../../core/llm/bridge/BashBridge';

export interface ContextCompactorDeps {
  contextManager?: ContextManager;
  memory: MemoryManagerBridge;
  logger: {
    info(message: string): void;
    warn(message: string): void;
    success(message: string): void;
  };
}

export interface ContextCompactorState {
  conversationHistory: Message[];
  iterations: number;
  lastCompactIteration: number;
  taskInProgress: boolean;
  pendingCompaction: boolean;
  contextExceededThreshold: boolean;
}

/**
 * Manages context window health and compaction
 */
export class ContextCompactor {
  private contextManager?: ContextManager;
  private memory: MemoryManagerBridge;
  private logger: ContextCompactorDeps['logger'];

  constructor(deps: ContextCompactorDeps) {
    this.contextManager = deps.contextManager;
    this.memory = deps.memory;
    this.logger = deps.logger;
  }

  /**
   * Handle context compaction with sliding threshold
   *
   * Sliding threshold logic:
   * - If context >= 40% and no task is in progress, compact immediately
   * - If context >= 40% and task is in progress, mark as pending
   * - If pending compaction exists and task just completed, compact now
   */
  async handleContextCompaction(
    config: AutoConfig,
    state: ContextCompactorState
  ): Promise<void> {
    if (!this.contextManager || state.conversationHistory.length === 0) {
      return;
    }

    const health = this.contextManager.checkContextHealth(state.conversationHistory);

    if (health.status === 'warning') {
      this.logger.warn(`Context at ${health.percentage.toFixed(1)}% - approaching limit`);
    }

    if (health.shouldCompact && !state.taskInProgress) {
      // Task not in progress - compact immediately
      await this.performCompaction(config, state);
      state.pendingCompaction = false;
      state.contextExceededThreshold = false;
    } else if (health.shouldCompact && state.taskInProgress) {
      // Task in progress - mark as pending, don't interrupt
      if (!state.contextExceededThreshold) {
        this.logger.info(`⏳ Context at ${health.percentage.toFixed(1)}% - pending compaction after task completes`);
        state.contextExceededThreshold = true;
        state.pendingCompaction = true;
      }
    } else if (state.pendingCompaction && !state.taskInProgress) {
      // Task just completed and compaction was pending - do it now
      this.logger.info(`🔄 Task complete - executing pending compaction...`);
      await this.performCompaction(config, state);
      state.pendingCompaction = false;
      state.contextExceededThreshold = false;
    }
  }

  /**
   * Perform actual compaction operation
   */
  private async performCompaction(
    config: AutoConfig,
    state: ContextCompactorState
  ): Promise<void> {
    if (!this.contextManager) {
      return;
    }

    this.logger.info(`🔄 Context compacting...`);
    const { messages, result } = await this.contextManager.compactMessages(
      state.conversationHistory,
      `Goal: ${config.goal}`
    );

    state.conversationHistory = messages;
    this.logger.success(
      `Compacted ${result.originalMessageCount} → ${result.compactedMessageCount} messages ` +
      `(${(result.compressionRatio * 100).toFixed(0)}% of original)`
    );

    // Record compaction to memory
    await this.memory.addContext(
      `Context compacted: ${result.compressionRatio.toFixed(2)}x compression`,
      6
    );

    state.lastCompactIteration = state.iterations;
  }
}
