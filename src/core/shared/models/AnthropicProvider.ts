/**
 * AnthropicProvider
 * Anthropic API provider for LLM completion
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider, LLMMessage, LLMOptions, LLMStreamChunk } from './ILLMProvider';
import type { ModelInfo } from './ModelConfig';

/**
 * Extended ModelInfo for Anthropic with cost information
 */
interface AnthropicModelInfo extends ModelInfo {
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
}

/**
 * Anthropic model specifications
 */
const ANTHROPIC_MODELS: AnthropicModelInfo[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputCostPer1k: 3.0,
    outputCostPer1k: 15.0,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputCostPer1k: 0.25,
    outputCostPer1k: 1.25,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputCostPer1k: 15.0,
    outputCostPer1k: 75.0,
  },
];

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    }
    return this.client;
  }

  async *streamCompletion(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncIterable<LLMStreamChunk> {
    const client = this.getClient();
    const model = options?.model || 'claude-3-5-sonnet-20241022';

    // Separate system messages from user/assistant messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    try {
      const stream = await client.messages.create({
        model: model,
        system: systemMessages.map(m => m.content).join('\n') || undefined,
        messages: conversationMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        stop_sequences: options?.stopSequences,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          // Type guard for text delta
          const delta = event.delta as { type: string; text?: string };
          const content = delta.text || '';
          yield {
            content,
            done: false,
          };
        } else if (event.type === 'message_stop') {
          yield {
            content: '',
            done: true,
          };
        }
      }
    } catch (error) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  estimateCost(messages: LLMMessage[], model: string): number {
    const modelInfo = ANTHROPIC_MODELS.find(m => m.id === model);
    if (!modelInfo) return 0;

    // Estimate tokens (rough approximation)
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const inputTokens = Math.ceil(totalChars / 4);

    const inputCost = (inputTokens / 1000) * modelInfo.inputCostPer1k;
    const outputCost = (modelInfo.maxOutputTokens / 1000) * modelInfo.outputCostPer1k;

    return inputCost + outputCost;
  }

  async countTokens(messages: LLMMessage[]): Promise<number> {
    // Anthropic doesn't provide token counting API
    // Use rough character-based estimation
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  getModels(): ModelInfo[] {
    return ANTHROPIC_MODELS;
  }

  getModelInfo(modelId: string): ModelInfo | undefined {
    return ANTHROPIC_MODELS.find(m => m.id === modelId);
  }
}

/**
 * Create Anthropic provider instance
 */
export function createAnthropicProvider(apiKey: string): ILLMProvider {
  return new AnthropicProvider(apiKey);
}
