/**
 * Shared Core Module
 * Singleton that manages all shared functionality between CLI and VS Code extension
 */

import { ModelManager } from './models';
import { ToolManager } from './tools';
import { StreamHandler } from './streaming';
import { VerificationManager } from './verification/VerificationManager';
import { ConfigManager } from './ConfigManager';

export class SharedCore {
  private static instance: SharedCore;
  
  private modelManager: ModelManager;
  private toolManager: ToolManager;
  private streamHandler: StreamHandler;
  private verificationManager: VerificationManager;
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = new ConfigManager();
    this.modelManager = new ModelManager(this.configManager);
    this.toolManager = new ToolManager(this.configManager);
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
