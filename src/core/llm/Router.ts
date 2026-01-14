/**
 * LLM Router - Smart routing between providers and models
 *
 * Intelligently routes requests to optimal provider/model
 * Based on task requirements, capabilities, and priorities
 */

import type {
  RoutingContext,
  ModelSelection,
  RoutingPriority,
  LLMRequest,
  LLMResponse
} from './types';
import type { ProviderRegistry } from './providers/ProviderFactory';
import { MCPProvider } from './providers/MCPProvider';
import { RateLimiter } from './RateLimiter';
import { ErrorHandler } from './ErrorHandler';
import { ConcurrencyManager, DEFAULT_PROVIDER_LIMITS } from './ConcurrencyManager';
import { ModelFallbackChain, DEFAULT_FALLBACK_CHAIN, type FallbackConfig } from './ModelFallbackChain';

/**
 * Model scoring for selection
 */
interface ModelScore {
  provider: string;
  model: string;
  score: number;
  reason: string[];
}

/**
 * Parsed model identifier with provider prefix
 */
interface ParsedModel {
  provider: string | null;
  model: string;
}

/**
 * LLM Router for smart model selection
 */
export class LLMRouter {
  private rateLimiter: RateLimiter;
  private errorHandler: ErrorHandler;
  private concurrencyManager: ConcurrencyManager;
  private fallbackChain: ModelFallbackChain;
  private useFallback: boolean;

  constructor(
    private registry: ProviderRegistry,
    rateLimiter?: RateLimiter,
    errorHandler?: ErrorHandler,
    options?: {
      useFallback?: boolean;
      fallbackChain?: FallbackConfig[];
    }
  ) {
    this.rateLimiter = rateLimiter || new RateLimiter();
    this.errorHandler = errorHandler || new ErrorHandler();
    this.concurrencyManager = new ConcurrencyManager(DEFAULT_PROVIDER_LIMITS);
    this.useFallback = options?.useFallback ?? true;
    this.fallbackChain = new ModelFallbackChain(
      options?.fallbackChain || DEFAULT_FALLBACK_CHAIN
    );
  }

  /**
   * Parse model string with optional provider prefix
   * Supports: "provider/model" or just "model"
   * Examples: "glm/glm-4.7", "dolphin-3", "anthropic/claude-opus-4.5"
   */
  private parseModel(modelString: string): ParsedModel {
    const match = modelString.match(/^([a-z]+)\/(.+)$/);
    if (match) {
      return {
        provider: match[1],
        model: match[2]
      };
    }
    return {
      provider: null,
      model: modelString
    };
  }

  /**
   * Route a request to the best provider/model
   * With concurrency control and fallback chain
   */
  async route(request: LLMRequest, context: RoutingContext): Promise<LLMResponse> {
    // Use fallback chain if enabled
    if (this.useFallback) {
      return this.routeWithFallback(request, context);
    }

    // Original single-provider routing with concurrency control
    return this.routeSingleProvider(request, context);
  }

  /**
   * Route with fallback chain (recommended for production)
   */
  private async routeWithFallback(
    request: LLMRequest,
    context: RoutingContext
  ): Promise<LLMResponse> {
    const result = await this.fallbackChain.execute(
      request,
      context,
      this.registry.getMap()
    );

    if (result.error) {
      throw result.error;
    }

    console.log(
      `[Router] Success after ${result.totalAttempts} attempts, ${result.totalDuration}ms ` +
      `(tried: ${result.attemptedProviders.join(' → ')}, used: ${result.successfulProvider})`
    );

    return result.response!;
  }

  /**
   * Route to single provider with concurrency control
   */
  private async routeSingleProvider(
    request: LLMRequest,
    context: RoutingContext
  ): Promise<LLMResponse> {
    // Check if explicit model/provider specified
    let selection: ModelSelection;

    if (context.preferredModel) {
      const parsed = this.parseModel(context.preferredModel);

      if (parsed.provider) {
        // Explicit provider specified - validate it exists
        const provider = this.registry.get(parsed.provider);
        if (!provider) {
          throw new Error(`Provider not available: ${parsed.provider}`);
        }

        selection = {
          provider: parsed.provider,
          model: parsed.model,
          reason: `Explicit model selection: ${context.preferredModel}`
        };
      } else {
        // Just model name - find which provider has it
        selection = this.selectModelByName(parsed.model, context);
      }
    } else {
      // Smart selection based on context
      selection = this.selectModel(context);
    }

    const provider = this.registry.get(selection.provider);

    if (!provider) {
      throw new Error(`Provider not available: ${selection.provider}`);
    }

    // Acquire concurrency permit
    const release = await this.concurrencyManager.acquire(selection.provider);

    try {
      // Set model in request
      const routedRequest: LLMRequest = {
        ...request,
        model: selection.model
      };

      // Execute with rate limiting and error handling
      return await this.errorHandler.retryWithBackoff(
        async (attempt: number) => {
          // Wait for rate limit token
          await this.rateLimiter.waitForToken(selection.provider);

          // Execute request
          try {
            return await provider.complete(routedRequest);
          } catch (error: any) {
            // Classify error for better retry logic
            const classified = this.errorHandler.classify(error);

            // Add context to error
            error.providerName = selection.provider;
            error.modelName = selection.model;
            error.attempt = attempt;
            error.classified = classified;

            throw error;
          }
        },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 60000,
        factor: 2,
        onRetry: (attempt: number, delay: number, error: Error) => {
          const classified = this.errorHandler.classify(error);
          console.warn(
            `[Router] Retry ${attempt}/${3} after ${delay}ms - ${this.errorHandler.formatError(classified)}`
          );
        }
      }
      );
    } finally {
      // Always release concurrency permit
      release();
    }
  }

  /**
   * Select model by name across all providers
   */
  private selectModelByName(modelName: string, context: RoutingContext): ModelSelection {
    const candidates = this.getCandidates(context);

    // Find exact match
    const match = candidates.find(c => c.model === modelName);
    if (match) {
      return {
        provider: match.provider,
        model: match.model,
        reason: `Found model ${modelName} in ${match.provider}`
      };
    }

    // No match - fall back to smart selection
    return this.selectModel(context);
  }

  /**
   * Select best model based on context
   */
  selectModel(context: RoutingContext): ModelSelection {
    const candidates = this.getCandidates(context);

    if (candidates.length === 0) {
      // Fallback to default provider
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4.5-20250929',
        reason: 'Default model (no suitable alternatives found)'
      };
    }

    // Score candidates
    const scored = candidates.map(c => this.scoreCandidate(c, context));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    return {
      provider: best.provider,
      model: best.model,
      reason: best.reason.join(', ')
    };
  }

  /**
   * Get candidate provider/model pairs
   */
  private getCandidates(context: RoutingContext): Array<{ provider: string; model: string }> {
    const candidates: Array<{ provider: string; model: string }> = [];

    // Get all providers
    const providers = this.registry.list();

    for (const providerName of providers) {
      const provider = this.registry.get(providerName);
      if (!provider) continue;

      // Check basic capabilities
      if (context.requiresVision && !provider.capabilities.vision) continue;
      if (context.requiresTools && !provider.capabilities.tools) continue;

      if (providerName === 'mcp') {
        // MCP provider: get models from MCPProvider
        const mcpProvider = provider as MCPProvider;
        const models = ['dolphin-3', 'qwen-72b', 'whiterabbit', 'llama-fast', 'llama-70b', 'kimi-k2', 'glm-4.7'];

        for (const model of models) {
          const modelInfo = mcpProvider.getModelInfo(model);
          if (!modelInfo) continue;

          // Filter by requirements
          if (context.requiresUnrestricted && !modelInfo.capabilities.includes('unrestricted')) continue;
          if (context.requiresChinese && !modelInfo.capabilities.includes('chinese') && !modelInfo.capabilities.includes('multilingual')) continue;

          candidates.push({ provider: providerName, model });
        }
      } else if (providerName === 'anthropic') {
        // Anthropic provider: add Claude models
        candidates.push(
          { provider: providerName, model: 'claude-sonnet-4.5-20250929' },
          { provider: providerName, model: 'claude-opus-4.5-20251101' },
          { provider: providerName, model: 'claude-3-5-haiku-20241022' }
        );
      }
    }

    return candidates;
  }

  /**
   * Score a candidate based on context
   */
  private scoreCandidate(
    candidate: { provider: string; model: string },
    context: RoutingContext
  ): ModelScore {
    let score = 0;
    const reasons: string[] = [];

    // Get model info
    const modelInfo = this.getModelInfo(candidate);
    if (!modelInfo) {
      return { ...candidate, score: 0, reason: ['Unknown model'] };
    }

    // Task type matching
    if (modelInfo.capabilities.includes(context.taskType)) {
      score += 10;
      reasons.push(`Specialized for ${context.taskType}`);
    }

    // Priority scoring
    score += this.scorePriority(modelInfo, context.priority, reasons);

    // Special requirements
    if (context.requiresUnrestricted && modelInfo.capabilities.includes('unrestricted')) {
      score += 5;
      reasons.push('Unrestricted model');
    }

    if (context.requiresChinese && (modelInfo.capabilities.includes('chinese') || modelInfo.capabilities.includes('multilingual'))) {
      score += 5;
      reasons.push('Multilingual support');
    }

    // Agentic capabilities bonus for complex tasks
    if (context.taskType === 'debugging' || context.taskType === 'reasoning') {
      if (modelInfo.capabilities.includes('agentic')) {
        score += 8;
        reasons.push('Advanced agentic capabilities');
      }
    }

    return { ...candidate, score, reason: reasons };
  }

  /**
   * Score based on priority
   */
  private scorePriority(
    modelInfo: any,
    priority: RoutingPriority,
    reasons: string[]
  ): number {
    const speedScores: Record<string, number> = {
      'very-fast': 10,
      'fast': 7,
      'medium': 4,
      'slow': 0
    };

    const qualityScores: Record<string, number> = {
      'exceptional': 10,
      'high': 7,
      'good': 4,
      'basic': 0
    };

    const costScores: Record<string, number> = {
      'very-low': 10,
      'low': 7,
      'medium': 4,
      'high': 0
    };

    if (priority === 'speed') {
      reasons.push(`Fast model (${modelInfo.speed})`);
      return speedScores[modelInfo.speed] || 0;
    } else if (priority === 'quality') {
      reasons.push(`High quality (${modelInfo.quality})`);
      return qualityScores[modelInfo.quality] || 0;
    } else if (priority === 'cost') {
      reasons.push(`Low cost (${modelInfo.cost})`);
      return costScores[modelInfo.cost] || 0;
    } else {
      // Balanced - average of all factors
      const avgScore =
        (speedScores[modelInfo.speed] + qualityScores[modelInfo.quality] + costScores[modelInfo.cost]) / 3;
      reasons.push('Balanced choice');
      return avgScore;
    }
  }

  /**
   * Get model information
   */
  private getModelInfo(candidate: { provider: string; model: string }): any {
    if (candidate.provider === 'mcp') {
      const provider = this.registry.get('mcp') as MCPProvider;
      return provider?.getModelInfo(candidate.model);
    } else if (candidate.provider === 'anthropic') {
      // Anthropic model info (simplified)
      if (candidate.model.includes('opus')) {
        return {
          capabilities: ['reasoning', 'coding', 'writing', 'creative'],
          speed: 'medium',
          quality: 'exceptional',
          cost: 'high'
        };
      } else if (candidate.model.includes('sonnet')) {
        return {
          capabilities: ['reasoning', 'coding', 'writing', 'general'],
          speed: 'fast',
          quality: 'high',
          cost: 'medium'
        };
      } else if (candidate.model.includes('haiku')) {
        return {
          capabilities: ['general', 'coding', 'fast-response'],
          speed: 'very-fast',
          quality: 'good',
          cost: 'low'
        };
      }
    }

    return null;
  }
}
