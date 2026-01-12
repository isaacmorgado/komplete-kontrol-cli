/**
 * Tests for MCP Result Handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResultHandler, type ErrorPattern } from '../src/mcp/result-handler';
import { Logger } from '../src/utils/logger';
import type { ToolExecutionResult } from '../src/mcp/agent-executor';

describe('ResultHandler', () => {
  let resultHandler: ResultHandler;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    resultHandler = new ResultHandler(
      {
        extractContent: true,
        formatAsString: false,
        includeMetadata: false,
        sanitize: true,
        maxStringLength: 1000,
      },
      {
        retryOnError: true,
        maxRetries: 3,
        retryDelayMs: 100,
        throwOnError: false,
        logErrors: true,
      },
      mockLogger
    );
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const handler = new ResultHandler();
      expect(handler).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const handler = new ResultHandler(
        {
          extractContent: false,
          formatAsString: true,
          includeMetadata: true,
        },
        {
          retryOnError: false,
          maxRetries: 1,
          throwOnError: true,
        },
        mockLogger
      );
      expect(handler).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ResultHandler initialized',
        'ResultHandler',
        expect.any(Object)
      );
    });
  });

  describe('result handling', () => {
    it('should handle successful result', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: { data: 'test' },
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const transformed = resultHandler.handleResult(result);

      expect(transformed).toHaveProperty('content');
      expect(transformed.content).toBeDefined();
    });

    it('should handle failed result', () => {
      const result: ToolExecutionResult = {
        success: false,
        error: { message: 'Tool execution failed' },
        content: null,
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const transformed = resultHandler.handleResult(result);

      expect(transformed).toHaveProperty('content');
      expect(transformed.content).toHaveProperty('isError', true);
    });

    it('should extract content from result', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: 'raw content',
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const transformed = resultHandler.handleResult(result, {
        extractContent: true,
      });

      expect(transformed.content).toHaveProperty('text', 'raw content');
    });

    it('should format result as string', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: { data: 'test' },
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const transformed = resultHandler.handleResult(result, {
        formatAsString: true,
      });

      expect(typeof transformed.content).toBe('string');
      expect(transformed.content).toContain('data');
    });

    it('should include metadata', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: 'test',
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const transformed = resultHandler.handleResult(result, {
        includeMetadata: true,
      });

      expect(transformed).toHaveProperty('metadata');
      expect(transformed.metadata).toHaveProperty('serverId', 'test-server');
      expect(transformed.metadata).toHaveProperty('toolName', 'test-tool');
      expect(transformed.metadata).toHaveProperty('durationMs', 100);
      expect(transformed.metadata).toHaveProperty('attempts', 1);
      expect(transformed.metadata).toHaveProperty('success', true);
    });

    it('should sanitize content', () => {
      const longString = 'a'.repeat(2000);
      const result: ToolExecutionResult = {
        success: true,
        content: longString,
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const transformed = resultHandler.handleResult(result, {
        sanitize: true,
        maxStringLength: 100,
      });

      expect(typeof transformed.content).toBe('string');
      expect((transformed.content as string).length).toBeLessThanOrEqual(104); // 100 + '... [truncated]'
    });
  });

  describe('content extraction', () => {
    it('should extract string content', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: 'string content',
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const extracted = resultHandler['extractContent'](result);
      expect(extracted).toEqual({ text: 'string content' });
    });

    it('should extract array content', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: ['item1', 'item2', 'item3'],
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const extracted = resultHandler['extractContent'](result);
      expect(extracted).toEqual({ items: ['item1', 'item2', 'item3'], count: 3 });
    });

    it('should extract object content', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: { key: 'value', nested: { data: 'test' } },
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const extracted = resultHandler['extractContent'](result);
      expect(extracted).toEqual({ data: { key: 'value', nested: { data: 'test' } } });
    });

    it('should extract null content', () => {
      const result: ToolExecutionResult = {
        success: true,
        content: null,
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 100,
      };

      const extracted = resultHandler['extractContent'](result);
      expect(extracted).toEqual({ empty: true });
    });
  });

  describe('content sanitization', () => {
    it('should sanitize string content', () => {
      const content = '  hello  world  ';
      const sanitized = resultHandler['sanitizeContent'](content);
      expect(sanitized).toBe('  hello  world  ');
    });

    it('should truncate long strings', () => {
      const content = 'a'.repeat(2000);
      const sanitized = resultHandler['sanitizeContent'](content);
      expect(sanitized.length).toBeLessThan(2000);
      expect(sanitized).toContain('... [truncated]');
    });

    it('should sanitize array content', () => {
      const content = ['  a  ', '  b  ', '  c  '];
      const sanitized = resultHandler['sanitizeContent'](content);
      expect(sanitized).toEqual(['  a  ', '  b  ', '  c  ']);
    });

    it('should sanitize object content', () => {
      const content = { key: '  value  ' };
      const sanitized = resultHandler['sanitizeContent'](content);
      expect(sanitized).toEqual({ key: '  value  ' });
    });

    it('should handle null and undefined', () => {
      expect(resultHandler['sanitizeContent'](null)).toBeNull();
      expect(resultHandler['sanitizeContent'](undefined)).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', () => {
      const error = new Error('Tool execution timeout');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', true);
      expect(handled.suggestion).toContain('timeout');
    });

    it('should handle connection errors', () => {
      const error = new Error('Connection refused');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', true);
      expect(handled.suggestion).toContain('network');
    });

    it('should handle authentication errors', () => {
      const error = new Error('Unauthorized access');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', false);
      expect(handled.suggestion).toContain('authentication');
    });

    it('should handle not found errors', () => {
      const error = new Error('Resource not found');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', false);
      expect(handled).toHaveProperty('fallback');
      expect(handled.fallback).toEqual({ notFound: true });
    });

    it('should handle validation errors', () => {
      const error = new Error('Invalid parameter format');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', false);
      expect(handled.suggestion).toContain('input parameters');
    });

    it('should handle rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', true);
      expect(handled.suggestion).toContain('request frequency');
    });

    it('should handle server errors', () => {
      const error = new Error('Internal server error (500)');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', true);
      expect(handled.suggestion).toContain('server encountered an error');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error occurred');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', false);
      expect(handled).toHaveProperty('retry', true);
      expect(handled.errorMessage).toBe('Unknown error occurred');
    });
  });

  describe('error pattern management', () => {
    it('should add custom error pattern', () => {
      const customPattern: ErrorPattern = {
        pattern: /custom error/i,
        type: 'custom',
        retry: false,
        suggestion: 'Handle custom error',
      };

      resultHandler.addErrorPattern(customPattern);

      const error = new Error('Custom error occurred');
      const handled = resultHandler.handleError(error);

      expect(handled).toHaveProperty('handled', true);
      expect(handled).toHaveProperty('retry', false);
      expect(handled.suggestion).toBe('Handle custom error');
    });

    it('should remove error pattern by type', () => {
      const customPattern: ErrorPattern = {
        pattern: /test pattern/i,
        type: 'test',
        retry: true,
        suggestion: 'Test suggestion',
      };

      resultHandler.addErrorPattern(customPattern);
      const removed = resultHandler.removeErrorPattern('test');

      expect(removed).toBe(1);
    });

    it('should clear error patterns', () => {
      resultHandler.clearErrorPatterns();

      const stats = resultHandler.getStatistics();
      expect(stats.errorPatterns).toBeGreaterThan(0); // Should have default patterns
    });
  });

  describe('retry logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const executeFn = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          return {
            success: false,
            error: { message: 'Temporary failure' },
            content: null,
            serverId: 'test-server',
            toolName: 'test-tool',
            attempts,
            durationMs: 0,
          };
        }
        return {
          success: true,
          content: 'success',
          serverId: 'test-server',
          toolName: 'test-tool',
          attempts,
          durationMs: 100,
        };
      });

      const result = await resultHandler['handleWithRetry'](executeFn, undefined, {
        maxRetries: 2,
        retryDelayMs: 10,
      });

      expect(attempts).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should exhaust retries and return failure', async () => {
      const executeFn = vi.fn(async () => ({
        success: false,
        error: { message: 'Persistent failure' },
        content: null,
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 0,
      }));

      const result = await resultHandler['handleWithRetry'](executeFn, undefined, {
        maxRetries: 2,
        retryDelayMs: 10,
      });

      expect(result.success).toBe(false);
    });

    it('should throw on error if configured', async () => {
      const executeFn = vi.fn(async () => ({
        success: false,
        error: { message: 'Error' },
        content: null,
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 0,
      }));

      await expect(
        resultHandler['handleWithRetry'](executeFn, undefined, {
          maxRetries: 0,
          throwOnError: true,
        })
      ).rejects.toThrow();
    });

    it('should return fallback if available', async () => {
      const executeFn = vi.fn(async () => ({
        success: false,
        error: { message: 'Resource not found' },
        content: null,
        serverId: 'test-server',
        toolName: 'test-tool',
        attempts: 1,
        durationMs: 0,
      }));

      const result = await resultHandler['handleWithRetry'](executeFn, undefined, {
        maxRetries: 0,
        throwOnError: false,
      });

      expect(result.success).toBe(false);
      expect(result.content).toEqual({ notFound: true });
    });
  });

  describe('statistics', () => {
    it('should return handler statistics', () => {
      const stats = resultHandler.getStatistics();

      expect(stats).toHaveProperty('errorPatterns');
      expect(stats).toHaveProperty('resultConfig');
      expect(stats).toHaveProperty('errorConfig');

      expect(typeof stats.errorPatterns).toBe('number');
      expect(typeof stats.resultConfig).toBe('object');
      expect(typeof stats.errorConfig).toBe('object');
    });
  });
});
