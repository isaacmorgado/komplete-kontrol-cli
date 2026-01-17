/**
 * Shared Core Module
 * Singleton that manages all shared functionality between CLI and VS Code extension
 */

import { ModelManager } from './models';
import type { ModelConfig } from './models/ModelConfig';
import { ToolManager } from './tools';
import { StreamHandler } from './streaming';
import { VerificationManager } from './verification/VerificationManager';
import { ConfigManager } from './ConfigManager';

/**
 * Convert ConfigManager to ModelConfig format
 */
function buildModelConfig(configManager: ConfigManager): ModelConfig {
  const modelsConfig = configManager.get('models');
  const providers = modelsConfig?.providers || {};

  const providerConfigs = [];

  // Anthropic provider
  if (providers.anthropic?.apiKey) {
    providerConfigs.push({
      name: 'anthropic',
      apiKey: providers.anthropic.apiKey,
      baseUrl: providers.anthropic.baseUrl,
      models: [
        { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', maxTokens: 8192, contextLength: 200000 },
        { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', maxTokens: 8192, contextLength: 200000 },
        { id: 'claude-haiku-4', name: 'Claude Haiku 4', maxTokens: 4096, contextLength: 200000 },
      ],
      enabled: true,
    });
  }

  // OpenAI provider
  if (providers.openai?.apiKey) {
    providerConfigs.push({
      name: 'openai',
      apiKey: providers.openai.apiKey,
      baseUrl: providers.openai.baseUrl,
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 4096, contextLength: 128000 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 4096, contextLength: 128000 },
      ],
      enabled: true,
    });
  }

  // Gemini provider
  if (providers.gemini?.apiKey) {
    providerConfigs.push({
      name: 'gemini',
      apiKey: providers.gemini.apiKey,
      models: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', maxTokens: 8192, contextLength: 1000000 },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', maxTokens: 8192, contextLength: 2000000 },
      ],
      enabled: true,
    });
  }

  // VSCode provider
  if (providers.vscode?.enabled) {
    providerConfigs.push({
      name: 'vscode',
      baseUrl: 'http://localhost:11434',
      models: [],
      enabled: true,
    });
  }

  // Local provider
  if (providers.local?.enabled) {
    providerConfigs.push({
      name: 'local',
      baseUrl: providers.local.baseUrl || 'http://localhost:11434',
      models: [],
      enabled: true,
    });
  }

  return {
    defaultModel: modelsConfig?.default || 'claude-sonnet-4.5',
    fallbackModels: modelsConfig?.fallbackChain || [],
    providers: providerConfigs,
    trackCosts: true,
    countTokens: true,
  };
}

export class SharedCore {
  private static instance: SharedCore;

  private modelManager: ModelManager;
  private toolManager: ToolManager;
  private streamHandler: StreamHandler;
  private verificationManager: VerificationManager;
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = new ConfigManager();
    const modelConfig = buildModelConfig(this.configManager);
    this.modelManager = new ModelManager(modelConfig);
    this.toolManager = new ToolManager();
    this.streamHandler = new StreamHandler();
    this.verificationManager = new VerificationManager();
  }

  static getInstance(): SharedCore {
    if (!SharedCore.instance) {
      SharedCore.instance = new SharedCore();
    }
    return SharedCore.instance;
  }

  // Model Management
  getModelManager(): ModelManager {
    return this.modelManager;
  }

  // Tool Management
  getToolManager(): ToolManager {
    return this.toolManager;
  }

  // Stream Handling
  getStreamHandler(): StreamHandler {
    return this.streamHandler;
  }

  // Verification
  getVerificationManager(): VerificationManager {
    return this.verificationManager;
  }

  // Configuration
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  // Initialization
  async initialize(): Promise<void> {
    await this.configManager.load();
    await this.modelManager.initialize();
    await this.toolManager.initialize();
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.toolManager.disconnectAll();
    await this.modelManager.cleanup();
  }
}

export const sharedCore = SharedCore.getInstance();
