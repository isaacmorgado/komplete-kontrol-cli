/**
 * Models Module
 * Exports all model-related interfaces and implementations
 */

// Re-export from ILLMProvider (excluding duplicate ModelInfo)
export type {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMStreamChunk,
} from './ILLMProvider';

// Re-export from ModelConfig (primary source for ModelInfo, ProviderConfig)
export type {
  ModelConfig,
  ModelInfo,
  ProviderConfig,
  ModelCost,
  ModelSelection,
} from './ModelConfig';

// Re-export implementations
export { AnthropicProvider } from './AnthropicProvider';
export { VSCodeLLMProvider } from './VSCodeLLMProvider';
export { createProvider } from './ProviderFactory';
export { ModelManager, createModelManager } from './ModelManager';
