/**
 * ModelManager
 * Central manager for LLM models with multi-provider support and fallback chain
 */

import type {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  ModelInfo,
  ModelConfig,
  ModelCost,
  ModelSelection,
} from './ModelConfig';
import { createProvider } from './ProviderFactory';

/**
 * ModelManager class
 * Manages LLM providers, model selection, fallback chain, and cost tracking
 */
export class ModelManager {
  private providers: Map<string, ILLMProvider> = new Map();
  private config: ModelConfig;
  private currentProvider: string | null = null;
  private currentModel: string | null = null;
  private costHistory: ModelCost[] = [];
  private totalCost: number = 0;

  constructor(config: ModelConfig) {
    this.config = config;
    this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private async initializeProviders(): Promise<void> {
    for (const providerConfig of this.config.providers) {
      if (providerConfig.enabled) {
        try {
          const provider = createProvider(providerConfig);
          const available = await provider.isAvailable();
          
          if (available) {
            this.providers.set(providerConfig.name, provider);
          }
        } catch (error) {
          console.error(`Failed to initialize provider ${providerConfig.name}:`, error);
        }
      }
    }
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): string | null {
    return this.currentProvider;
  }

  /**
   * Get current model
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Select model with automatic fallback chain
   */
  async selectModel(modelId?: string): Promise<ModelSelection> {
    const models = modelId ? [modelId] : this.config.fallbackModels;
    
    for (const candidateModel of models) {
      const [providerName, modelName] = candidateModel.split('/');
      
      const provider = this.providers.get(providerName);
      if (!provider) {
        console.warn(`Provider ${providerName} not available, skipping`);
        continue;
      }

      const available = await provider.isAvailable();
      if (!available) {
        console.warn(`Provider ${providerName} not available, skipping`);
        continue;
      }

      const modelInfo = provider.getModelInfo(modelName);
      if (!modelInfo) {
        console.warn(`Model ${modelName} not found in provider ${providerName}, skipping`);
        continue;
      }

      // Model is available, select it
      this.currentProvider = providerName;
      this.currentModel = candidateModel;
      
      const estimatedCost = provider.estimateCost([], candidateModel);
      const estimatedTokens = await provider.countTokens([]);
      
      return {
        provider: providerName,
        model: candidateModel,
        estimatedCost,
        estimatedTokens,
      };
    }

    throw new Error('No available model found in fallback chain');
  }

  /**
   * Stream completion with automatic fallback on failure
   */
  async *streamCompletion(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncIterable<string> {
    if (!this.currentProvider || !this.currentModel) {
      throw new Error('No model selected. Call selectModel() first.');
    }

    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Provider ${this.currentProvider} not initialized`);
    }

    let lastError: Error | null = null;
    const fallbackChain = [this.currentModel, ...this.config.fallbackModels];

    for (const modelId of fallbackChain) {
      const [providerName, modelName] = modelId.split('/');
      const fallbackProvider = this.providers.get(providerName);
      
      if (!fallbackProvider) {
        continue;
      }

      try {
        const stream = fallbackProvider.streamCompletion(messages, {
          ...options,
          model: modelName,
        });

        let fullContent = '';
        for await (const chunk of stream) {
          fullContent += chunk.content;
          yield chunk.content;
          
          if (chunk.done) {
            // Track cost
            if (this.config.trackCosts) {
              await this.trackCost(messages, modelId, fullContent.length);
            }
            
            return;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Model ${modelId} failed, trying next fallback:`, lastError.message);
      }
    }

    throw new Error(`All models in fallback chain failed. Last error: ${lastError?.message}`);
  }

  /**
   * Track cost for a completion
   */
  private async trackCost(
    messages: LLMMessage[],
    modelId: string,
    outputLength: number,
  ): Promise<void> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) return;

    const cost = provider.estimateCost(messages, modelId);
    
    const costEntry: ModelCost = {
      inputTokens: await provider.countTokens(messages),
      outputTokens: Math.ceil(outputLength / 4),
      inputCost: cost * 0.5, // Approximate
      outputCost: cost * 0.5,
      totalCost: cost,
      timestamp: new Date(),
    };

    this.costHistory.push(costEntry);
    this.totalCost += cost;

    // Keep history limited to last 100 entries
    if (this.costHistory.length > 100) {
      this.costHistory = this.costHistory.slice(-100);
    }
  }

  /**
   * Get total cost for current session
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get cost history
   */
  getCostHistory(): ModelCost[] {
    return [...this.costHistory];
  }

  /**
   * Get all available models from all providers
   */
  getAllModels(): ModelInfo[] {
    const allModels: ModelInfo[] = [];
    
    for (const provider of this.providers.values()) {
      const models = provider.getModels();
      allModels.push(...models);
    }
    
    return allModels;
  }

  /**
   * Get models for a specific provider
   */
  getProviderModels(providerName: string): ModelInfo[] {
    const provider = this.providers.get(providerName);
    return provider?.getModels() || [];
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking(): void {
    this.costHistory = [];
    this.totalCost = 0;
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    total: number;
    count: number;
    average: number;
    byProvider: Map<string, number>;
  } {
    const byProvider = new Map<string, number>();
    
    for (const cost of this.costHistory) {
      const current = byProvider.get(this.currentProvider || 'unknown') || 0;
      byProvider.set(this.currentProvider || 'unknown', current + cost.totalCost);
    }

    return {
      total: this.totalCost,
      count: this.costHistory.length,
      average: this.costHistory.length > 0 
        ? this.totalCost / this.costHistory.length 
        : 0,
      byProvider,
    };
  }
}

/**
 * Create ModelManager instance
 */
export async function createModelManager(config: ModelConfig): Promise<ModelManager> {
  const manager = new ModelManager(config);
  await manager.initializeProviders();
  return manager;
}
