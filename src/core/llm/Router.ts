/**
 * LLM Router - Smart routing between providers and models
 *
 * Intelligently routes requests to optimal provider/model
 * Based on task requirements, capabilities, and priorities
 */

import type {
  RoutingContext,
  ModelSelection,
  TaskType,
  RoutingPriority,
  ILLMProvider,
  LLMRequest,
  LLMResponse
} from './types';
import type { ProviderRegistry } from './providers/ProviderFactory';
import { MCPProvider } from './providers/MCPProvider';

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
 * LLM Router for smart model selection
 */
export class LLMRouter {
  constructor(private registry: ProviderRegistry) {}

  /**
   * Route a request to the best provider/model
   */
  async route(request: LLMRequest, context: RoutingContext): Promise<LLMResponse> {
    const selection = this.selectModel(context);
    const provider = this.registry.get(selection.provider);

    if (!provider) {
      throw new Error(`Provider not available: ${selection.provider}`);
    }

    // Set model in request
    const routedRequest: LLMRequest = {
      ...request,
      model: selection.model
    };

    return provider.complete(routedRequest);
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
