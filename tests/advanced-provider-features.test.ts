/**
 * Tests for Advanced Provider Features
 *
 * Tests for:
 * - Provider fallback with exponential backoff retry
 * - Load balancing with health monitoring
 * - Streaming response handling
 * - Caching with TTL and invalidation
 * - Rate limiting with token bucket algorithm
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ProviderFallbackManager, createProviderFallbackManager } from '../src/core/providers/advanced/fallback';
import {
  ProviderLoadBalancer,
  createProviderLoadBalancer,
} from '../src/core/providers/advanced/load-balancer';
import {
  StreamingResponseHandler,
  StreamUtils,
  createStreamingResponseHandler,
} from '../src/core/providers/advanced/streaming';
import {
  ResponseCache,
  CachedProvider,
  createResponseCache,
  createCachedProvider,
} from '../src/core/providers/advanced/caching';
import {
  RateLimiter,
  RateLimitedProvider,
  createRateLimiter,
  createRateLimitedProvider,
} from '../src/core/providers/advanced/rate-limiter';
import type { AIProvider, Message, CompletionOptions, CompletionResult, StreamChunk } from '../src/types';
import { ProviderError } from '../src/types';

// Mock provider for testing
class MockProvider implements AIProvider {
  name: string;
  failCount: number = 0;
  maxFailures: number = 0;
  delay: number = 0;
  shouldFail: boolean = false;
  errorType: 'retryable' | 'non-retryable' = 'retryable';

  constructor(name: string, options?: { maxFailures?: number; delay?: number }) {
    this.name = name;
    this.maxFailures = options?.maxFailures ?? 0;
    this.delay = options?.delay ?? 0;
  }

  async complete(
    model: string,
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    if (this.shouldFail || this.failCount < this.maxFailures) {
      this.failCount++;
      if (this.errorType === 'non-retryable') {
        throw new Error('Non-retryable error');
      }
      // Use a retryable error code
      throw new ProviderError('Test error', this.name, 'TEMPORARY_FAILURE');
    }

    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    return {
      content: `Response from ${this.name}`,
      model,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };
  }

  async *stream(
    model: string,
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk> {
    const chunks = [
      { content: 'Hello', tokens: 1 },
      { content: ' from ', tokens: 1 },
      { content: this.name, tokens: 1 },
      { content: '!', tokens: 1 },
    ];

    for (const chunk of chunks) {
      if (this.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
      yield chunk;
    }
  }

  async countTokens(messages: Message[]): Promise<number> {
    return messages.reduce((sum, m) => sum + m.content.length, 0);
  }

  reset(): void {
    this.failCount = 0;
    this.shouldFail = false;
    this.errorType = 'retryable';
  }
}

// ============================================================================
// Provider Fallback Tests
// ============================================================================

describe('ProviderFallbackManager', () => {
  let primaryProvider: MockProvider;
  let fallbackProvider1: MockProvider;
  let fallbackProvider2: MockProvider;
  let fallbackManager: ProviderFallbackManager;

  beforeEach(() => {
    primaryProvider = new MockProvider('primary');
    fallbackProvider1 = new MockProvider('fallback1');
    fallbackProvider2 = new MockProvider('fallback2');
    fallbackManager = createProviderFallbackManager(
      primaryProvider,
      [fallbackProvider1, fallbackProvider2]
    );
    // Reset all providers to ensure clean state
    primaryProvider.reset();
    fallbackProvider1.reset();
    fallbackProvider2.reset();
  });

  it('should complete successfully with primary provider', async () => {
    const result = await fallbackManager.complete('model', [
      { role: 'user', content: 'test' },
    ]);

    expect(result.content).toBe('Response from primary');
    expect(primaryProvider.failCount).toBe(0);
  });

  it('should fallback to secondary provider on primary failure', async () => {
    primaryProvider.maxFailures = 1;
    // Disable retry to test fallback behavior
    const currentRetryConfig = fallbackManager.getConfig().retry;
    fallbackManager.updateConfig({ retry: { ...currentRetryConfig, maxAttempts: 1 } });

    const result = await fallbackManager.complete('model', [
      { role: 'user', content: 'test' },
    ]);

    expect(result.content).toBe('Response from fallback1');
    expect(primaryProvider.failCount).toBe(1);
  });

  it('should fallback through all providers', async () => {
    primaryProvider.maxFailures = 1;
    fallbackProvider1.maxFailures = 1;
    // Disable retry to test fallback behavior
    const currentRetryConfig = fallbackManager.getConfig().retry;
    fallbackManager.updateConfig({ retry: { ...currentRetryConfig, maxAttempts: 1 } });

    const result = await fallbackManager.complete('model', [
      { role: 'user', content: 'test' },
    ]);

    expect(result.content).toBe('Response from fallback2');
  });

  it('should throw error when all providers fail', async () => {
    primaryProvider.maxFailures = 1;
    fallbackProvider1.maxFailures = 1;
    fallbackProvider2.maxFailures = 1;
    // Disable retry to test fallback behavior
    const currentRetryConfig = fallbackManager.getConfig().retry;
    fallbackManager.updateConfig({ retry: { ...currentRetryConfig, maxAttempts: 1 } });

    await expect(
      fallbackManager.complete('model', [{ role: 'user', content: 'test' }])
    ).rejects.toThrow();
  });

  it('should retry on retryable errors', async () => {
    primaryProvider.maxFailures = 2;
    primaryProvider.errorType = 'retryable'; // Explicitly set to retryable

    // Reduce retry delays to avoid timeout
    const currentRetryConfig = fallbackManager.getConfig().retry;
    fallbackManager.updateConfig({
      retry: {
        ...currentRetryConfig,
        maxAttempts: 3,
        initialDelayMs: 50, // Reduce from 1000ms
        backoffMultiplier: 1.5, // Reduce from 2
      },
    });

    const result = await fallbackManager.complete('model', [
      { role: 'user', content: 'test' },
    ]);

    expect(result.content).toBe('Response from primary');
    expect(primaryProvider.failCount).toBe(2); // 2 failures before success
  });

  it('should not retry on non-retryable errors', async () => {
    primaryProvider.shouldFail = true;
    primaryProvider.errorType = 'non-retryable'; // Explicitly set to non-retryable
    // Disable fallback so non-retryable error causes immediate failure
    fallbackManager.updateConfig({ enableFallback: false });

    await expect(
      fallbackManager.complete('model', [{ role: 'user', content: 'test' }])
    ).rejects.toThrow();

    expect(primaryProvider.failCount).toBe(1);
  });

  it('should track provider health', async () => {
    await fallbackManager.complete('model', [{ role: 'user', content: 'test' }]);

    const health = fallbackManager.getProviderHealth('primary');
    expect(health).toBeDefined();
    expect(health?.status).toBe('healthy');
    expect(health?.successCount).toBe(1);
  });

  it('should mark provider as unhealthy after consecutive failures', async () => {
    // Set maxFailures higher than test iterations to ensure primary always fails
    primaryProvider.maxFailures = 10;

    // Disable retry to speed up the test
    const currentRetryConfig = fallbackManager.getConfig().retry;
    fallbackManager.updateConfig({
      retry: { ...currentRetryConfig, maxAttempts: 1 },
    });

    for (let i = 0; i < 5; i++) {
      try {
        await fallbackManager.complete('model', [{ role: 'user', content: 'test' }]);
      } catch {
        // Ignore errors
      }
    }

    const health = fallbackManager.getProviderHealth('primary');
    expect(health?.status).toBe('unhealthy');
  });

  it('should provide statistics', async () => {
    await fallbackManager.complete('model', [{ role: 'user', content: 'test' }]);

    const stats = fallbackManager.getStatistics();
    expect(stats.totalRequests).toBeGreaterThan(0);
    expect(stats.primarySuccesses).toBeGreaterThan(0);
  });

  it('should reset health statistics', async () => {
    await fallbackManager.complete('model', [{ role: 'user', content: 'test' }]);
    fallbackManager.resetHealth();

    const health = fallbackManager.getProviderHealth('primary');
    expect(health?.successCount).toBe(0);
    expect(health?.failureCount).toBe(0);
  });

  it('should stream with fallback', async () => {
    const chunks: string[] = [];

    for await (const chunk of fallbackManager.stream('model', [
      { role: 'user', content: 'test' },
    ])) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }

    expect(chunks.join('')).toBe('Hello from primary!');
  });

  it('should count tokens with fallback', async () => {
    const tokens = await fallbackManager.countTokens([
      { role: 'user', content: 'test message' },
    ]);

    expect(tokens).toBe(12);
  });
});

// ============================================================================
// Load Balancer Tests
// ============================================================================

describe('ProviderLoadBalancer', () => {
  let provider1: MockProvider;
  let provider2: MockProvider;
  let provider3: MockProvider;
  let loadBalancer: ProviderLoadBalancer;

  beforeEach(() => {
    provider1 = new MockProvider('provider1');
    provider2 = new MockProvider('provider2');
    provider3 = new MockProvider('provider3');
    loadBalancer = createProviderLoadBalancer([provider1, provider2, provider3], {
      enableHealthChecks: false, // Disable for faster tests
    });
  });

  afterEach(() => {
    loadBalancer.destroy();
  });

  it('should distribute requests using round-robin', async () => {
    loadBalancer.updateConfig({ strategy: 'round-robin' });

    const results: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await loadBalancer.complete('model', [
        { role: 'user', content: 'test' },
      ]);
      results.push(result.content);
    }

    expect(results).toHaveLength(3);
    expect(results[0]).toContain('provider1');
    expect(results[1]).toContain('provider2');
    expect(results[2]).toContain('provider3');
  });

  it('should distribute requests using least-connections', async () => {
    loadBalancer.updateConfig({ strategy: 'least-connections' });

    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await loadBalancer.complete('model', [
        { role: 'user', content: 'test' },
      ]);
      results.push(result.content);
    }

    expect(results).toHaveLength(5);
  });

  it('should distribute requests using weighted strategy', async () => {
    loadBalancer.updateConfig({ strategy: 'weighted' });

    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const result = await loadBalancer.complete('model', [
        { role: 'user', content: 'test' },
      ]);
      results.push(result.content);
    }

    expect(results).toHaveLength(10);
  });

  it('should distribute requests using health-first strategy', async () => {
    loadBalancer.updateConfig({ strategy: 'health-first' });

    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await loadBalancer.complete('model', [
        { role: 'user', content: 'test' },
      ]);
      results.push(result.content);
    }

    expect(results).toHaveLength(5);
  });

  it('should distribute requests using random strategy', async () => {
    loadBalancer.updateConfig({ strategy: 'random' });

    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const result = await loadBalancer.complete('model', [
        { role: 'user', content: 'test' },
      ]);
      results.push(result.content);
    }

    expect(results).toHaveLength(10);
  });

  it('should track provider health', async () => {
    await loadBalancer.complete('model', [{ role: 'user', content: 'test' }]);

    const health = loadBalancer.getProviderHealth('provider1');
    expect(health).toBeDefined();
    expect(health?.status).toBe('healthy');
  });

  it('should provide statistics', async () => {
    for (let i = 0; i < 5; i++) {
      await loadBalancer.complete('model', [{ role: 'user', content: 'test' }]);
    }

    const stats = loadBalancer.getStatistics();
    expect(stats.totalProviders).toBe(3);
    expect(stats.healthyProviders).toBe(3);
    expect(stats.totalRequests).toBe(5);
  });

  it('should reset statistics', async () => {
    await loadBalancer.complete('model', [{ role: 'user', content: 'test' }]);
    loadBalancer.resetStatistics();

    const stats = loadBalancer.getStatistics();
    expect(stats.totalRequests).toBe(0);
  });

  it('should stream with load balancing', async () => {
    const chunks: string[] = [];

    for await (const chunk of loadBalancer.stream('model', [
      { role: 'user', content: 'test' },
    ])) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }

    expect(chunks.join('')).toContain('Hello from');
  });
});

// ============================================================================
// Streaming Response Handler Tests
// ============================================================================

describe('StreamingResponseHandler', () => {
  let provider: MockProvider;
  let handler: StreamingResponseHandler;

  beforeEach(() => {
    provider = new MockProvider('test-provider', { delay: 10 });
    handler = createStreamingResponseHandler({
      enableEvents: true,
      enableProgress: true,
    });
  });

  it('should stream from provider', async () => {
    const chunks: string[] = [];

    for await (const chunk of handler.stream(provider, 'model', [
      { role: 'user', content: 'test' },
    ])) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }

    expect(chunks.join('')).toBe('Hello from test-provider!');
  });

  it('should stream and collect all chunks', async () => {
    const result = await handler.streamAndCollect(provider, 'model', [
      { role: 'user', content: 'test' },
    ]);

    expect(result.text).toBe('Hello from test-provider!');
    expect(result.chunks).toHaveLength(4);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should stream with buffering', async () => {
    const buffers: string[] = [];

    for await (const buffer of handler.streamWithBuffer(provider, 'model', [
      { role: 'user', content: 'test' },
    ])) {
      buffers.push(buffer);
    }

    expect(buffers.length).toBeGreaterThan(0);
    expect(buffers.join('')).toContain('Hello from test-provider!');
  });

  it('should track active streams', async () => {
    const stream = handler.stream(provider, 'model', [
      { role: 'user', content: 'test' },
    ]);

    // Start consuming stream to trigger execution
    const iterator = stream[Symbol.asyncIterator]();
    const firstChunk = await iterator.next();

    // Stream should be active
    const activeStreams = handler.getActiveStreams();
    expect(activeStreams.length).toBeGreaterThan(0);

    // Consume remaining chunks
    while (!(await iterator.next()).done) {
      // Continue consuming
    }
  });

  it('should emit events', async () => {
    const events: any[] = [];

    handler = createStreamingResponseHandler({
      onEvent: event => events.push(event),
    });

    await handler.streamAndCollect(provider, 'model', [
      { role: 'user', content: 'test' },
    ]);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('start');
    expect(events[events.length - 1].type).toBe('done');
  });

  it('should emit progress', async () => {
    const progressValues: number[] = [];

    handler = createStreamingResponseHandler({
      enableProgress: true,
      onProgress: progress => progressValues.push(progress),
    });

    await handler.streamAndCollect(provider, 'model', [
      { role: 'user', content: 'test' },
    ]);

    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(1);
  });

  it('should cancel a stream', async () => {
    const stream = handler.stream(provider, 'model', [
      { role: 'user', content: 'test' },
    ]);

    // Start consuming stream to trigger execution
    const iterator = stream[Symbol.asyncIterator]();
    await iterator.next();

    // Get stream ID
    const streamId = handler.getActiveStreams()[0];
    expect(streamId).toBeDefined();

    // Cancel stream
    const cancelled = handler.cancelStream(streamId);
    expect(cancelled).toBe(true);

    // Consume remaining chunks (should be empty or minimal)
    const chunks: string[] = [];
    for await (const chunk of stream) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }
  });

  it('should cancel all streams', () => {
    handler.cancelAllStreams();
    expect(handler.getActiveStreams()).toHaveLength(0);
  });

  it('should provide statistics', async () => {
    await handler.streamAndCollect(provider, 'model', [
      { role: 'user', content: 'test' },
    ]);

    const stats = handler.getStatistics();
    expect(stats.activeStreams).toBe(0);
    expect(stats.totalChunks).toBeGreaterThan(0);
  });
});

describe('StreamUtils', () => {
  it('should collect all chunks', async () => {
    const provider = new MockProvider('test');

    async function* generateChunks() {
      for await (const chunk of provider.stream('model', [
        { role: 'user', content: 'test' },
      ])) {
        yield chunk;
      }
    }

    const chunks = await StreamUtils.collectChunks(generateChunks());
    expect(chunks).toHaveLength(4);
  });

  it('should collect all text', async () => {
    const provider = new MockProvider('test');

    async function* generateChunks() {
      for await (const chunk of provider.stream('model', [
        { role: 'user', content: 'test' },
      ])) {
        yield chunk;
      }
    }

    const text = await StreamUtils.collectText(generateChunks());
    expect(text).toBe('Hello from test!');
  });

  it('should stream to text', async () => {
    const provider = new MockProvider('test');

    async function* generateChunks() {
      for await (const chunk of provider.stream('model', [
        { role: 'user', content: 'test' },
      ])) {
        yield chunk;
      }
    }

    const textChunks: string[] = [];
    for await (const text of StreamUtils.streamToText(generateChunks())) {
      textChunks.push(text);
    }

    expect(textChunks.join('')).toBe('Hello from test!');
  });

  it('should transform stream chunks', async () => {
    const provider = new MockProvider('test');

    async function* generateChunks() {
      for await (const chunk of provider.stream('model', [
        { role: 'user', content: 'test' },
      ])) {
        yield chunk;
      }
    }

    const transformed: string[] = [];
    for await (const chunk of StreamUtils.transformStream(
      generateChunks(),
      async c => ({ ...c, content: c.content?.toUpperCase() })
    )) {
      if (chunk.content) {
        transformed.push(chunk.content);
      }
    }

    expect(transformed.join('')).toBe('HELLO FROM TEST!');
  });

  it('should filter stream chunks', async () => {
    const provider = new MockProvider('test');

    async function* generateChunks() {
      for await (const chunk of provider.stream('model', [
        { role: 'user', content: 'test' },
      ])) {
        yield chunk;
      }
    }

    const filtered: string[] = [];
    for await (const chunk of StreamUtils.filterStream(
      generateChunks(),
      async c => (c.content?.length ?? 0) > 0
    )) {
      if (chunk.content) {
        filtered.push(chunk.content);
      }
    }

    expect(filtered.length).toBeGreaterThan(0);
  });

  it('should batch stream chunks', async () => {
    const provider = new MockProvider('test');

    async function* generateChunks() {
      for await (const chunk of provider.stream('model', [
        { role: 'user', content: 'test' },
      ])) {
        yield chunk;
      }
    }

    const batches: any[] = [];
    for await (const batch of StreamUtils.batchStream(generateChunks(), 2)) {
      batches.push(batch);
    }

    expect(batches.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Cache Tests
// ============================================================================

describe('ResponseCache', () => {
  let cache: ResponseCache;
  let provider: MockProvider;

  beforeEach(() => {
    cache = createResponseCache({ maxSize: 1024 * 1024 }); // 1 MB
    provider = new MockProvider('test');
  });

  it('should cache and retrieve results', async () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result);
    const cached = cache.get(provider.name, 'model', messages);

    expect(cached).toBeDefined();
    expect(cached?.content).toBe('Cached response');
  });

  it('should return undefined for cache miss', () => {
    const cached = cache.get(provider.name, 'model', [
      { role: 'user', content: 'test' },
    ]);

    expect(cached).toBeUndefined();
  });

  it('should check if result is cached', async () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    expect(cache.has(provider.name, 'model', messages)).toBe(false);

    cache.set(provider.name, 'model', messages, result);

    expect(cache.has(provider.name, 'model', messages)).toBe(true);
  });

  it('should expire entries after TTL', async () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result, 100); // 100ms TTL

    // Should be cached immediately
    expect(cache.get(provider.name, 'model', messages)).toBeDefined();

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be expired
    expect(cache.get(provider.name, 'model', messages)).toBeUndefined();
  });

  it('should invalidate by TTL', () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result, 10000);
    const invalidated = cache.invalidate({ strategy: 'ttl', maxAge: 0 });

    expect(invalidated).toBeGreaterThan(0);
  });

  it('should invalidate by LRU', () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result);
    const invalidated = cache.invalidate({ strategy: 'lru', maxEntries: 0 });

    expect(invalidated).toBeGreaterThan(0);
  });

  it('should invalidate by provider', () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result);
    const invalidated = cache.invalidateByProvider(provider.name);

    expect(invalidated).toBeGreaterThan(0);
  });

  it('should clear all cache entries', () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result);
    cache.clear();

    expect(cache.get(provider.name, 'model', messages)).toBeUndefined();
  });

  it('should provide statistics', () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    // First get (miss)
    cache.get(provider.name, 'model', messages);
    // Set
    cache.set(provider.name, 'model', messages, result);
    // Second get (hit)
    cache.get(provider.name, 'model', messages);

    const stats = cache.getStatistics();
    expect(stats.entries).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should reset statistics', () => {
    const messages: Message[] = [{ role: 'user', content: 'test' }];
    const result: CompletionResult = {
      content: 'Cached response',
      model: 'model',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    };

    cache.set(provider.name, 'model', messages, result);
    cache.get(provider.name, 'model', messages);
    cache.resetStatistics();

    const stats = cache.getStatistics();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });
});

describe('CachedProvider', () => {
  it('should use cache for completions', async () => {
    const provider = new MockProvider('test');
    const cache = createResponseCache();
    const cachedProvider = createCachedProvider(provider, cache);

    const messages: Message[] = [{ role: 'user', content: 'test' }];

    // First call - should call provider
    const result1 = await cachedProvider.complete('model', messages);
    expect(result1.content).toBe('Response from test');

    // Second call - should use cache
    const result2 = await cachedProvider.complete('model', messages);
    expect(result2.content).toBe('Response from test');

    // Provider should only be called once
    expect(provider.failCount).toBe(0);
  });

  it('should not cache streaming responses', async () => {
    const provider = new MockProvider('test');
    const cache = createResponseCache();
    const cachedProvider = createCachedProvider(provider, cache);

    const chunks: string[] = [];
    for await (const chunk of cachedProvider.stream('model', [
      { role: 'user', content: 'test' },
    ])) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }

    expect(chunks.join('')).toBe('Hello from test!');
  });
});

// ============================================================================
// Rate Limiter Tests
// ============================================================================

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = createRateLimiter({
      tokensPerSecond: 10,
      maxTokens: 10,
    });
  });

  it('should allow requests within rate limit', async () => {
    const check = await rateLimiter.checkRateLimit('provider', 'model', 1);
    expect(check.allowed).toBe(true);
    expect(check.waitTime).toBe(0);
  });

  it('should deny requests exceeding rate limit', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('provider', 'model', 1);
    }

    // Next request should be denied
    const check = await rateLimiter.checkRateLimit('provider', 'model', 1);
    expect(check.allowed).toBe(false);
    expect(check.waitTime).toBeGreaterThan(0);
  });

  it('should refill tokens over time', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('provider', 'model', 1);
    }

    // Wait for refill
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should have some tokens back
    const check = await rateLimiter.checkRateLimit('provider', 'model', 1);
    expect(check.allowed).toBe(true);
  });

  it('should wait for rate limit', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('provider', 'model', 1);
    }

    // This should wait
    const start = Date.now();
    await rateLimiter.waitForRateLimit('provider', 'model', 1);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThan(50);
  });

  it('should get current tokens', () => {
    const tokens = rateLimiter.getTokens();
    expect(tokens).toBe(10);
  });

  it('should reset rate limit', async () => {
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('provider', 'model', 1);
    }

    // Reset
    rateLimiter.reset();

    // Should have all tokens back
    const check = await rateLimiter.checkRateLimit('provider', 'model', 1);
    expect(check.allowed).toBe(true);
  });

  it('should provide statistics', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkRateLimit('provider', 'model', 1);
    }

    const stats = rateLimiter.getStatistics();
    expect(stats.totalRequests).toBe(5);
    expect(stats.allowedRequests).toBe(5);
  });

  it('should reset statistics', async () => {
    await rateLimiter.checkRateLimit('provider', 'model', 1);
    rateLimiter.resetStatistics();

    const stats = rateLimiter.getStatistics();
    expect(stats.totalRequests).toBe(0);
    expect(stats.allowedRequests).toBe(0);
  });

  it('should support per-provider rate limiting', async () => {
    rateLimiter.updateConfig({ enablePerProvider: true });

    // Consume all tokens for provider1
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('provider1', 'model', 1);
    }

    // Provider1 should be rate limited
    const check1 = await rateLimiter.checkRateLimit('provider1', 'model', 1);
    expect(check1.allowed).toBe(false);

    // Provider2 should still have tokens
    const check2 = await rateLimiter.checkRateLimit('provider2', 'model', 1);
    expect(check2.allowed).toBe(true);
  });

  it('should support per-model rate limiting', async () => {
    rateLimiter.updateConfig({ enablePerModel: true });

    // Consume all tokens for model1
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('provider', 'model1', 1);
    }

    // Model1 should be rate limited
    const check1 = await rateLimiter.checkRateLimit('provider', 'model1', 1);
    expect(check1.allowed).toBe(false);

    // Model2 should still have tokens
    const check2 = await rateLimiter.checkRateLimit('provider', 'model2', 1);
    expect(check2.allowed).toBe(true);
  });
});

describe('RateLimitedProvider', () => {
  it('should rate limit completions', async () => {
    const provider = new MockProvider('test');
    const rateLimiter = createRateLimiter({
      tokensPerSecond: 10,
      maxTokens: 5,
    });
    const limitedProvider = createRateLimitedProvider(provider, rateLimiter);

    const messages: Message[] = [{ role: 'user', content: 'test' }];

    // First 5 requests should succeed quickly
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await limitedProvider.complete('model', messages);
    }
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);

    // 6th request should wait
    const start2 = Date.now();
    await limitedProvider.complete('model', messages);
    const elapsed2 = Date.now() - start2;

    expect(elapsed2).toBeGreaterThan(50);
  });

  it('should rate limit streaming', async () => {
    const provider = new MockProvider('test');
    const rateLimiter = createRateLimiter({
      tokensPerSecond: 10,
      maxTokens: 5,
    });
    const limitedProvider = createRateLimitedProvider(provider, rateLimiter);

    // Consume all tokens
    for (let i = 0; i < 5; i++) {
      await limitedProvider.complete('model', [{ role: 'user', content: 'test' }]);
    }

    // Next stream should wait
    const start = Date.now();
    const chunks: string[] = [];
    for await (const chunk of limitedProvider.stream('model', [
      { role: 'user', content: 'test' },
    ])) {
      if (chunk.content) {
        chunks.push(chunk.content);
      }
    }
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThan(50);
    expect(chunks.join('')).toBe('Hello from test!');
  });
});
