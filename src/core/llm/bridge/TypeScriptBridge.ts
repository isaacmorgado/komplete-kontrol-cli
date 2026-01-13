/**
 * TypeScript Bridge - Call TypeScript from bash
 *
 * Provides CLI interface for bash scripts to call TypeScript functions
 * Enables gradual migration from bash to TypeScript
 */

import type { LLMRequest, LLMResponse, RoutingContext } from '../types';
import { createDefaultRegistry } from '../providers/ProviderFactory';
import { LLMRouter } from '../Router';

/**
 * CLI command handlers
 */
export class TypeScriptBridge {
  /**
   * Complete a prompt using routing
   */
  static async complete(args: {
    prompt: string;
    system?: string;
    taskType?: string;
    priority?: string;
    requiresUnrestricted?: boolean;
    model?: string;
  }): Promise<string> {
    try {
      const registry = await createDefaultRegistry();
      const router = new LLMRouter(registry);

      const request: LLMRequest = {
        messages: [{ role: 'user', content: args.prompt }],
        system: args.system,
        model: args.model
      };

      const context: RoutingContext = {
        taskType: (args.taskType as any) || 'general',
        priority: (args.priority as any) || 'balanced',
        requiresUnrestricted: args.requiresUnrestricted
      };

      const response = await router.route(request, context);

      return JSON.stringify({
        success: true,
        text: this.extractText(response),
        usage: response.usage,
        model: response.model
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Select optimal model
   */
  static async selectModel(context: RoutingContext): Promise<string> {
    try {
      const registry = await createDefaultRegistry();
      const router = new LLMRouter(registry);

      const selection = router.selectModel(context);

      return JSON.stringify({
        success: true,
        selection
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List available models
   */
  static async listModels(): Promise<string> {
    try {
      const registry = await createDefaultRegistry();
      const models: Record<string, string[]> = {};

      for (const providerName of registry.list()) {
        const provider = registry.get(providerName);
        if (provider) {
          models[providerName] = await provider.listModels();
        }
      }

      return JSON.stringify({
        success: true,
        models
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Extract text from response
   */
  private static extractText(response: LLMResponse): string {
    return response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');
  }
}

/**
 * CLI entry point for bash scripts
 *
 * Usage from bash:
 *   bun run ts-bridge complete --prompt "Hello" --system "You are helpful"
 *   bun run ts-bridge select-model --task-type coding --priority speed
 *   bun run ts-bridge list-models
 */
export async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'complete') {
      // Parse arguments
      const params: any = {};
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '').replace(/-/g, '_');
        const value = args[i + 1];

        if (key === 'requires_unrestricted') {
          params[key] = value === 'true';
        } else {
          params[key] = value;
        }
      }

      const result = await TypeScriptBridge.complete(params);
      console.log(result);
    } else if (command === 'select-model') {
      const context: any = {
        taskType: 'general',
        priority: 'balanced'
      };

      for (let i = 1; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '').replace(/-/g, '_');
        const value = args[i + 1];

        if (key === 'requires_unrestricted' || key === 'requires_chinese' || key === 'requires_vision') {
          context[key] = value === 'true';
        } else {
          context[key] = value;
        }
      }

      const result = await TypeScriptBridge.selectModel(context);
      console.log(result);
    } else if (command === 'list-models') {
      const result = await TypeScriptBridge.listModels();
      console.log(result);
    } else {
      console.log(
        JSON.stringify({
          success: false,
          error: `Unknown command: ${command}`
        })
      );
      process.exit(1);
    }
  } catch (error: any) {
    console.log(
      JSON.stringify({
        success: false,
        error: error.message
      })
    );
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
