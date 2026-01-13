/**
 * LLM Integration Layer - Main exports
 *
 * Unified interface for multiple LLM providers with smart routing
 * Supports streaming, tool use, and multi-modal capabilities
 */

// Types
export * from './types';

// Providers
export { AnthropicProvider } from './providers/AnthropicProvider';
export { MCPProvider, isMCPAvailable } from './providers/MCPProvider';
export {
  createProvider,
  ProviderRegistry,
  createDefaultRegistry,
  type ProviderType
} from './providers/ProviderFactory';

// Router
export { LLMRouter } from './Router';

// Streaming
export {
  createStreamAccumulator,
  updateAccumulator,
  createConsoleHandler,
  createCallbackHandler,
  createBufferedHandler,
  combineHandlers,
  extractText,
  type StreamAccumulator
} from './Streaming';

// Bridge
export {
  executeBash,
  executeHook,
  executeProjectCommand,
  getGitStatus,
  runTests,
  MemoryManagerBridge,
  CoordinatorBridge,
  type BashResult
} from './bridge/BashBridge';

export { TypeScriptBridge } from './bridge/TypeScriptBridge';

// Re-import for internal use
import { createDefaultRegistry as _createDefaultRegistry } from './providers/ProviderFactory';
import { LLMRouter as _LLMRouter } from './Router';

/**
 * Quick start helper - Create a ready-to-use LLM client
 */
export async function createLLMClient() {
  const registry = await _createDefaultRegistry();
  const router = new _LLMRouter(registry);

  return {
    registry,
    router,

    /**
     * Complete a prompt with smart routing
     */
    async complete(
      prompt: string,
      options?: {
        system?: string;
        taskType?: string;
        priority?: string;
        requiresUnrestricted?: boolean;
        model?: string;
      }
    ) {
      const request = {
        messages: [{ role: 'user' as const, content: prompt }],
        system: options?.system,
        model: options?.model
      };

      const context = {
        taskType: (options?.taskType as any) || 'general',
        priority: (options?.priority as any) || 'balanced',
        requiresUnrestricted: options?.requiresUnrestricted
      };

      return router.route(request, context);
    },

    /**
     * Stream a completion with smart routing
     */
    async streamComplete(
      prompt: string,
      onChunk: (text: string) => void,
      options?: {
        system?: string;
        taskType?: string;
        priority?: string;
        model?: string;
      }
    ) {
      // For now, use Anthropic provider directly for streaming
      // (MCP provider doesn't support streaming yet)
      const anthropic = registry.get('anthropic');
      if (!anthropic) {
        throw new Error('Anthropic provider not available for streaming');
      }

      const request = {
        messages: [{ role: 'user' as const, content: prompt }],
        system: options?.system,
        model: options?.model || 'claude-sonnet-4.5-20250929'
      };

      const handler = (event: any) => {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          onChunk(event.delta.text || '');
        }
      };

      return anthropic.streamComplete(request, handler);
    }
  };
}
