/**
 * Test suite for Cost Tracker functionality
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  CostTracker,
  initCostTracker,
  getCostTracker,
  type CostEntry,
  type CostSummary,
} from '../src/core/providers/advanced/cost-tracker';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker({
      currency: 'USD',
      budgetLimit: 100,
      dailyBudgetLimit: 10,
      enabled: true,
    });
  });

  describe('Basic Tracking', () => {
    it('should track a request', () => {
      const entry = tracker.track(
        'req-1',
        'openai',
        'gpt-4',
        1000, // input tokens
        500   // output tokens
      );

      expect(entry.requestId).toBe('req-1');
      expect(entry.provider).toBe('openai');
      expect(entry.model).toBe('gpt-4');
      expect(entry.inputTokens).toBe(1000);
      expect(entry.outputTokens).toBe(500);
      expect(entry.totalCost).toBeGreaterThan(0);
      expect(entry.currency).toBe('USD');
    });

    it('should calculate correct costs for GPT-4', () => {
      // GPT-4: $0.03/1K input, $0.06/1K output
      const entry = tracker.track('req-1', 'openai', 'gpt-4', 1000, 1000);

      // Input: 1K * $0.03 = $0.03
      // Output: 1K * $0.06 = $0.06
      // Total: $0.09
      expect(entry.inputCost).toBeCloseTo(0.03, 4);
      expect(entry.outputCost).toBeCloseTo(0.06, 4);
      expect(entry.totalCost).toBeCloseTo(0.09, 4);
    });

    it('should calculate correct costs for Claude 3.5 Sonnet', () => {
      // Claude 3.5 Sonnet: $0.003/1K input, $0.015/1K output
      const entry = tracker.track(
        'req-1',
        'anthropic',
        'claude-3-5-sonnet-20241022',
        1000,
        1000
      );

      expect(entry.inputCost).toBeCloseTo(0.003, 4);
      expect(entry.outputCost).toBeCloseTo(0.015, 4);
      expect(entry.totalCost).toBeCloseTo(0.018, 4);
    });

    it('should return zero cost for unknown/free models', () => {
      // Ollama models are free (local)
      const entry = tracker.track('req-1', 'ollama', 'llama3', 1000, 1000);

      expect(entry.inputCost).toBe(0);
      expect(entry.outputCost).toBe(0);
      expect(entry.totalCost).toBe(0);
    });

    it('should include metadata', () => {
      const entry = tracker.track(
        'req-1',
        'openai',
        'gpt-4',
        100,
        50,
        { sessionId: 'session-123', userId: 'user-456' }
      );

      expect(entry.metadata).toBeDefined();
      expect(entry.metadata?.sessionId).toBe('session-123');
      expect(entry.metadata?.userId).toBe('user-456');
    });
  });

  describe('Pricing Management', () => {
    it('should get pricing for known models', () => {
      const gpt4Pricing = tracker.getPricing('gpt-4');
      expect(gpt4Pricing.inputPricePer1k).toBe(0.03);
      expect(gpt4Pricing.outputPricePer1k).toBe(0.06);
    });

    it('should handle provider prefixes', () => {
      const pricing = tracker.getPricing('oai/gpt-4o');
      expect(pricing.inputPricePer1k).toBe(0.005);
      expect(pricing.outputPricePer1k).toBe(0.015);
    });

    it('should set custom pricing', () => {
      tracker.setCustomPricing('custom-model', {
        inputPricePer1k: 0.001,
        outputPricePer1k: 0.002,
      });

      const pricing = tracker.getPricing('custom-model');
      expect(pricing.inputPricePer1k).toBe(0.001);
      expect(pricing.outputPricePer1k).toBe(0.002);
    });
  });

  describe('Totals and Summaries', () => {
    it('should track total cost', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);
      tracker.track('req-2', 'openai', 'gpt-4', 1000, 500);

      expect(tracker.getTotalCost()).toBeGreaterThan(0);
    });

    it('should get cost summary', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);
      tracker.track('req-2', 'anthropic', 'claude-3-haiku', 2000, 1000);

      const summary = tracker.getSummary();

      expect(summary.requestCount).toBe(2);
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(summary.byProvider['openai']).toBeGreaterThan(0);
      expect(summary.byProvider['anthropic']).toBeGreaterThan(0);
    });

    it('should get today summary', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);

      const summary = tracker.getTodaySummary();
      expect(summary.requestCount).toBe(1);
    });

    it('should get month summary', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);

      const summary = tracker.getMonthSummary();
      expect(summary.requestCount).toBe(1);
    });

    it('should calculate average cost per request', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);
      tracker.track('req-2', 'openai', 'gpt-4', 1000, 500);

      const summary = tracker.getSummary();
      expect(summary.avgCostPerRequest).toBe(summary.totalCost / 2);
    });
  });

  describe('Budget Management', () => {
    it('should detect budget exceeded', () => {
      // Track enough to exceed $100 budget
      for (let i = 0; i < 2000; i++) {
        tracker.track(`req-${i}`, 'openai', 'gpt-4', 1000, 1000);
      }

      expect(tracker.isBudgetExceeded()).toBe(true);
    });

    it('should detect daily budget exceeded', () => {
      // Track enough to exceed $10 daily budget
      for (let i = 0; i < 200; i++) {
        tracker.track(`req-${i}`, 'openai', 'gpt-4', 1000, 1000);
      }

      expect(tracker.isDailyBudgetExceeded()).toBe(true);
    });

    it('should get daily cost', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);

      const dailyCost = tracker.getDailyCost();
      expect(dailyCost).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should maintain history', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);
      tracker.track('req-2', 'openai', 'gpt-4', 1000, 500);

      const history = tracker.getHistory();
      expect(history).toHaveLength(2);
    });

    it('should limit history', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);
      tracker.track('req-2', 'openai', 'gpt-4', 1000, 500);
      tracker.track('req-3', 'openai', 'gpt-4', 1000, 500);

      const limitedHistory = tracker.getHistory(2);
      expect(limitedHistory).toHaveLength(2);
    });

    it('should reset tracking', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);

      tracker.reset();

      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getHistory()).toHaveLength(0);
    });
  });

  describe('Export/Import', () => {
    it('should export data', () => {
      tracker.track('req-1', 'openai', 'gpt-4', 1000, 500);

      const exported = tracker.export();

      expect(exported.config).toBeDefined();
      expect(exported.totalCost).toBeGreaterThan(0);
      expect(exported.history).toHaveLength(1);
      expect(exported.dailyCosts).toBeDefined();
    });

    it('should import data', () => {
      const data = {
        totalCost: 5.0,
        history: [{
          requestId: 'imported-1',
          provider: 'openai',
          model: 'gpt-4',
          inputTokens: 1000,
          outputTokens: 500,
          inputCost: 0.03,
          outputCost: 0.03,
          totalCost: 0.06,
          currency: 'USD',
          timestamp: new Date(),
        }],
        dailyCosts: { '2024-01-01': 0.06 },
      };

      tracker.import(data);

      expect(tracker.getTotalCost()).toBe(5.0);
      expect(tracker.getHistory()).toHaveLength(1);
    });
  });

  describe('Disabled Tracking', () => {
    it('should return zero cost when disabled', () => {
      const disabledTracker = new CostTracker({ enabled: false });

      const entry = disabledTracker.track('req-1', 'openai', 'gpt-4', 1000, 500);

      expect(entry.totalCost).toBe(0);
      expect(entry.inputCost).toBe(0);
      expect(entry.outputCost).toBe(0);
    });
  });
});

describe('Global Cost Tracker', () => {
  it('should return same instance', () => {
    const tracker1 = getCostTracker();
    const tracker2 = getCostTracker();
    expect(tracker1).toBe(tracker2);
  });

  it('should create new instance with init', () => {
    const newTracker = initCostTracker({ currency: 'EUR' });
    // Verify it's configured correctly
    const entry = newTracker.track('test', 'openai', 'gpt-4', 100, 50);
    expect(entry.currency).toBe('EUR');
  });
});
