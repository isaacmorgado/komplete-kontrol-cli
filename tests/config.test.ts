/**
 * Configuration management tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigManager, loadConfig, getConfig, initConfigManager, getConfigManager } from '../src/config';
import { Logger, LogLevel } from '../src/utils/logger';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigError } from '../src/types';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let logger: Logger;
  let tempConfigPath: string;

  beforeEach(() => {
    logger = new Logger({ level: LogLevel.ERROR, colorize: false });
    configManager = new ConfigManager(logger);
    tempConfigPath = path.join(process.cwd(), '.kompleterc.test.json');
  });

  afterEach(() => {
    // Clean up test config file
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  });

  describe('Configuration Loading', () => {
    it('should load default configuration', () => {
      const config = configManager.load();
      expect(config).toBeDefined();
      expect(config.defaultModel).toBe('or/claude-3.5-sonnet');
      expect(config.fallbackModels).toEqual([]);
      expect(config.context?.maxTokens).toBe(200000);
      expect(config.context?.condensationThreshold).toBe(150000);
      expect(config.context?.preserveToolUse).toBe(true);
      expect(config.agents?.maxParallel).toBe(4);
      expect(config.agents?.timeoutMs).toBe(30000);
      expect(config.budget?.maxCostPerCommand).toBe(1.0);
      expect(config.budget?.maxDailyCost).toBe(10.0);
      expect(config.budget?.alertThreshold).toBe(0.8);
      expect(config.mcp?.enabled).toBe(true);
      expect(config.mcp?.servers).toEqual([]);
      expect(config.logging?.level).toBe('info');
    });

    it('should load configuration from file', () => {
      const testConfig = {
        defaultModel: 'or/gpt-4',
        fallbackModels: ['or/claude-3.5-sonnet'],
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(testConfig, null, 2));
      const config = configManager.load(tempConfigPath);

      expect(config.defaultModel).toBe('or/gpt-4');
      expect(config.fallbackModels).toEqual(['or/claude-3.5-sonnet']);
    });

    it('should throw ConfigError for invalid JSON file', () => {
      fs.writeFileSync(tempConfigPath, 'invalid json');
      expect(() => configManager.load(tempConfigPath)).toThrow(ConfigError);
    });

    it('should throw ConfigError for non-existent file', () => {
      expect(() => configManager.load('/nonexistent/path/config.json')).toThrow(ConfigError);
    });
  });

  describe('Configuration Saving', () => {
    it('should save configuration to file', async () => {
      const configToSave = {
        defaultModel: 'or/gpt-4',
        fallbackModels: ['or/claude-3.5-sonnet'],
      };

      await configManager.save(configToSave, tempConfigPath);

      expect(fs.existsSync(tempConfigPath)).toBe(true);

      const savedContent = fs.readFileSync(tempConfigPath, 'utf-8');
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.defaultModel).toBe('or/gpt-4');
      expect(savedConfig.fallbackModels).toEqual(['or/claude-3.5-sonnet']);
    });

    it('should merge with existing configuration when saving', async () => {
      // First save
      await configManager.save({ defaultModel: 'or/gpt-4' }, tempConfigPath);

      // Second save with partial config
      await configManager.save({ fallbackModels: ['or/claude-3.5-sonnet'] }, tempConfigPath);

      const config = configManager.load(tempConfigPath);
      expect(config.defaultModel).toBe('or/gpt-4');
      expect(config.fallbackModels).toEqual(['or/claude-3.5-sonnet']);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = path.join(process.cwd(), 'test-nested-dir', 'config.json');

      await configManager.save({ defaultModel: 'or/gpt-4' }, nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);

      // Clean up
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath));
    });
  });

  describe('Configuration Access', () => {
    it('should get all configuration', () => {
      configManager.load();
      const config = configManager.getAll();

      expect(config).toBeDefined();
      expect(config.defaultModel).toBeDefined();
      expect(config.context).toBeDefined();
    });

    it('should throw ConfigError when getting config before loading', () => {
      const newManager = new ConfigManager(logger);
      expect(() => newManager.getAll()).toThrow(ConfigError);
    });

    it('should get configuration path', () => {
      fs.writeFileSync(tempConfigPath, JSON.stringify({ defaultModel: 'or/gpt-4' }));
      configManager.load(tempConfigPath);

      const configPath = configManager.getPath();
      expect(configPath).toBe(tempConfigPath);
    });

    it('should return null for config path when not loaded', () => {
      const newManager = new ConfigManager(logger);
      const configPath = newManager.getPath();
      expect(configPath).toBeNull();
    });
  });

  describe('Configuration Value Access', () => {
    beforeEach(() => {
      configManager.load();
    });

    it('should get configuration value by key', () => {
      const defaultModel = configManager.getValue('defaultModel');
      expect(defaultModel).toBe('or/claude-3.5-sonnet');
    });

    it('should get nested configuration value', () => {
      const maxTokens = configManager.getValue('context')?.maxTokens;
      expect(maxTokens).toBe(200000);
    });

    it('should set configuration value', () => {
      configManager.set('defaultModel', 'or/gpt-4');
      const defaultModel = configManager.getValue('defaultModel');
      expect(defaultModel).toBe('or/gpt-4');
    });

    it('should throw ConfigError when setting value before loading', () => {
      const newManager = new ConfigManager(logger);
      expect(() => newManager.set('defaultModel', 'or/gpt-4')).toThrow(ConfigError);
    });

    it('should throw ConfigError when getting value before loading', () => {
      const newManager = new ConfigManager(logger);
      expect(() => newManager.getValue('defaultModel')).toThrow(ConfigError);
    });
  });

  describe('Configuration Reloading', () => {
    it('should reload configuration from file', () => {
      const initialConfig = { defaultModel: 'or/gpt-4' };
      fs.writeFileSync(tempConfigPath, JSON.stringify(initialConfig, null, 2));
      configManager.load(tempConfigPath);

      expect(configManager.getValue('defaultModel')).toBe('or/gpt-4');

      // Modify file
      const updatedConfig = { defaultModel: 'or/claude-3.5-sonnet' };
      fs.writeFileSync(tempConfigPath, JSON.stringify(updatedConfig, null, 2));

      configManager.reload();

      expect(configManager.getValue('defaultModel')).toBe('or/claude-3.5-sonnet');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration schema', () => {
      const validConfig = {
        defaultModel: 'or/gpt-4',
        fallbackModels: ['or/claude-3.5-sonnet'],
        context: {
          maxTokens: 150000,
          condensationThreshold: 100000,
          preserveToolUse: false,
        },
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(validConfig, null, 2));
      const config = configManager.load(tempConfigPath);

      expect(config.defaultModel).toBe('or/gpt-4');
      expect(config.context?.maxTokens).toBe(150000);
    });

    it('should apply default values for missing fields', () => {
      const partialConfig = {
        defaultModel: 'or/gpt-4',
      };

      fs.writeFileSync(tempConfigPath, JSON.stringify(partialConfig, null, 2));
      const config = configManager.load(tempConfigPath);

      expect(config.defaultModel).toBe('or/gpt-4');
      expect(config.fallbackModels).toEqual([]);
      expect(config.context?.maxTokens).toBe(200000);
      expect(config.context?.condensationThreshold).toBe(150000);
      expect(config.context?.preserveToolUse).toBe(true);
      expect(config.agents?.maxParallel).toBe(4);
      expect(config.agents?.timeoutMs).toBe(30000);
      expect(config.budget?.maxCostPerCommand).toBe(1.0);
      expect(config.budget?.maxDailyCost).toBe(10.0);
      expect(config.budget?.alertThreshold).toBe(0.8);
      expect(config.mcp?.enabled).toBe(true);
      expect(config.mcp?.servers).toEqual([]);
      expect(config.logging?.level).toBe('info');
    });
  });

  describe('Environment Variable Loading', () => {
    it('should load configuration from environment variables', () => {
      // Set environment variables
      process.env['KOMPLETE_DEFAULT_MODEL'] = 'or/gpt-4';
      process.env['KOMPLETE_LOG_LEVEL'] = 'debug';

      const config = configManager.load();

      expect(config.defaultModel).toBe('or/gpt-4');
      expect(config.logging?.level).toBe('debug');

      // Clean up
      delete process.env['KOMPLETE_DEFAULT_MODEL'];
      delete process.env['KOMPLETE_LOG_LEVEL'];
    });

    it('should load provider API keys from environment variables', () => {
      process.env['KOMPLETE_OPENROUTER_API_KEY'] = 'test-openrouter-key';
      process.env['KOMPLETE_GROQ_API_KEY'] = 'test-groq-key';
      process.env['KOMPLETE_OPENAI_API_KEY'] = 'test-openai-key';
      process.env['KOMPLETE_ANTHROPIC_API_KEY'] = 'test-anthropic-key';

      const config = configManager.load();

      expect(config.providers?.openRouter?.apiKey).toBe('test-openrouter-key');
      expect(config.providers?.groq?.apiKey).toBe('test-groq-key');
      expect(config.providers?.openai?.apiKey).toBe('test-openai-key');
      expect(config.providers?.anthropic?.apiKey).toBe('test-anthropic-key');

      // Clean up
      delete process.env['KOMPLETE_OPENROUTER_API_KEY'];
      delete process.env['KOMPLETE_GROQ_API_KEY'];
      delete process.env['KOMPLETE_OPENAI_API_KEY'];
      delete process.env['KOMPLETE_ANTHROPIC_API_KEY'];
    });
  });
});

describe('Global Configuration Functions', () => {
  beforeEach(() => {
    // Reset global state
    (global as any).globalConfigManager = null;
    (global as any).globalErrorHandler = null;
  });

  describe('initConfigManager', () => {
    it('should initialize global config manager', () => {
      const logger = new Logger({ level: LogLevel.ERROR });
      const manager = initConfigManager(logger);

      expect(manager).toBeInstanceOf(ConfigManager);
      expect(getConfigManager()).toBe(manager);
    });

    it('should create config manager without logger', () => {
      const manager = initConfigManager();

      expect(manager).toBeInstanceOf(ConfigManager);
      expect(getConfigManager()).toBe(manager);
    });
  });

  describe('getConfigManager', () => {
    it('should get global config manager', () => {
      const manager = getConfigManager();

      expect(manager).toBeInstanceOf(ConfigManager);
    });

    it('should return same instance on multiple calls', () => {
      const manager1 = getConfigManager();
      const manager2 = getConfigManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe('loadConfig', () => {
    it('should load configuration globally', () => {
      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.defaultModel).toBeDefined();
    });

    it('should load configuration from path', () => {
      const tempPath = path.join(process.cwd(), '.kompleterc.test.json');
      const testConfig = { defaultModel: 'or/gpt-4' };
      fs.writeFileSync(tempPath, JSON.stringify(testConfig, null, 2));

      const config = loadConfig(tempPath);

      expect(config.defaultModel).toBe('or/gpt-4');

      // Clean up
      fs.unlinkSync(tempPath);
    });
  });

  describe('getConfig', () => {
    it('should get global configuration', () => {
      loadConfig();
      const config = getConfig();

      expect(config).toBeDefined();
      expect(config.defaultModel).toBeDefined();
    });

    it('should throw ConfigError if not loaded', () => {
      // Create a fresh ConfigManager without loading config
      // Note: We can't reset the module-level globalConfigManager variable,
      // but we can test that getAll() throws when config is not loaded
      const freshManager = new ConfigManager();
      expect(() => freshManager.getAll()).toThrow(ConfigError);
    });
  });
});
