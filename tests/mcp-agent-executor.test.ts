/**
 * Tests for MCP Agent Executor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentExecutor, type ToolExecutionResult } from '../src/mcp/agent-executor';
import { Logger } from '../src/utils/logger';

describe('AgentExecutor', () => {
  let agentExecutor: AgentExecutor;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    agentExecutor = new AgentExecutor(
      {
        validateParams: true,
        transformParams: true,
        retryOnFailure: true,
        maxRetries: 3,
        retryDelayMs: 100,
        timeoutMs: 5000,
      },
      mockLogger
    );
  });

  afterEach(async () => {
    await agentExecutor.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const executor = new AgentExecutor();
      expect(executor).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const executor = new AgentExecutor(
        {
          validateParams: false,
          transformParams: false,
          retryOnFailure: false,
          maxRetries: 1,
          retryDelayMs: 500,
          timeoutMs: 10000,
        },
        mockLogger
      );
      expect(executor).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AgentExecutor initialized',
        'AgentExecutor',
        expect.any(Object)
      );
    });
  });

  describe('parameter validation', () => {
    it('should validate required parameters', () => {
      const tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
      };

      const result = agentExecutor['validateParameters'](tool, {
        path: '/test/file.txt',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required parameter: content');
    });

    it('should validate parameter types', () => {
      const tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            enabled: { type: 'boolean' },
          },
        },
      };

      const result = agentExecutor['validateParameters'](tool, {
        count: 'not a number',
        enabled: 'not a boolean',
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate enum values', () => {
      const tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['read', 'write', 'append'] },
          },
        },
      };

      const result = agentExecutor['validateParameters'](tool, {
        mode: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('invalid value'))).toBe(true);
    });

    it('should pass validation for valid parameters', () => {
      const tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
        },
      };

      const result = agentExecutor['validateParameters'](tool, {
        path: '/test/file.txt',
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('parameter transformation', () => {
    it('should transform string parameters with _str suffix', () => {
      const result = agentExecutor['transformParameters']({
        name_str: '  hello world  ',
      });

      expect(result.params.name_str).toBe('hello world');
    });

    it('should transform number parameters with _num suffix', () => {
      const result = agentExecutor['transformParameters']({
        count_num: '42',
      });

      expect(result.params.count_num).toBe(42);
    });

    it('should transform boolean parameters with _bool suffix', () => {
      const result = agentExecutor['transformParameters']({
        enabled_bool: 'true',
        disabled_bool: 'false',
      });

      expect(result.params.enabled_bool).toBe(true);
      expect(result.params.disabled_bool).toBe(false);
    });

    it('should transform list parameters with _list suffix', () => {
      const result = agentExecutor['transformParameters']({
        items_list: 'a,b,c',
      });

      expect(result.params.items_list).toEqual(['a', 'b', 'c']);
    });

    it('should handle multiple transformations', () => {
      const result = agentExecutor['transformParameters']({
        name_str: '  test  ',
        count_num: '10',
        enabled_bool: 'yes',
      });

      expect(result.params.name_str).toBe('test');
      expect(result.params.count_num).toBe(10);
      expect(result.params.enabled_bool).toBe(true);
    });
  });

  describe('type validation', () => {
    it('should validate string type', () => {
      const result = agentExecutor['validateType']('hello', 'string');
      expect(result.valid).toBe(true);
      expect(result.actualType).toBe('string');
    });

    it('should validate number type', () => {
      const result = agentExecutor['validateType'](42, 'number');
      expect(result.valid).toBe(true);
      expect(result.actualType).toBe('number');
    });

    it('should validate boolean type', () => {
      const result = agentExecutor['validateType'](true, 'boolean');
      expect(result.valid).toBe(true);
      expect(result.actualType).toBe('boolean');
    });

    it('should validate array type', () => {
      const result = agentExecutor['validateType']([1, 2, 3], 'array');
      expect(result.valid).toBe(true);
      expect(result.actualType).toBe('array');
    });

    it('should validate object type', () => {
      const result = agentExecutor['validateType']({ key: 'value' }, 'object');
      expect(result.valid).toBe(true);
      expect(result.actualType).toBe('object');
    });

    it('should reject invalid type', () => {
      const result = agentExecutor['validateType']('hello', 'number');
      expect(result.valid).toBe(false);
      expect(result.actualType).toBe('string');
    });
  });

  describe('custom transformation rules', () => {
    it('should add custom transformation rule', () => {
      const customRule = vi.fn((value: unknown) => {
        if (typeof value === 'string') {
          return value.toUpperCase();
        }
        return value;
      });

      agentExecutor.addTransformationRule(/custom_/, customRule);

      const result = agentExecutor['transformParameters']({
        custom_field: 'hello',
      });

      expect(customRule).toHaveBeenCalledWith('hello');
      expect(result.params.custom_field).toBe('HELLO');
    });

    it('should clear transformation rules', () => {
      agentExecutor.clearTransformationRules();

      const result = agentExecutor['transformParameters']({
        name_str: '  hello  ',
      });

      // Should still have default transformations
      expect(result.params.name_str).toBe('hello');
    });
  });

  describe('statistics', () => {
    it('should return executor statistics', () => {
      const stats = agentExecutor.getStatistics();

      expect(stats).toHaveProperty('activeClients');
      expect(stats).toHaveProperty('transformationRules');
      expect(stats).toHaveProperty('config');

      expect(typeof stats.activeClients).toBe('number');
      expect(typeof stats.transformationRules).toBe('number');
      expect(typeof stats.config).toBe('object');
    });

    it('should track transformation rules count', () => {
      const initialStats = agentExecutor.getStatistics();
      const initialCount = initialStats.transformationRules;

      agentExecutor.addTransformationRule(/test_/, (v) => v);

      const updatedStats = agentExecutor.getStatistics();
      expect(updatedStats.transformationRules).toBe(initialCount + 1);
    });
  });

  describe('cleanup', () => {
    it('should disconnect all clients', async () => {
      await agentExecutor.disconnect();
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});

describe('AgentExecutor Timeout Handling', () => {
  it('should handle timeout during tool execution', async () => {
    const executor = new AgentExecutor(
      {
        timeoutMs: 100,
      },
      new Logger()
    );

    // Mock client that never responds
    const mockClient = {
      isConnected: () => true,
      callTool: vi.fn(() => new Promise(() => {})), // Never resolves
    };

    executor['clients'].set('test-server', mockClient as any);

    await expect(
      executor.executeTool('test-server', 'timeout-tool', {})
    ).rejects.toThrow('Tool execution timeout');
  });
});

describe('AgentExecutor Retry Logic', () => {
  it('should retry on failure', async () => {
    const executor = new AgentExecutor(
      {
        maxRetries: 2,
        retryDelayMs: 10,
      },
      new Logger()
    );

    let attempts = 0;
    const mockClient = {
      isConnected: () => true,
      callTool: vi.fn(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return { success: true, content: 'result' };
      }),
    };

    executor['clients'].set('test-server', mockClient as any);

    const result = await executor.executeTool('test-server', 'test-tool', {});

    expect(attempts).toBe(2);
    expect(mockClient.callTool).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it('should exhaust retries and throw', async () => {
    const executor = new AgentExecutor(
      {
        maxRetries: 2,
        retryDelayMs: 10,
      },
      new Logger()
    );

    const mockClient = {
      isConnected: () => true,
      callTool: vi.fn(() => {
        throw new Error('Persistent failure');
      }),
    };

    executor['clients'].set('test-server', mockClient as any);

    await expect(
      executor.executeTool('test-server', 'test-tool', {})
    ).rejects.toThrow();
  });
});
