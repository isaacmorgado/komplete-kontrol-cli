/**
 * Context Manager - Smart Context Window Management
 *
 * Implements automatic context compaction when approaching model limits
 * Based on clauded project's context compaction engine
 */

import type { Message } from './types';
import type { LLMRouter } from './Router';

export interface CompactionStrategy {
  name: 'aggressive' | 'balanced' | 'conservative';
  keepRecent: number;  // Number of recent messages to keep unmodified
  targetRatio: number;  // Target compression ratio (0.0-1.0)
}

export interface CompactionResult {
  originalMessageCount: number;
  compactedMessageCount: number;
  originalTokens: number;
  compactedTokens: number;
  compressionRatio: number;
}

export interface ContextWindowConfig {
  maxTokens: number;
  warningThreshold: number;  // Percentage (0-100) when to warn
  compactionThreshold: number;  // Percentage (0-100) when to compact
  strategy: CompactionStrategy;
}

/**
 * Default compaction strategies
 */
export const COMPACTION_STRATEGIES: Record<string, CompactionStrategy> = {
  aggressive: {
    name: 'aggressive',
    keepRecent: 3,
    targetRatio: 0.3  // Compress to 30% of original
  },
  balanced: {
    name: 'balanced',
    keepRecent: 5,
    targetRatio: 0.5  // Compress to 50% of original
  },
  conservative: {
    name: 'conservative',
    keepRecent: 8,
    targetRatio: 0.7  // Compress to 70% of original
  }
};

/**
 * Context Manager for smart context window management
 */
export class ContextManager {
  private config: ContextWindowConfig;
  private router?: LLMRouter;

  constructor(
    config: Partial<ContextWindowConfig> = {},
    router?: LLMRouter
  ) {
    this.config = {
      maxTokens: config.maxTokens || 128000,  // Default to 128K (Claude Sonnet)
      warningThreshold: config.warningThreshold || 70,
      compactionThreshold: config.compactionThreshold || 80,
      strategy: config.strategy || COMPACTION_STRATEGIES.balanced
    };
    this.router = router;
  }

  /**
   * Estimate token count for messages (rough approximation)
   * More accurate counting would require actual tokenizer
   */
  estimateTokens(messages: Message[]): number {
    let tokens = 0;

    for (const message of messages) {
      // Estimate: ~4 characters per token (rough approximation)
      if (typeof message.content === 'string') {
        tokens += Math.ceil(message.content.length / 4);
      } else {
        // Content blocks - sum all text content
        for (const block of message.content) {
          if (block.type === 'text') {
            tokens += Math.ceil(block.text.length / 4);
          } else if (block.type === 'tool_result') {
            tokens += Math.ceil(block.content.length / 4);
          }
        }
      }

      // Add overhead for role and structure (~10 tokens per message)
      tokens += 10;
    }

    return tokens;
  }

  /**
   * Check if context is approaching limits
   */
  checkContextHealth(messages: Message[]): {
    status: 'healthy' | 'warning' | 'critical';
    currentTokens: number;
    percentage: number;
    shouldCompact: boolean;
    recommendation: string;
  } {
    const currentTokens = this.estimateTokens(messages);
    const percentage = (currentTokens / this.config.maxTokens) * 100;

    if (percentage >= this.config.compactionThreshold) {
      return {
        status: 'critical',
        currentTokens,
        percentage,
        shouldCompact: true,
        recommendation: `Context at ${percentage.toFixed(1)}% - compaction required`
      };
    } else if (percentage >= this.config.warningThreshold) {
      return {
        status: 'warning',
        currentTokens,
        percentage,
        shouldCompact: false,
        recommendation: `Context at ${percentage.toFixed(1)}% - approaching limit`
      };
    } else {
      return {
        status: 'healthy',
        currentTokens,
        percentage,
        shouldCompact: false,
        recommendation: `Context healthy (${percentage.toFixed(1)}%)`
      };
    }
  }

  /**
   * Compact conversation history using LLM summarization
   */
  async compactMessages(
    messages: Message[],
    systemPrompt?: string
  ): Promise<{ messages: Message[]; result: CompactionResult }> {
    if (!this.router) {
      throw new Error('LLM Router required for compaction');
    }

    const strategy = this.config.strategy;
    const originalTokens = this.estimateTokens(messages);

    // Keep recent messages unchanged
    const recentMessages = messages.slice(-strategy.keepRecent);
    const oldMessages = messages.slice(0, -strategy.keepRecent);

    if (oldMessages.length === 0) {
      // Nothing to compact
      return {
        messages,
        result: {
          originalMessageCount: messages.length,
          compactedMessageCount: messages.length,
          originalTokens,
          compactedTokens: originalTokens,
          compressionRatio: 1.0
        }
      };
    }

    // Create summary of old messages
    const summaryPrompt = this.buildSummaryPrompt(oldMessages, systemPrompt);

    try {
      const response = await this.router.route(
        {
          messages: [{ role: 'user', content: summaryPrompt }],
          system: 'You are a conversation summarizer. Create concise, information-dense summaries.',
          max_tokens: Math.ceil(originalTokens * strategy.targetRatio)
        },
        {
          taskType: 'general',
          priority: 'speed',  // Use fast model for summarization
          requiresUnrestricted: false
        }
      );

      // Extract summary text
      const firstContent = response.content[0];
      const summary = firstContent.type === 'text' ? firstContent.text : 'Unable to create summary';

      // Create compacted message set
      const compactedMessages: Message[] = [
        {
          role: 'user',
          content: `[Previous conversation summary]\n\n${summary}\n\n[End of summary. Recent messages follow:]`
        },
        ...recentMessages
      ];

      const compactedTokens = this.estimateTokens(compactedMessages);

      return {
        messages: compactedMessages,
        result: {
          originalMessageCount: messages.length,
          compactedMessageCount: compactedMessages.length,
          originalTokens,
          compactedTokens,
          compressionRatio: compactedTokens / originalTokens
        }
      };
    } catch (error) {
      // Fallback: simple truncation if LLM summarization fails
      console.warn('[ContextManager] Summarization failed, using truncation fallback');
      return {
        messages: recentMessages,
        result: {
          originalMessageCount: messages.length,
          compactedMessageCount: recentMessages.length,
          originalTokens,
          compactedTokens: this.estimateTokens(recentMessages),
          compressionRatio: recentMessages.length / messages.length
        }
      };
    }
  }

  /**
   * Build prompt for LLM summarization
   */
  private buildSummaryPrompt(messages: Message[], systemPrompt?: string): string {
    const conversationText = messages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const content = typeof msg.content === 'string'
          ? msg.content
          : msg.content.map(block => {
              if (block.type === 'text') return block.text;
              if (block.type === 'tool_result') return `[Tool result: ${block.content.substring(0, 100)}...]`;
              return '';
            }).join('\n');

        return `${role}: ${content}`;
      })
      .join('\n\n');

    return `
Summarize the following conversation concisely while preserving all critical information:
- Key decisions and conclusions
- Important facts and context
- Action items and results
- Technical details and error information

${systemPrompt ? `System context: ${systemPrompt}\n` : ''}

Conversation:
${conversationText}

Provide a dense, information-rich summary that captures the essential content in as few words as possible:
`.trim();
  }

  /**
   * Auto-compact if needed (checks health and compacts if critical)
   */
  async autoCompact(
    messages: Message[],
    systemPrompt?: string
  ): Promise<{ messages: Message[]; wasCompacted: boolean; result?: CompactionResult }> {
    const health = this.checkContextHealth(messages);

    if (health.shouldCompact) {
      const { messages: compactedMessages, result } = await this.compactMessages(messages, systemPrompt);
      return {
        messages: compactedMessages,
        wasCompacted: true,
        result
      };
    }

    return {
      messages,
      wasCompacted: false
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextWindowConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextWindowConfig {
    return { ...this.config };
  }
}
