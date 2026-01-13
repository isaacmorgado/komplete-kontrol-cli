/**
 * MCP Provider - Multi-model delegation via MCP server
 *
 * Integrates with ~/.claude/multi-model-mcp-server.js
 * Provides access to Featherless and GLM models
 */

import { spawn } from 'child_process';
import type {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  StreamHandler,
  ProviderCapabilities,
  ProviderConfig,
  ContentBlock
} from '../types';

/**
 * Model configuration from MCP server
 */
interface MCPModel {
  id: string;
  name: string;
  capabilities: string[];
  cost: string;
  speed: string;
  quality: string;
  vision: boolean;
}

/**
 * MCP models (synced with multi-model-mcp-server.js)
 */
const MCP_MODELS: Record<string, MCPModel> = {
  'dolphin-3': {
    id: 'featherless/dphn/Dolphin-Mistral-24B-Venice-Edition',
    name: 'Dolphin-3 Venice',
    capabilities: ['coding', 'security', 'reverse-engineering', 'unrestricted'],
    cost: 'low',
    speed: 'fast',
    quality: 'high',
    vision: false
  },
  'qwen-72b': {
    id: 'featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated',
    name: 'Qwen 2.5 72B',
    capabilities: ['reasoning', 'coding', 'writing', 'unrestricted'],
    cost: 'medium',
    speed: 'medium',
    quality: 'exceptional',
    vision: false
  },
  'whiterabbit': {
    id: 'featherless/WhiteRabbitNeo/Llama-3-WhiteRabbitNeo-8B-v2.0',
    name: 'WhiteRabbitNeo 8B',
    capabilities: ['coding', 'creative', 'unrestricted'],
    cost: 'very-low',
    speed: 'very-fast',
    quality: 'good',
    vision: false
  },
  'llama-fast': {
    id: 'featherless/mlabonne/Meta-Llama-3.1-8B-Instruct-abliterated',
    name: 'Llama 3.1 8B',
    capabilities: ['general', 'fast-response', 'unrestricted'],
    cost: 'very-low',
    speed: 'very-fast',
    quality: 'good',
    vision: false
  },
  'llama-70b': {
    id: 'featherless/huihui-ai/Llama-3.3-70B-Instruct-abliterated',
    name: 'Llama 3.3 70B',
    capabilities: ['reasoning', 'coding', 'writing', 'unrestricted'],
    cost: 'medium',
    speed: 'medium',
    quality: 'exceptional',
    vision: false
  },
  'kimi-k2': {
    id: 'featherless/moonshotai/Kimi-K2-Instruct',
    name: 'Kimi K2',
    capabilities: ['agentic', 'coding', 'autonomous', 'reasoning', 'unrestricted'],
    cost: 'medium',
    speed: 'fast',
    quality: 'exceptional',
    vision: false
  },
  'glm-4.7': {
    id: 'glm/glm-4.7',
    name: 'GLM-4.7',
    capabilities: ['reasoning', 'coding', 'chinese', 'multilingual'],
    cost: 'low',
    speed: 'fast',
    quality: 'high',
    vision: false
  }
};

/**
 * MCP Provider implementation
 */
export class MCPProvider implements ILLMProvider {
  public readonly name = 'mcp';
  public readonly capabilities: ProviderCapabilities = {
    streaming: false, // MCP server doesn't support streaming yet
    vision: false, // No vision models in current lineup
    tools: false, // No tool support yet
    systemPrompt: true,
    multiModal: false
  };

  private proxyUrl: string;
  private defaultModel: string;

  constructor(config: ProviderConfig) {
    this.proxyUrl = config.baseUrl || process.env.PROXY_URL || 'http://127.0.0.1:3000';
    this.defaultModel = config.defaultModel || 'glm-4.7';
  }

  /**
   * Send a completion request via proxy
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const modelKey = request.model || this.defaultModel;
    const modelInfo = MCP_MODELS[modelKey];

    if (!modelInfo) {
      throw new Error(`Unknown MCP model: ${modelKey}. Available: ${Object.keys(MCP_MODELS).join(', ')}`);
    }

    // Build messages array
    const messages: any[] = [];

    // Add system message if provided
    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }

    // Add request messages
    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: this.flattenContent(msg.content)
      });
    }

    // Call proxy server
    const response = await fetch(`${this.proxyUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelInfo.id,
        messages,
        max_tokens: request.max_tokens || 2048,
        temperature: request.temperature,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MCP proxy error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as any;

    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    // Convert to our format
    const text = data.content?.find((b: any) => b.type === 'text')?.text || '';

    return {
      id: data.id || `mcp-${Date.now()}`,
      model: modelKey,
      role: 'assistant',
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  /**
   * Streaming not supported yet
   */
  async streamComplete(request: LLMRequest, handler: StreamHandler): Promise<LLMResponse> {
    throw new Error('Streaming not supported by MCP provider yet');
  }

  /**
   * List available MCP models
   */
  async listModels(): Promise<string[]> {
    return Object.keys(MCP_MODELS);
  }

  /**
   * Get model info
   */
  getModelInfo(modelKey: string): MCPModel | undefined {
    return MCP_MODELS[modelKey];
  }

  /**
   * Flatten content to string (MCP proxy doesn't support multi-modal yet)
   */
  private flattenContent(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
      return content;
    }

    return content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');
  }
}

/**
 * Check if MCP proxy is available
 */
export async function isMCPAvailable(proxyUrl: string = 'http://127.0.0.1:3000'): Promise<boolean> {
  try {
    const response = await fetch(`${proxyUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });
    // Any response (even error) means proxy is running
    return true;
  } catch {
    return false;
  }
}
