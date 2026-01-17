/**
 * ILLMProvider Interface
 * Defines the contract for all LLM providers (Anthropic, OpenAI, etc.)
 */

import type { ModelInfo } from './ModelConfig';

export interface ILLMProvider {
  /**
   * Provider name (e.g., 'anthropic', 'openai', 'vscode')
   */
  readonly name: string;

  /**
   * Check if provider is available and configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Stream completion with token-by-token updates
   */
  streamCompletion(
    messages: LLMMessage[],
    options?: LLMOptions
  ): AsyncIterable<LLMStreamChunk>;

  /**
   * Get estimated cost for a request
   */
  estimateCost(messages: LLMMessage[], model: string): number;

  /**
   * Get token count for a message
   */
  countTokens(messages: LLMMessage[]): Promise<number>;

  /**
   * Get all available models from this provider
   */
  getModels(): ModelInfo[];

  /**
   * Get info for a specific model
   */
  getModelInfo(modelId: string): ModelInfo | undefined;
}

/**
 * LLM Message format
 */
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * LLM Options
 */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  topP?: number;
  topK?: number;
}

/**
 * LLM Stream Chunk
 */
export interface LLMStreamChunk {
  content: string;
  done: boolean;
  tokens?: number;
}
