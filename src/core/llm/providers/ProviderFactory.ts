/**
 * Provider Factory - Create and manage LLM providers
 *
 * Factory pattern for creating provider instances
 * Handles configuration and initialization
 */

import type { ILLMProvider, ProviderConfig } from '../types';
import { AnthropicProvider } from './AnthropicProvider';
import { MCPProvider, isMCPAvailable } from './MCPProvider';

export type ProviderType = 'anthropic' | 'mcp';

/**
 * Create a provider instance
 */
export function createProvider(type: ProviderType, config?: Partial<ProviderConfig>): ILLMProvider {
  const fullConfig: ProviderConfig = {
    name: type,
    ...config
  };

  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(fullConfig);

    case 'mcp':
      return new MCPProvider(fullConfig);

    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Provider registry
 */
export class ProviderRegistry {
  private providers = new Map<string, ILLMProvider>();
  private defaultProvider?: ILLMProvider;

  /**
   * Register a provider
   */
  register(name: string, provider: ILLMProvider, isDefault = false): void {
    this.providers.set(name, provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  /**
   * Get provider by name
   */
  get(name: string): ILLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get default provider
   */
  getDefault(): ILLMProvider {
    if (!this.defaultProvider) {
      throw new Error('No default provider configured');
    }
    return this.defaultProvider;
  }

  /**
   * List all registered providers
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider exists
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }
}

/**
 * Create default provider registry with all providers
 */
export async function createDefaultRegistry(): Promise<ProviderRegistry> {
  const registry = new ProviderRegistry();

  // Register Anthropic (fallback)
  const anthropic = createProvider('anthropic');
  registry.register('anthropic', anthropic);

  // Register MCP (if available, make it default)
  const mcpAvailable = await isMCPAvailable();
  if (mcpAvailable) {
    const mcp = createProvider('mcp');
    registry.register('mcp', mcp, true);
  } else {
    registry.register('anthropic', anthropic, true);
  }

  return registry;
}
