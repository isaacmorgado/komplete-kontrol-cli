/**
 * ProviderFactory
 * Factory for creating LLM provider instances
 */

import type { ILLMProvider } from './ILLMProvider';
import { createAnthropicProvider } from './AnthropicProvider';
import { createVSCodeLLMProvider } from './VSCodeLLMProvider';

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
}

/**
 * Create provider instance by name
 */
export function createProvider(config: ProviderConfig): ILLMProvider {
  switch (config.name) {
    case 'anthropic':
      if (!config.apiKey) {
        throw new Error('Anthropic provider requires API key');
      }
      return createAnthropicProvider(config.apiKey!);
    
    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI provider requires API key');
      }
      return createOpenAIProvider(config.apiKey!);
    
    case 'vscode':
      return createVSCodeLLMProvider();
    
    default:
      throw new Error(`Unknown provider: ${config.name}`);
  }
}

/**
 * Get available providers
 */
export function getAvailableProviders(): string[] {
  return ['anthropic', 'openai', 'vscode'];
}

/**
 * Validate provider name
 */
export function isValidProvider(name: string): boolean {
  return getAvailableProviders().includes(name);
}
