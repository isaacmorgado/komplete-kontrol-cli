/**
 * VSCodeLLMProvider
 * VS Code LLM API provider for integration with VS Code's built-in LLM
 */

import type { ILLMProvider, LLMMessage, LLMOptions, LLMStreamChunk } from './ILLMProvider';
import type { ModelInfo } from './ModelConfig';

/**
 * VS Code LLM API interface
 */
interface VSCodeLLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface VSCodeLLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

/**
 * VS Code model specifications
 */
const VSCODE_MODELS: ModelInfo[] = [
  {
    id: 'vscode/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (VS Code)',
  },
  {
    id: 'vscode/gpt-4',
    name: 'GPT-4 (VS Code)',
  },
];

/**
 * VS Code LLM Provider Implementation
 */
export class VSCodeLLMProvider implements ILLMProvider {
  readonly name = 'vscode';
  private available: boolean = false;

  async isAvailable(): Promise<boolean> {
    // Check if running in VS Code extension context
    return typeof (globalThis as any).acquireVsCodeApi === 'function';
  }

  private async callVSCodeAPI(request: VSCodeLLMRequest): Promise<VSCodeLLMResponse> {
    const acquireVsCodeApi = (globalThis as any).acquireVsCodeApi;
    if (!acquireVsCodeApi) {
      throw new Error('VS Code LLM API not available');
    }

    const api = await acquireVsCodeApi();
    return api.complete(request);
  }

  async *streamCompletion(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncIterable<LLMStreamChunk> {
    try {
      const response = await this.callVSCodeAPI({
        messages,
        model: options?.model || 'vscode/claude-3.5-sonnet',
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      // VS Code API returns full response, so simulate streaming
      const chunkSize = 50;
      const chunks = Math.ceil(response.content.length / chunkSize);
      
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, response.content.length);
        const content = response.content.slice(start, end);
        
        yield {
          content,
          done: i === chunks - 1,
          tokens: response.tokensUsed,
        };
      }
    } catch (error) {
      throw new Error(`VS Code LLM API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  estimateCost(messages: LLMMessage[], model: string): number {
    // VS Code LLM API is free (costs handled by user's VS Code subscription)
    return 0;
  }

  async countTokens(messages: LLMMessage[]): Promise<number> {
    // VS Code API provides token count in response
    const response = await this.callVSCodeAPI({ messages });
    return response.tokensUsed;
  }

  getModels(): ModelInfo[] {
    return VSCODE_MODELS;
  }

  getModelInfo(modelId: string): ModelInfo | undefined {
    return VSCODE_MODELS.find(m => m.id === modelId);
  }
}

/**
 * Create VS Code LLM provider instance
 */
export function createVSCodeLLMProvider(): ILLMProvider {
  return new VSCodeLLMProvider();
}
