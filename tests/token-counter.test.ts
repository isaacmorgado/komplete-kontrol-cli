/**
 * Test suite for Token Counter functionality
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  TiktokenCounter,
  ProviderTokenCounter,
  initTiktokenCounter,
  getTiktokenCounter,
  initProviderTokenCounter,
  getProviderTokenCounter,
} from '../src/core/providers/advanced/token-counter';
import type { Message, TextContent } from '../src/types';

describe('TiktokenCounter', () => {
  let counter: TiktokenCounter;

  beforeEach(() => {
    counter = new TiktokenCounter({
      enableCache: true,
      cacheMaxSize: 100,
    });
  });

  describe('String Counting', () => {
    it('should count tokens in a simple string', () => {
      const result = counter.countString('Hello, world!');

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.encoding).toBe('cl100k_base');
      expect(result.cached).toBe(false);
    });

    it('should cache token counts', () => {
      const text = 'This is a test string for caching';

      const first = counter.countString(text);
      const second = counter.countString(text);

      expect(first.cached).toBe(false);
      expect(second.cached).toBe(true);
      expect(first.tokens).toBe(second.tokens);
    });

    it('should use correct encoding for different models', () => {
      const text = 'Test text';

      const gpt4Result = counter.countString(text, 'gpt-4');
      const gpt4oResult = counter.countString(text, 'gpt-4o');

      // Both should count tokens, but may use different encodings
      expect(gpt4Result.tokens).toBeGreaterThan(0);
      expect(gpt4oResult.tokens).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const result = counter.countString('');
      expect(result.tokens).toBe(0);
    });

    it('should handle unicode text', () => {
      const result = counter.countString('こんにちは世界');
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should handle code snippets', () => {
      const code = `
        function hello() {
          console.log("Hello, world!");
        }
      `;
      const result = counter.countString(code);
      expect(result.tokens).toBeGreaterThan(0);
    });
  });

  describe('Model Encoding Detection', () => {
    it('should detect cl100k_base for GPT-4', () => {
      expect(counter.getEncodingForModel('gpt-4')).toBe('cl100k_base');
      expect(counter.getEncodingForModel('gpt-4-turbo')).toBe('cl100k_base');
    });

    it('should detect o200k_base for GPT-4o', () => {
      expect(counter.getEncodingForModel('gpt-4o')).toBe('o200k_base');
      expect(counter.getEncodingForModel('gpt-4o-mini')).toBe('o200k_base');
    });

    it('should handle provider prefixes', () => {
      expect(counter.getEncodingForModel('oai/gpt-4')).toBe('cl100k_base');
      expect(counter.getEncodingForModel('oai/gpt-4o')).toBe('o200k_base');
    });

    it('should return default for unknown models', () => {
      expect(counter.getEncodingForModel('unknown-model')).toBe('cl100k_base');
    });
  });

  describe('Message Counting', () => {
    it('should count tokens in messages array', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: { type: 'text', text: 'Hello' } as TextContent,
        },
        {
          role: 'assistant',
          content: { type: 'text', text: 'Hi there!' } as TextContent,
        },
      ];

      const tokens = counter.countMessages(messages);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should include message overhead', () => {
      const shortMessage: Message[] = [
        {
          role: 'user',
          content: { type: 'text', text: 'Hi' } as TextContent,
        },
      ];

      const tokens = counter.countMessages(shortMessage);
      // Should be more than just the text due to message overhead
      expect(tokens).toBeGreaterThan(1);
    });

    it('should handle multi-content messages', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'First part' } as TextContent,
            { type: 'text', text: 'Second part' } as TextContent,
          ],
        },
      ];

      const tokens = counter.countMessages(messages);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      counter.countString('test1');
      counter.countString('test2');

      counter.clearCache();

      const stats = counter.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should report cache stats', () => {
      counter.countString('unique string 1');
      counter.countString('unique string 2');

      const stats = counter.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });
});

describe('ProviderTokenCounter', () => {
  let counter: ProviderTokenCounter;

  beforeEach(() => {
    counter = new ProviderTokenCounter();
  });

  describe('Provider-specific Counting', () => {
    it('should count tokens for OpenAI', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: { type: 'text', text: 'Hello from OpenAI test' } as TextContent,
        },
      ];

      const result = await counter.countTokens(messages, 'openai', 'gpt-4');

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.model).toBe('gpt-4');
    });

    it('should count tokens for Anthropic', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: { type: 'text', text: 'Hello from Anthropic test' } as TextContent,
        },
      ];

      const result = await counter.countTokens(messages, 'anthropic', 'claude-3');
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should approximate tokens for Ollama', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: { type: 'text', text: 'Hello from Ollama test' } as TextContent,
        },
      ];

      const result = await counter.countTokens(messages, 'ollama', 'llama3');

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.encoding).toBe('approximation');
    });
  });

  describe('Tiktoken Access', () => {
    it('should provide access to tiktoken counter', () => {
      const tiktoken = counter.getTiktokenCounter();
      expect(tiktoken).toBeInstanceOf(TiktokenCounter);
    });
  });
});

describe('Global Instances', () => {
  it('should return same TiktokenCounter instance', () => {
    const counter1 = getTiktokenCounter();
    const counter2 = getTiktokenCounter();
    expect(counter1).toBe(counter2);
  });

  it('should create new TiktokenCounter with init', () => {
    const newCounter = initTiktokenCounter({ cacheMaxSize: 50 });
    const stats = newCounter.getCacheStats();
    expect(stats.maxSize).toBe(50);
  });

  it('should return same ProviderTokenCounter instance', () => {
    const counter1 = getProviderTokenCounter();
    const counter2 = getProviderTokenCounter();
    expect(counter1).toBe(counter2);
  });
});
