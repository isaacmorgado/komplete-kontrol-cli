/**
 * LLM Integration Layer - Core Types
 *
 * Provides unified interface for multiple LLM providers
 * Supports streaming, tool use, and multi-modal capabilities
 */

/**
 * Message role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Content block types
 */
export type ContentBlock = TextContent | ImageContent | ToolUseContent | ToolResultContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'url' | 'base64';
    url?: string;
    data?: string;
    media_type?: string;
  };
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Message in conversation
 */
export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

/**
 * Tool definition for function calling
 */
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * LLM request parameters
 */
export interface LLMRequest {
  messages: Message[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  system?: string;
  tools?: Tool[];
}

/**
 * Token usage information
 */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens?: number;
}

/**
 * LLM response
 */
export interface LLMResponse {
  id: string;
  model: string;
  role: MessageRole;
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  usage: TokenUsage;
}

/**
 * Streaming event types
 */
export type StreamEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ErrorEvent;

export interface MessageStartEvent {
  type: 'message_start';
  message: Partial<LLMResponse>;
}

export interface ContentBlockStartEvent {
  type: 'content_block_start';
  index: number;
  content_block: ContentBlock;
}

export interface ContentBlockDeltaEvent {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
}

export interface ContentBlockStopEvent {
  type: 'content_block_stop';
  index: number;
}

export interface MessageDeltaEvent {
  type: 'message_delta';
  delta: {
    stop_reason?: string;
    stop_sequence?: string;
  };
  usage?: Partial<TokenUsage>;
}

export interface MessageStopEvent {
  type: 'message_stop';
}

export interface ErrorEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/**
 * Stream handler callback
 */
export type StreamHandler = (event: StreamEvent) => void | Promise<void>;

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  streaming: boolean;
  vision: boolean;
  tools: boolean;
  systemPrompt: boolean;
  multiModal: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
}

/**
 * LLM Provider interface
 */
export interface ILLMProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Send a completion request
   */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Send a streaming completion request
   */
  streamComplete(request: LLMRequest, handler: StreamHandler): Promise<LLMResponse>;

  /**
   * List available models
   */
  listModels(): Promise<string[]>;
}

/**
 * Task type for routing decisions
 */
export type TaskType =
  | 'general'
  | 'coding'
  | 'security'
  | 'reasoning'
  | 'creative'
  | 'writing'
  | 'reverse-engineering'
  | 'chinese'
  | 'debugging';

/**
 * Routing priority
 */
export type RoutingPriority = 'speed' | 'quality' | 'cost' | 'balanced';

/**
 * Routing context for smart model selection
 */
export interface RoutingContext {
  taskType: TaskType;
  priority: RoutingPriority;
  requiresUnrestricted?: boolean;
  requiresChinese?: boolean;
  requiresVision?: boolean;
  requiresTools?: boolean;
  estimatedTokens?: number;
}

/**
 * Model selection result
 */
export interface ModelSelection {
  provider: string;
  model: string;
  reason: string;
  estimatedCost?: number;
  estimatedLatency?: number;
}
