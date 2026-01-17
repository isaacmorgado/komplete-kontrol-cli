/**
 * Configuration Manager
 * Handles loading, saving, and validation of CLI configuration
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface CLIConfig {
  version: string;
  models: {
    default: string;
    providers: {
      anthropic: { apiKey: string; baseUrl?: string };
      openai: { apiKey: string; baseUrl?: string };
      gemini: { apiKey: string };
      vscode: { enabled: boolean };
      local: { enabled: boolean; baseUrl: string };
    };
    fallbackChain: string[];
  };
  tools: {
    tavily: { enabled: boolean; apiKey: string; maxResults: number };
    base44: { enabled: boolean; apiKey: string; workspaceId: string };
    mcpServers: Array<{ id: string; name: string; url: string }>;
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    streaming: boolean;
    showCost: boolean;
    showTokens: boolean;
  };
  verification: {
    autoVerify: boolean;
    autoRepair: boolean;
    maxRetries: number;
  };
}

const DEFAULT_CONFIG: CLIConfig = {
  version: '2.0',
  models: {
    default: 'claude-sonnet-4.5',
    providers: {
      anthropic: { apiKey: '', baseUrl: 'https://api.anthropic.com' },
      openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1' },
      gemini: { apiKey: '' },
      vscode: { enabled: false },
      local: { enabled: false, baseUrl: 'http://localhost:11434' },
    },
    fallbackChain: ['claude-sonnet-4.5', 'claude-haiku-4', 'gpt-4o-mini'],
  },
  tools: {
    tavily: { enabled: false, apiKey: '', maxResults: 10 },
    base44: { enabled: false, apiKey: '', workspaceId: '' },
    mcpServers: [],
  },
  ui: {
    theme: 'auto',
    streaming: true,
    showCost: true,
    showTokens: true,
  },
  verification: {
    autoVerify: true,
    autoRepair: true,
    maxRetries: 3,
  },
};

export class ConfigManager {
  private config: CLIConfig = DEFAULT_CONFIG;
  private configPath: string;

  constructor() {
    this.configPath = join(homedir(), '.komplete', 'config.json');
  }

  async load(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to load config, using defaults:', error);
      }
      this.config = DEFAULT_CONFIG;
    }
  }

  async save(): Promise<void> {
    const configDir = join(homedir(), '.komplete');
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  get<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
    return this.config[key];
  }

  set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
    this.config[key] = value;
  }

  getNested<K1 extends keyof CLIConfig, K2 extends keyof CLIConfig[K1]>(
    key1: K1,
    key2: K2
  ): CLIConfig[K1][K2] {
    return this.config[key1][key2];
  }

  setNested<K1 extends keyof CLIConfig, K2 extends keyof CLIConfig[K1]>(
    key1: K1,
    key2: K2,
    value: CLIConfig[K1][K2]
  ): void {
    this.config[key1][key2] = value;
  }

  getFullConfig(): CLIConfig {
    return { ...this.config };
  }

  async migrate(_oldConfig: unknown): Promise<CLIConfig> {
    // Migration logic for v1.0 -> v2.0
    // Will be implemented in migration phase
    return DEFAULT_CONFIG;
  }
}
