/**
 * Test suite for Provider System functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  BaseProvider,
  OpenAIProvider,
  AnthropicProvider,
  OllamaProvider,
  ModelRouter,
  initModelRouter,
  getModelRouter,
  ProviderRegistry,
  initProviderRegistry,
  getProviderRegistry,
  initializeProviders,
} from '../src/core/providers';
import type { Message, CompletionResult, StreamChunk } from '../src/types';
import { Logger } from '../src/utils/logger';
import { ProviderError } from '../src/types';

describe('BaseProvider', () => {
  class TestProvider extends BaseProvider {
    get name(): string {
      return 'test';
    }

    get prefix(): 'test' {
      return 'test';
    }

    async complete(
      model: string,
      messages: Message[],
      options?: any
    ): Promise<CompletionResult> {
      return {
        content: 'Test response',
        model,
        stopReason: 'stop',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      };
    }

    async *stream(
      model: string,
      messages: Message[],
      options?: any
    ): AsyncGenerator<StreamChunk> {
      yield {
        content: { type: 'text', text: 'Stream' },
        delta: 'Stream',
        done: false,
      };
      yield {
        content: { type: 'text', text: ' response' },
        delta: ' response',
        done: true,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      };
    }

    async countTokens(messages: Message[]): Promise<number> {
      const text = messages.map(m => typeof m.content === 'string' ? m.content : '').join('');
      return Math.ceil(text.length / 4);
    }
  }

  it('should create base provider', () => {
    const provider = new TestProvider({ name: 'test' });
    expect(provider).toBeDefined();
    expect(provider.name).toBe('test');
  });

  it('should handle chat request', async () => {
    const provider = new TestProvider({ name: 'test' });
    const response = await provider.complete(
      'test-model',
      [{ role: 'user', content: 'Hello' }]
    );

    expect(response).toBeDefined();
    expect(response.content).toBe('Test response');
  });

  it('should handle stream request', async () => {
    const provider = new TestProvider({ name: 'test' });
    const stream = provider.stream(
      'test-model',
      [{ role: 'user', content: 'Hello' }]
    );

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toEqual({ type: 'text', text: 'Stream' });
    expect(chunks[1].content).toEqual({ type: 'text', text: ' response' });
  });

  it('should count tokens', async () => {
    const provider = new TestProvider({ name: 'test' });
    const count = await provider.countTokens([{ role: 'user', content: 'Hello, world!' }]);

    expect(count).toBeGreaterThan(0);
  });

  it('should get capabilities', () => {
    const provider = new TestProvider({ name: 'test' });
    const capabilities = provider.getCapabilities();

    expect(capabilities).toBeDefined();
    expect(capabilities.streaming).toBe(false);
    expect(capabilities.tools).toBe(false);
    expect(capabilities.vision).toBe(false);
  });

  it('should get default model', () => {
    const provider = new TestProvider({ name: 'test', defaultModel: 'test-model' });
    expect(provider.getDefaultModel()).toBe('test-model');
  });

  it('should get base URL', () => {
    const provider = new TestProvider({ name: 'test', baseUrl: 'http://example.com' });
    expect(provider.getBaseUrl()).toBe('http://example.com');
  });

  it('should get timeout', () => {
    const provider = new TestProvider({ name: 'test', timeout: 60000 });
    expect(provider.getTimeout()).toBe(60000);
  });
});

describe('OpenAI Provider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'test-key',
      defaultModel: 'gpt-4',
    });
  });

  it('should create OpenAI provider', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('OpenAI');
  });

  it('should have correct prefix', () => {
    expect(provider.prefix).toBe('oai');
  });

  it('should get default model', () => {
    expect(provider.getDefaultModel()).toBe('gpt-4');
  });

  it('should validate API key', () => {
    const validProvider = new OpenAIProvider({ apiKey: 'sk-test123' });
    expect(validProvider).toBeDefined();
  });

  it('should throw error without API key', () => {
    expect(() => new OpenAIProvider({ apiKey: '' as any })).toThrow(ProviderError);
  });

  it('should have streaming capability', () => {
    const capabilities = provider.getCapabilities();
    expect(capabilities.streaming).toBe(true);
    expect(capabilities.tools).toBe(true);
    expect(capabilities.vision).toBe(true);
  });
});

describe('Anthropic Provider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: 'test-key',
      defaultModel: 'claude-3-5-sonnet-20241022',
    });
  });

  it('should create Anthropic provider', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('Anthropic');
  });

  it('should have correct prefix', () => {
    expect(provider.prefix).toBe('anthropic');
  });

  it('should get default model', () => {
    expect(provider.getDefaultModel()).toBe('claude-3-5-sonnet-20241022');
  });

  it('should validate API key', () => {
    const validProvider = new AnthropicProvider({ apiKey: 'sk-ant-test123' });
    expect(validProvider).toBeDefined();
  });

  it('should throw error without API key', () => {
    expect(() => new AnthropicProvider({ apiKey: '' as any })).toThrow(ProviderError);
  });
});

describe('Ollama Provider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'llama3',
    });
  });

  it('should create Ollama provider', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('Ollama');
  });

  it('should have correct prefix', () => {
    expect(provider.prefix).toBe('ollama');
  });

  it('should get default model', () => {
    expect(provider.getDefaultModel()).toBe('llama3');
  });

  it('should get base URL', () => {
    expect(provider.getBaseUrl()).toBe('http://localhost:11434');
  });

  it('should work without API key', () => {
    const noKeyProvider = new OllamaProvider({ baseUrl: 'http://localhost:11434' });
    expect(noKeyProvider).toBeDefined();
  });
});

describe('Model Router', () => {
  let router: ModelRouter;
  let providerRegistry: ProviderRegistry;

  beforeEach(() => {
    providerRegistry = initProviderRegistry();
    router = initModelRouter({
      defaultModel: 'gpt-4',
    });
  });

  afterEach(() => {
    providerRegistry.clear();
  });

  it('should create model router', () => {
    expect(router).toBeDefined();
    expect(router.getConfig().defaultModel).toBe('gpt-4');
  });

  it('should parse model string with provider', () => {
    const parsed = router.parseModel('oai/gpt-4');

    expect(parsed).toBeDefined();
    expect(parsed.prefix).toBe('oai');
    expect(parsed.modelName).toBe('gpt-4');
    expect(parsed.fullModel).toBe('oai/gpt-4');
  });

  it('should parse model without provider', () => {
    const parsed = router.parseModel('gpt-4');

    expect(parsed).toBeDefined();
    expect(parsed.prefix).toBe('oai'); // default prefix
    expect(parsed.modelName).toBe('gpt-4');
    expect(parsed.fullModel).toBe('oai/gpt-4');
  });

  it('should get provider for model', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    providerRegistry.register(provider, 10);

    const retrieved = router.getProvider('oai/gpt-4');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('OpenAI');
  });

  it('should set default model', () => {
    router.setDefaultModel('claude-3-5-sonnet-20241022');
    expect(router.getConfig().defaultModel).toBe('claude-3-5-sonnet-20241022');
  });

  it('should get global model router', () => {
    const globalRouter = getModelRouter();
    expect(globalRouter).toBeDefined();
  });
});

describe('Provider Registry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = initProviderRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  it('should create provider registry', () => {
    expect(registry).toBeDefined();
  });

  it('should register provider', () => {
    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      defaultModel: 'gpt-4',
    });

    registry.register(provider, 10);

    const retrieved = registry.get('oai');
    expect(retrieved).toBeDefined();
  });

  it('should get provider by name', () => {
    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      defaultModel: 'gpt-4',
    });

    registry.register(provider, 10);

    const retrieved = registry.get('oai');
    expect(retrieved).toBe(provider);
  });

  it('should check if provider exists', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    registry.register(provider, 10);

    expect(registry.has('oai')).toBe(true);
    expect(registry.has('anthropic')).toBe(false);
  });

  it('should list all providers', () => {
    const openaiProvider = new OpenAIProvider({ apiKey: 'test1' });
    const anthropicProvider = new AnthropicProvider({ apiKey: 'test2' });

    registry.register(openaiProvider, 10);
    registry.register(anthropicProvider, 5);

    const providers = registry.list();
    expect(providers).toHaveLength(2);
  });

  it('should get all provider prefixes', () => {
    const openaiProvider = new OpenAIProvider({ apiKey: 'test1' });
    const anthropicProvider = new AnthropicProvider({ apiKey: 'test2' });

    registry.register(openaiProvider, 10);
    registry.register(anthropicProvider, 5);

    const prefixes = registry.getPrefixes();
    expect(prefixes).toContain('oai');
    expect(prefixes).toContain('anthropic');
  });

  it('should unregister provider', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' });

    registry.register(provider, 10);
    registry.unregister('oai');

    const retrieved = registry.get('oai');
    expect(retrieved).toBeUndefined();
  });

  it('should get global provider registry', () => {
    const globalRegistry = getProviderRegistry();
    expect(globalRegistry).toBeDefined();
  });

  it('should clear registry', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' });

    registry.register(provider, 10);
    registry.clear();

    const providers = registry.list();
    expect(providers).toHaveLength(0);
  });

  it('should get statistics', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    registry.register(provider, 10);

    const stats = registry.getStatistics();
    expect(stats).toBeDefined();
    expect(stats.totalProviders).toBe(1);
  });
});

describe('initializeProviders', () => {
  let providerRegistry: ProviderRegistry;

  beforeEach(() => {
    providerRegistry = initProviderRegistry();
  });

  afterEach(() => {
    providerRegistry.clear();
  });

  it('should initialize OpenAI provider with API key', async () => {
    await initializeProviders(
      {
        openai: { apiKey: 'sk-test123', defaultModel: 'gpt-4' },
      },
      new Logger()
    );

    const provider = providerRegistry.get('oai');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('OpenAI');
  });

  it('should initialize Anthropic provider with API key', async () => {
    await initializeProviders(
      {
        anthropic: { apiKey: 'sk-ant-test123', defaultModel: 'claude-3-5-sonnet-20241022' },
      },
      new Logger()
    );

    const provider = providerRegistry.get('anthropic');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('Anthropic');
  });

  it('should initialize Ollama provider with base URL', async () => {
    await initializeProviders(
      {
        ollama: { baseUrl: 'http://localhost:11434', defaultModel: 'llama3' },
      },
      new Logger()
    );

    const provider = providerRegistry.get('ollama');
    expect(provider).toBeDefined();
    expect(provider?.name).toBe('Ollama');
  });

  it('should not initialize provider without credentials', async () => {
    await initializeProviders({}, new Logger());

    const providers = providerRegistry.list();
    expect(providers).toHaveLength(0);
  });
});
