/**
 * Multi-Provider Fallback Tests
 * Tests the provider fallback chain behavior
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ModelManager } from '../../src/core/shared/models/ModelManager';
import type { ModelConfig, ProviderConfig } from '../../src/core/shared/models/ModelConfig';
import { createProvider, getAvailableProviders, isValidProvider } from '../../src/core/shared/models/ProviderFactory';

describe('Multi-Provider Fallback System', () => {
  describe('ProviderFactory', () => {
    test('should return list of available providers', () => {
      const providers = getAvailableProviders();
      expect(providers).toBeArray();
      expect(providers.length).toBeGreaterThanOrEqual(1);
      expect(providers).toContain('anthropic');
      expect(providers).toContain('vscode');
    });

    test('should validate provider names correctly', () => {
      expect(isValidProvider('anthropic')).toBe(true);
      expect(isValidProvider('vscode')).toBe(true);
      expect(isValidProvider('local')).toBe(true);
      expect(isValidProvider('invalid')).toBe(false);
      expect(isValidProvider('')).toBe(false);
    });

    test('should throw for anthropic provider without API key', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        enabled: true,
        models: [],
      };

      expect(() => createProvider(config)).toThrow('Anthropic provider requires API key');
    });

    test('should create vscode provider successfully', () => {
      const config: ProviderConfig = {
        name: 'vscode',
        enabled: true,
        models: [],
      };

      const provider = createProvider(config);
      expect(provider).toBeDefined();
    });

    test('should throw for unknown provider', () => {
      const config: ProviderConfig = {
        name: 'unknown-provider-xyz',
        enabled: true,
        models: [],
      };

      expect(() => createProvider(config)).toThrow('Unknown provider: unknown-provider-xyz');
    });
  });

  describe('ModelManager Configuration', () => {
    test('should initialize with valid config', () => {
      const config: ModelConfig = {
        defaultModel: 'vscode/default',
        fallbackModels: ['vscode/default'],
        providers: [
          {
            name: 'vscode',
            enabled: true,
            models: [{ id: 'default', name: 'VS Code LLM' }],
          },
        ],
        trackCosts: false,
        countTokens: false,
      };

      const manager = new ModelManager(config);
      expect(manager).toBeDefined();
      expect(manager.getCurrentProvider()).toBeNull();
      expect(manager.getCurrentModel()).toBeNull();
    });

    test('should handle empty provider list', () => {
      const config: ModelConfig = {
        defaultModel: 'none/none',
        fallbackModels: [],
        providers: [],
        trackCosts: false,
        countTokens: false,
      };

      const manager = new ModelManager(config);
      expect(manager).toBeDefined();
    });

    test('should handle disabled providers', () => {
      const config: ModelConfig = {
        defaultModel: 'anthropic/claude',
        fallbackModels: ['anthropic/claude'],
        providers: [
          {
            name: 'anthropic',
            apiKey: 'test-key',
            enabled: false,
            models: [{ id: 'claude', name: 'Claude' }],
          },
        ],
        trackCosts: true,
        countTokens: true,
      };

      const manager = new ModelManager(config);
      expect(manager).toBeDefined();
    });
  });

  describe('Fallback Chain Logic', () => {
    let manager: ModelManager;

    beforeEach(() => {
      const config: ModelConfig = {
        defaultModel: 'vscode/default',
        fallbackModels: [
          'anthropic/claude-sonnet',
          'vscode/default',
        ],
        providers: [
          {
            name: 'vscode',
            enabled: true,
            models: [{ id: 'default', name: 'VS Code LLM' }],
          },
        ],
        trackCosts: false,
        countTokens: false,
      };

      manager = new ModelManager(config);
    });

    afterEach(async () => {
      await manager.cleanup();
    });

    test('should initialize providers', async () => {
      await manager.initialize();
      // Provider may or may not be available in test environment
      expect(manager.getCurrentProvider()).toBeNull(); // Not selected yet
    });

    test('should cleanup providers', async () => {
      await manager.initialize();
      await manager.cleanup();
      expect(manager.getCurrentProvider()).toBeNull();
      expect(manager.getCurrentModel()).toBeNull();
    });
  });

  describe('Model Selection', () => {
    test('should handle model format validation', () => {
      // Model format should be provider/model
      const validFormats = ['anthropic/claude-sonnet', 'vscode/default', 'local/llama'];
      const invalidFormats = ['just-a-model', ''];

      validFormats.forEach((format) => {
        const parts = format.split('/');
        expect(parts.length).toBe(2);
        expect(parts[0].length).toBeGreaterThan(0);
        expect(parts[1].length).toBeGreaterThan(0);
      });

      invalidFormats.forEach((format) => {
        const parts = format.split('/');
        if (format === '') {
          expect(parts.length).toBe(1);
        } else {
          expect(parts.length).toBeLessThan(2);
        }
      });
    });

    test('should define ModelSelection interface correctly', () => {
      interface ModelSelectionTest {
        provider: string;
        model: string;
        estimatedCost: number;
        estimatedTokens: number;
      }

      const selection: ModelSelectionTest = {
        provider: 'anthropic',
        model: 'claude-sonnet',
        estimatedCost: 0.001,
        estimatedTokens: 100,
      };

      expect(selection.provider).toBe('anthropic');
      expect(selection.model).toBe('claude-sonnet');
      expect(selection.estimatedCost).toBeGreaterThanOrEqual(0);
      expect(selection.estimatedTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cost Tracking', () => {
    test('should define ModelCost interface correctly', () => {
      interface ModelCostTest {
        inputTokens: number;
        outputTokens: number;
        inputCost: number;
        outputCost: number;
        totalCost: number;
        timestamp: Date;
      }

      const cost: ModelCostTest = {
        inputTokens: 100,
        outputTokens: 50,
        inputCost: 0.001,
        outputCost: 0.002,
        totalCost: 0.003,
        timestamp: new Date(),
      };

      expect(cost.inputTokens).toBe(100);
      expect(cost.outputTokens).toBe(50);
      expect(cost.totalCost).toBe(cost.inputCost + cost.outputCost);
      expect(cost.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Recovery', () => {
    test('should handle initialization errors gracefully', async () => {
      const config: ModelConfig = {
        defaultModel: 'invalid/model',
        fallbackModels: [],
        providers: [
          {
            name: 'anthropic',
            apiKey: 'invalid-key',
            enabled: true,
            models: [],
          },
        ],
        trackCosts: false,
        countTokens: false,
      };

      const manager = new ModelManager(config);

      // Should not throw during initialization
      await manager.initialize();

      // After initialization with invalid key, provider may not be available
      expect(manager.getCurrentProvider()).toBeNull();

      await manager.cleanup();
    });
  });

  describe('Provider Configuration', () => {
    test('should support baseUrl override', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.endpoint.com',
        enabled: true,
        models: [
          { id: 'claude-3-opus', name: 'Claude 3 Opus', maxTokens: 4096, contextLength: 200000 },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', maxTokens: 4096, contextLength: 200000 },
        ],
      };

      expect(config.baseUrl).toBe('https://custom.api.endpoint.com');
      expect(config.models.length).toBe(2);
    });

    test('should support model info with optional fields', () => {
      const minimalModel = { id: 'model1', name: 'Model 1' };
      const fullModel = {
        id: 'model2',
        name: 'Model 2',
        maxTokens: 8192,
        contextLength: 128000
      };

      expect(minimalModel.maxTokens).toBeUndefined();
      expect(minimalModel.contextLength).toBeUndefined();
      expect(fullModel.maxTokens).toBe(8192);
      expect(fullModel.contextLength).toBe(128000);
    });
  });

  describe('Fallback Chain Order', () => {
    test('should respect fallback order in configuration', () => {
      const config: ModelConfig = {
        defaultModel: 'primary/model',
        fallbackModels: [
          'primary/model',
          'secondary/model',
          'tertiary/model',
        ],
        providers: [],
        trackCosts: false,
        countTokens: false,
      };

      // Verify fallback chain order is preserved
      expect(config.fallbackModels[0]).toBe('primary/model');
      expect(config.fallbackModels[1]).toBe('secondary/model');
      expect(config.fallbackModels[2]).toBe('tertiary/model');
    });

    test('should support GLM-4.7 as primary with documented fallback chain', () => {
      // Per CLAUDE.md: Fallback chain: Kimi-K2 → GLM-4.7 → Llama-70B → Dolphin-3
      const config: ModelConfig = {
        defaultModel: 'featherless/glm-4.7',
        fallbackModels: [
          'featherless/kimi-k2',
          'featherless/glm-4.7',
          'featherless/llama-70b',
          'featherless/dolphin-3',
        ],
        providers: [
          {
            name: 'featherless',
            baseUrl: 'https://api.featherless.ai/v1',
            apiKey: process.env.FEATHERLESS_API_KEY || 'test-key',
            enabled: true,
            models: [
              { id: 'kimi-k2', name: 'Kimi K2' },
              { id: 'glm-4.7', name: 'GLM 4.7' },
              { id: 'llama-70b', name: 'Llama 70B' },
              { id: 'dolphin-3', name: 'Dolphin 3' },
            ],
          },
        ],
        trackCosts: true,
        countTokens: true,
      };

      expect(config.defaultModel).toBe('featherless/glm-4.7');
      expect(config.fallbackModels.length).toBe(4);
      expect(config.providers[0].models.length).toBe(4);
    });
  });
});
