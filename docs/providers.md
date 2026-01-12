# Provider System Documentation

## Overview

The KOMPLETE-KONTROL CLI provider system provides a unified interface for interacting with multiple LLM providers (OpenAI, Anthropic, Ollama) along with advanced features like caching, rate limiting, fallback, and cost tracking.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ProviderRegistry                         │
│  - Provider registration                                    │
│  - Unified message interface                                │
│  - Model routing                                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌─────────┐ ┌──────────┐ ┌─────────┐
│ OpenAI  │ │ Anthropic│ │  Ollama │
│Provider │ │ Provider │ │ Provider│
└────┬────┘ └────┬─────┘ └────┬────┘
     │           │            │
     └───────────┼────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Advanced Features                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Caching │ │  Rate   │ │Fallback │ │  Load   │           │
│  │         │ │ Limiter │ │         │ │Balancer │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Token   │ │  Cost   │ │Embedding│ │Persistent│          │
│  │ Counter │ │ Tracker │ │   API   │ │  Cache  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Core Providers

### OpenAI Provider

```typescript
import { getProviderRegistry } from './src/core/providers';

const registry = getProviderRegistry();

// Send message via OpenAI
const response = await registry.sendMessage({
  provider: 'openai',
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: { type: 'text', text: 'Hello!' } },
  ],
});
```

### Anthropic Provider

```typescript
const response = await registry.sendMessage({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'user', content: { type: 'text', text: 'Hello!' } },
  ],
  system: 'You are a helpful assistant.',
});
```

### Ollama Provider

```typescript
// Local models via Ollama
const response = await registry.sendMessage({
  provider: 'ollama',
  model: 'llama3',
  messages: [
    { role: 'user', content: { type: 'text', text: 'Hello!' } },
  ],
});
```

## Advanced Features

### Token Counter

Accurate token counting using tiktoken for OpenAI models.

```typescript
import { getTiktokenCounter, getProviderTokenCounter } from './src/core/providers/advanced';

// Direct tiktoken counting
const counter = getTiktokenCounter();
const result = counter.countString('Hello, world!', 'gpt-4');
console.log(result.tokens);     // Accurate count
console.log(result.encoding);   // 'cl100k_base'
console.log(result.cached);     // true/false

// Count messages
const messageTokens = counter.countMessages([
  { role: 'user', content: { type: 'text', text: 'Hello' } },
  { role: 'assistant', content: { type: 'text', text: 'Hi there!' } },
], 'gpt-4');

// Provider-aware counting
const providerCounter = getProviderTokenCounter();
const tokens = await providerCounter.countTokens(messages, 'openai', 'gpt-4');
```

#### Supported Encodings

| Model | Encoding |
|-------|----------|
| gpt-4, gpt-4-turbo | cl100k_base |
| gpt-4o, gpt-4o-mini | o200k_base |
| gpt-3.5-turbo | cl100k_base |
| claude-* | cl100k_base (approximation) |
| ollama/* | Character-based approximation |

### Embeddings API

Generate embeddings for semantic search and similarity.

```typescript
import { getEmbeddingsManager } from './src/core/providers/advanced';

const embeddings = getEmbeddingsManager();

// Configure (optional - defaults to OpenAI)
embeddings.configure({
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
});

// Single embedding
const vector = await embeddings.embedSingle('Hello, world!');
console.log(vector.length);  // 1536

// Batch embeddings
const vectors = await embeddings.embedBatch([
  'First text',
  'Second text',
  'Third text',
]);

// Similarity search
const results = await embeddings.findSimilar(
  'search query',
  ['candidate 1', 'candidate 2', 'candidate 3'],
  2  // top 2
);
// Returns: [{ index: 0, text: 'candidate 1', similarity: 0.95 }, ...]
```

#### Ollama Embeddings

```typescript
import { OllamaEmbeddings } from './src/core/providers/advanced';

const ollama = new OllamaEmbeddings({
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text',
});

const vector = await ollama.embed('Hello, world!');
```

### Persistent Cache

SQLite-backed response caching with L1 memory cache.

```typescript
import { getPersistentCache } from './src/core/providers/advanced';

const cache = getPersistentCache();

// Generate cache key
const key = cache.generateKey('openai', 'gpt-4', messages);

// Check cache
const cached = cache.get(key);
if (cached) {
  console.log('Cache hit!');
  return cached;
}

// Make API call...
const response = await provider.sendMessage(...);

// Store in cache
cache.set(key, 'openai', 'gpt-4', response);

// Get statistics
const stats = cache.getStats();
console.log(stats.hitRate);      // 0.75
console.log(stats.totalEntries); // 1500
console.log(stats.sizeBytes);    // 2048000
```

#### Cache Configuration

```typescript
import { initPersistentCache } from './src/core/providers/advanced';

const cache = initPersistentCache({
  dbPath: '.komplete-cache.db',       // SQLite database path
  ttlMs: 3600000,                      // 1 hour TTL
  maxEntries: 10000,                   // Max cached responses
  enableCompression: false,            // Compress stored data
  cleanupIntervalMs: 300000,           // Cleanup every 5 min
  enableMemoryCache: true,             // L1 memory cache
  memoryCacheMaxSize: 500,             // Memory cache size
});
```

### Cost Tracker

Track LLM costs with budget alerts.

```typescript
import { getCostTracker } from './src/core/providers/advanced';

const tracker = getCostTracker();

// Track a request
const entry = tracker.track(
  'request-123',      // Request ID
  'openai',           // Provider
  'gpt-4',            // Model
  1000,               // Input tokens
  500                 // Output tokens
);
console.log(entry.totalCost);    // $0.09
console.log(entry.inputCost);    // $0.03
console.log(entry.outputCost);   // $0.06

// Get summaries
const todaySummary = tracker.getTodaySummary();
console.log(todaySummary.totalCost);       // $5.42
console.log(todaySummary.requestCount);    // 127
console.log(todaySummary.byProvider);      // { openai: 3.5, anthropic: 1.92 }

const monthSummary = tracker.getMonthSummary();

// Budget management
if (tracker.isBudgetExceeded()) {
  console.log('Total budget exceeded!');
}
if (tracker.isDailyBudgetExceeded()) {
  console.log('Daily budget exceeded!');
}
```

#### Cost Tracker Configuration

```typescript
import { initCostTracker } from './src/core/providers/advanced';

const tracker = initCostTracker({
  currency: 'USD',
  budgetLimit: 100,          // Total budget
  dailyBudgetLimit: 10,      // Daily budget
  alertThreshold: 0.8,       // Alert at 80%
  enabled: true,
  maxHistoryEntries: 10000,
});

// Custom model pricing
tracker.setCustomPricing('custom-model', {
  inputPricePer1k: 0.001,
  outputPricePer1k: 0.002,
});
```

#### Built-in Pricing

| Model | Input/1K | Output/1K |
|-------|----------|-----------|
| gpt-4 | $0.030 | $0.060 |
| gpt-4-turbo | $0.010 | $0.030 |
| gpt-4o | $0.005 | $0.015 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-3.5-turbo | $0.0005 | $0.0015 |
| claude-3-opus | $0.015 | $0.075 |
| claude-3-sonnet | $0.003 | $0.015 |
| claude-3-haiku | $0.00025 | $0.00125 |
| ollama/* | $0.000 | $0.000 |

### Rate Limiter

Token bucket rate limiting.

```typescript
import { createRateLimiter, createRateLimitedProvider } from './src/core/providers/advanced';

const rateLimiter = createRateLimiter({
  requestsPerMinute: 60,
  tokensPerMinute: 100000,
});

// Wrap provider with rate limiting
const limitedProvider = createRateLimitedProvider(provider, rateLimiter);
```

### Fallback Manager

Automatic failover to backup providers.

```typescript
import { createProviderFallbackManager } from './src/core/providers/advanced';

const fallbackManager = createProviderFallbackManager(
  primaryProvider,      // Try this first
  [backupProvider1, backupProvider2],  // Fallbacks
  {
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
  }
);

// Uses primary, falls back automatically on failure
const response = await fallbackManager.sendMessage(request);
```

### Load Balancer

Distribute requests across providers.

```typescript
import { createProviderLoadBalancer } from './src/core/providers/advanced';

const loadBalancer = createProviderLoadBalancer(
  [provider1, provider2, provider3],
  {
    strategy: 'round-robin',  // or 'random', 'weighted'
    healthCheckIntervalMs: 30000,
  }
);
```

### Streaming

Handle streaming responses.

```typescript
import { createStreamingHandler } from './src/core/providers/advanced';

const handler = createStreamingHandler();

// Stream response
for await (const chunk of handler.stream(request)) {
  process.stdout.write(chunk.content);
}
```

## Creating Advanced Providers

Combine multiple features:

```typescript
import { createAdvancedProvider } from './src/core/providers/advanced';

const advancedProvider = createAdvancedProvider(
  [openaiProvider, anthropicProvider],
  {
    cache: {
      ttlMs: 3600000,
      maxEntries: 1000,
    },
    rateLimiter: {
      requestsPerMinute: 60,
    },
    fallback: {
      maxRetries: 3,
    },
    loadBalancer: {
      strategy: 'round-robin',
    },
  }
);

// Now has caching, rate limiting, fallback, and load balancing
const response = await advancedProvider.sendMessage(request);
```

## Provider Interface

All providers implement the `AIProvider` interface:

```typescript
interface AIProvider {
  // Provider identification
  name: string;
  id: string;

  // Core message sending
  sendMessage(request: AIRequest): Promise<AIResponse>;

  // Optional: streaming
  streamMessage?(request: AIRequest): AsyncIterable<StreamChunk>;

  // Optional: embeddings
  embed?(text: string | string[]): Promise<number[][]>;

  // Health check
  isHealthy(): Promise<boolean>;
}
```

## Environment Variables

Configure providers via environment:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
```

## Best Practices

### 1. Use Caching

Cache responses to reduce costs and latency:

```typescript
const cache = getPersistentCache();
const key = cache.generateKey(provider, model, messages);

const cached = cache.get(key);
if (cached) return cached;

const response = await provider.sendMessage(...);
cache.set(key, provider, model, response);
```

### 2. Track Costs

Monitor spending in production:

```typescript
const tracker = getCostTracker();

// After each request
tracker.track(requestId, provider, model, inputTokens, outputTokens);

// Check budgets before requests
if (tracker.isDailyBudgetExceeded()) {
  throw new Error('Daily budget exceeded');
}
```

### 3. Accurate Token Counting

Pre-check message size:

```typescript
const counter = getTiktokenCounter();
const tokens = counter.countMessages(messages, model);

if (tokens > MAX_CONTEXT_WINDOW) {
  // Truncate or summarize
}
```

### 4. Use Fallbacks

Always have backup providers:

```typescript
const fallbackManager = createProviderFallbackManager(
  primaryProvider,
  [anthropicProvider, ollamaProvider],
);
```

### 5. Rate Limiting

Prevent API throttling:

```typescript
const limiter = createRateLimiter({
  requestsPerMinute: 50,  // Stay under limits
});
```

## Debugging

Enable detailed logging:

```typescript
import { initLogger, LogLevel } from './src/utils/logger';

initLogger({ level: LogLevel.DEBUG });

// Now see provider interactions:
// - Request details
// - Response times
// - Cache hits/misses
// - Token counts
// - Cost calculations
```
