/**
 * ModelConfig Interface
 * Configuration for LLM models and providers
 */

/**
 * Model Info for provider models
 */
export interface ModelInfo {
  id: string;
  name: string;
  maxTokens?: number;
  contextLength?: number;
}

export interface ModelConfig {
  /**
   * Default model to use (format: provider/model)
   */
  defaultModel: string;

  /**
   * Fallback chain of models to try if default fails
   */
  fallbackModels: string[];

  /**
   * Provider configurations
   */
  providers: ProviderConfig[];

  /**
   * Cost tracking enabled
   */
  trackCosts: boolean;

  /**
   * Token counting enabled
   */
  countTokens: boolean;
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  /**
   * Provider name (anthropic, openai, vscode, local)
   */
  name: string;

  /**
   * API key or auth token
   */
  apiKey?: string;

  /**
   * Base URL for API requests
   */
  baseUrl?: string;

  /**
   * Models available from this provider
   */
  models: ModelInfo[];

  /**
   * Whether this provider is enabled
   */
  enabled: boolean;
}

/**
 * Model Cost Tracking
 */
export interface ModelCost {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: Date;
}

/**
 * Model Selection Result
 */
export interface ModelSelection {
  provider: string;
  model: string;
  estimatedCost: number;
  estimatedTokens: number;
}
