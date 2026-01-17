/**
 * ProviderFactory
 * Factory for creating LLM provider instances
 */

import type { ILLMProvider } from './ILLMProvider';
import type { ProviderConfig } from './ModelConfig';
import { createAnthropicProvider } from './AnthropicProvider';
import { createVSCodeLLMProvider } from './VSCodeLLMProvider';

/**
 * Create provider instance by name
 */
export function createProvider(config: ProviderConfig): ILLMProvider {
  switch (config.name) {
    case 'anthropic':
      if (!config.apiKey) {
        throw new Error('Anthropic provider requires API key');
      }
      return createAnthropicProvider(config.apiKey);

    case 'vscode':
      return createVSCodeLLMProvider();

    case 'local':
      // Local provider not yet implemented, fall through to VSCode
      return createVSCodeLLMProvider();

    default:
      throw new Error(`Unknown provider: ${config.name}`);
  }
}

/**
 * Get available providers
 */
export function getAvailableProviders(): string[] {
  return ['anthropic', 'vscode', 'local'];
}

/**
 * Validate provider name
 */
export function isValidProvider(name: string): boolean {
  return getAvailableProviders().includes(name);
}
