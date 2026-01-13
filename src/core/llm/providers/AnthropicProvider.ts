/**
 * Anthropic Provider - Official Claude API integration
 *
 * Provides access to Claude models via Anthropic SDK
 * Supports streaming, tool use, and vision capabilities
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  StreamHandler,
  ProviderCapabilities,
  ProviderConfig,
  ContentBlock,
  Message,
  TokenUsage,
  StreamEvent
} from '../types';

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements ILLMProvider {
  public readonly name = 'anthropic';
  public readonly capabilities: ProviderCapabilities = {
    streaming: true,
    vision: true,
    tools: true,
    systemPrompt: true,
    multiModal: true
  };

  private client: Anthropic;
  private defaultModel: string;

  constructor(config: ProviderConfig) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not set. Please export ANTHROPIC_API_KEY="sk-ant-..." and try again.'
      );
    }

    this.client = new Anthropic({ apiKey });
    this.defaultModel = config.defaultModel || 'claude-sonnet-4.5-20250929';
  }

  /**
   * Send a completion request
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;

    // Convert our format to Anthropic format
    const anthropicMessages = this.convertMessages(request.messages);

    const response = await this.client.messages.create({
      model,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      stop_sequences: request.stop_sequences,
      system: request.system,
      messages: anthropicMessages,
      tools: request.tools
    });

    return this.convertResponse(response);
  }

  /**
   * Send a streaming completion request
   */
  async streamComplete(request: LLMRequest, handler: StreamHandler): Promise<LLMResponse> {
    const model = request.model || this.defaultModel;

    // Convert our format to Anthropic format
    const anthropicMessages = this.convertMessages(request.messages);

    const stream = await this.client.messages.create({
      model,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      stop_sequences: request.stop_sequences,
      system: request.system,
      messages: anthropicMessages,
      tools: request.tools,
      stream: true
    });

    // Accumulate response
    const fullResponse: any = {
      id: '',
      model,
      role: 'assistant',
      content: [],
      stop_reason: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    };

    // Process stream events
    for await (const event of stream) {
      const streamEvent = this.convertStreamEvent(event);

      // Update accumulated response
      if (streamEvent.type === 'message_start') {
        fullResponse.id = streamEvent.message.id || '';
        fullResponse.usage = streamEvent.message.usage || fullResponse.usage;
      } else if (streamEvent.type === 'content_block_start') {
        fullResponse.content[streamEvent.index] = streamEvent.content_block;
      } else if (streamEvent.type === 'content_block_delta') {
        const block = fullResponse.content[streamEvent.index];
        if (block && block.type === 'text' && streamEvent.delta.type === 'text_delta') {
          block.text = (block.text || '') + (streamEvent.delta.text || '');
        }
      } else if (streamEvent.type === 'message_delta') {
        if (streamEvent.delta.stop_reason) {
          fullResponse.stop_reason = streamEvent.delta.stop_reason;
        }
        if (streamEvent.usage) {
          fullResponse.usage = { ...fullResponse.usage, ...streamEvent.usage };
        }
      }

      // Call handler
      await handler(streamEvent);
    }

    return fullResponse as LLMResponse;
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return [
      'claude-opus-4.5-20251101',
      'claude-sonnet-4.5-20250929',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  /**
   * Convert our message format to Anthropic format
   */
  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== 'system') // System prompts handled separately
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string'
          ? m.content
          : m.content.map(block => this.convertContentBlock(block))
      }));
  }

  /**
   * Convert content block to Anthropic format
   */
  private convertContentBlock(block: ContentBlock): any {
    if (block.type === 'text') {
      return { type: 'text', text: block.text };
    } else if (block.type === 'image') {
      return {
        type: 'image',
        source: block.source
      };
    } else if (block.type === 'tool_use') {
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input
      };
    } else if (block.type === 'tool_result') {
      return {
        type: 'tool_result',
        tool_use_id: block.tool_use_id,
        content: block.content,
        is_error: block.is_error
      };
    }
    return block;
  }

  /**
   * Convert Anthropic response to our format
   */
  private convertResponse(response: Anthropic.Message): LLMResponse {
    return {
      id: response.id,
      model: response.model,
      role: 'assistant',
      content: response.content.map(block => this.convertContentBlock(block as any)),
      stop_reason: response.stop_reason as any,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }

  /**
   * Convert Anthropic stream event to our format
   */
  private convertStreamEvent(event: any): StreamEvent {
    if (event.type === 'message_start') {
      return {
        type: 'message_start',
        message: {
          id: event.message.id,
          model: event.message.model,
          role: event.message.role,
          usage: event.message.usage
        }
      };
    } else if (event.type === 'content_block_start') {
      return {
        type: 'content_block_start',
        index: event.index,
        content_block: event.content_block
      };
    } else if (event.type === 'content_block_delta') {
      return {
        type: 'content_block_delta',
        index: event.index,
        delta: event.delta
      };
    } else if (event.type === 'content_block_stop') {
      return {
        type: 'content_block_stop',
        index: event.index
      };
    } else if (event.type === 'message_delta') {
      return {
        type: 'message_delta',
        delta: event.delta,
        usage: event.usage
      };
    } else if (event.type === 'message_stop') {
      return {
        type: 'message_stop'
      };
    } else if (event.type === 'error') {
      return {
        type: 'error',
        error: event.error
      };
    }

    // Unknown event type
    return {
      type: 'error',
      error: {
        type: 'unknown_event',
        message: `Unknown stream event: ${event.type}`
      }
    };
  }
}
