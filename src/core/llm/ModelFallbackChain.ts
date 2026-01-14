/**
 * Model Fallback Chain - Automatic provider switching on rate limits
 *
 * Based on 2025 best practices from:
 * - Eden AI fallback mechanisms
 * - Multi-provider routing patterns
 * - Exponential backoff strategies
 *
 * Sources:
 * - https://www.edenai.co/post/rate-limits-and-fallbacks-in-eden-ai-api-calls
 * - https://cookbook.openai.com/examples/how_to_handle_rate_limits
 * - https://codinhood.com/post/ultimate-guide-ai-api-rate-limiting
 */

import type { LLMRequest, LLMResponse, RoutingContext } from './types';
import type { ILLMProvider } from './types';

export interface FallbackConfig {
  provider: string;
  model: string;
  priority: number;         // Lower = higher priority
  maxRetries?: number;      // Default: 3
  retryDelay?: number;      // Base delay in ms, default: 1000
  useExponentialBackoff?: boolean; // Default: true
}

export interface FallbackResult {
  response?: LLMResponse;
  error?: Error;
  attemptedProviders: string[];
  successfulProvider?: string;
  totalAttempts: number;
  totalDuration: number;
}

/**
 * Model Fallback Chain - Try providers in priority order
 */
export class ModelFallbackChain {
  private chain: FallbackConfig[];

  constructor(configs: FallbackConfig[]) {
    // Sort by priority (lower number = higher priority)
    this.chain = configs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute request with fallback chain
   * Tries each provider in order until success or all fail
   */
  async execute(
    request: LLMRequest,
    context: RoutingContext,
    providerRegistry: Map<string, ILLMProvider>
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    const attemptedProviders: string[] = [];
    let totalAttempts = 0;

    for (const config of this.chain) {
      const provider = providerRegistry.get(config.provider);
      if (!provider) {
        console.warn(`[FallbackChain] Provider not available: ${config.provider}`);
        continue;
      }

      attemptedProviders.push(config.provider);

      // Try this provider with retries
      const result = await this.tryProviderWithRetries(
        provider,
        config,
        request,
        context
      );

      totalAttempts += result.attempts;

      if (result.success && result.response) {
        return {
          response: result.response,
          attemptedProviders,
          successfulProvider: config.provider,
          totalAttempts,
          totalDuration: Date.now() - startTime
        };
      }

      // Log failure and continue to next provider
      console.log(
        `[FallbackChain] ${config.provider}/${config.model} failed after ${result.attempts} attempts: ${result.error?.message}`
      );
    }

    // All providers failed
    return {
      error: new Error(`All fallback providers exhausted (tried: ${attemptedProviders.join(', ')})`),
      attemptedProviders,
      totalAttempts,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * Try a single provider with exponential backoff retries
   */
  private async tryProviderWithRetries(
    provider: ILLMProvider,
    config: FallbackConfig,
    request: LLMRequest,
    context: RoutingContext
  ): Promise<{
    success: boolean;
    response?: LLMResponse;
    error?: Error;
    attempts: number;
  }> {
    const maxRetries = config.maxRetries ?? 3;
    const baseDelay = config.retryDelay ?? 1000;
    const useExponentialBackoff = config.useExponentialBackoff ?? true;

    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < maxRetries) {
      attempts++;

      try {
        // Override context with fallback model
        // Note: complete() only accepts request parameter
        // Model selection is handled through preferredModel in the original request
        const response = await provider.complete(request);
        return { success: true, response, attempts };
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimit = this.isRateLimitError(error);

        if (!isRateLimit || attempts >= maxRetries) {
          // Not rate limit or out of retries - fail immediately
          break;
        }

        // Calculate delay with exponential backoff
        const delay = useExponentialBackoff
          ? baseDelay * Math.pow(2, attempts - 1)
          : baseDelay;

        // Add jitter (random 0-25% of delay)
        const jitter = Math.random() * delay * 0.25;
        const totalDelay = delay + jitter;

        console.log(
          `[FallbackChain] Rate limit hit, retry ${attempts}/${maxRetries} after ${totalDelay}ms`
        );

        await this.delay(totalDelay);
      }
    }

    return { success: false, error: lastError, attempts };
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorString = error.message?.toLowerCase() || '';
    return (
      errorString.includes('rate limit') ||
      errorString.includes('429') ||
      errorString.includes('concurrency limit') ||
      errorString.includes('quota exceeded')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current fallback chain configuration
   */
  getChain(): FallbackConfig[] {
    return [...this.chain];
  }

  /**
   * Update chain configuration (hot reload)
   */
  updateChain(configs: FallbackConfig[]): void {
    this.chain = configs.sort((a, b) => a.priority - b.priority);
  }
}

/**
 * Default fallback chain for production
 * Based on discovered constraints and testing
 */
export const DEFAULT_FALLBACK_CHAIN: FallbackConfig[] = [
  // Priority 1: Kimi-K2 (best quality, but rate limited)
  {
    provider: 'mcp',
    model: 'kimi-k2',
    priority: 1,
    maxRetries: 2,              // Quick fail on rate limit
    retryDelay: 5000,           // 5s initial delay
    useExponentialBackoff: true  // 5s, 10s
  },

  // Priority 2: GLM-4.7 (no concurrency limits, good fallback)
  {
    provider: 'mcp',
    model: 'glm-4.7',
    priority: 2,
    maxRetries: 3,
    retryDelay: 2000,
    useExponentialBackoff: true
  },

  // Priority 3: Llama-70B (reliable, larger context)
  {
    provider: 'featherless',
    model: 'llama-70b',
    priority: 3,
    maxRetries: 3,
    retryDelay: 1000,
    useExponentialBackoff: true
  },

  // Priority 4: Dolphin-3 (uncensored fallback)
  {
    provider: 'featherless',
    model: 'dolphin-3',
    priority: 4,
    maxRetries: 3,
    retryDelay: 1000,
    useExponentialBackoff: true
  }
];

/**
 * Fallback chain optimized for ReflexionAgent (reasoning tasks)
 */
export const REFLEXION_FALLBACK_CHAIN: FallbackConfig[] = [
  // Prefer models with strong reasoning
  {
    provider: 'mcp',
    model: 'kimi-k2',
    priority: 1,
    maxRetries: 1,  // Fail fast for agent loops
    retryDelay: 3000
  },
  {
    provider: 'mcp',
    model: 'glm-4.7',
    priority: 2,
    maxRetries: 2,
    retryDelay: 2000
  },
  {
    provider: 'featherless',
    model: 'llama-70b',
    priority: 3,
    maxRetries: 2,
    retryDelay: 1000
  }
];
