/**
 * Tests for MCP Agent Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentMCPIntegration,
  type ToolMatchResult,
  type ToolMatchOptions,
} from '../src/core/agents/mcp-integration';
import { Logger } from '../src/utils/logger';
import { MCPTool } from '../src/mcp/types';

describe('AgentMCPIntegration', () => {
  let integration: AgentMCPIntegration;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    integration = new AgentMCPIntegration(
      {
        cacheTTL: 60000,
        enableCache: true,
        autoDiscover: false,
      },
      mockLogger
    );
  });

  afterEach(async () => {
    await integration.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const agentIntegration = new AgentMCPIntegration();
      expect(agentIntegration).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const agentIntegration = new AgentMCPIntegration(
        {
          cacheTTL: 120000,
          enableCache: true,
          autoDiscover: false,
        },
        mockLogger
      );
      expect(agentIntegration).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AgentMCPIntegration initialized',
        'AgentMCPIntegration',
        expect.any(Object)
      );
    });
  });

  describe('tool matching', () => {
    it('should match tools by capability', () => {
      const mockTool: MCPTool = {
        name: 'read_file',
        description: 'Read contents of a file from the filesystem',
        inputSchema: { type: 'object', properties: {} },
      };

      const result = integration['calculateMatchScore'](
        'read file',
        mockTool,
        'I need to read a file'
      );

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should give higher score for exact name match', () => {
      const mockTool: MCPTool = {
        name: 'search_code',
        description: 'Search for code patterns',
        inputSchema: { type: 'object', properties: {} },
      };

      const exactMatch = integration['calculateMatchScore']('search_code', mockTool);
      const partialMatch = integration['calculateMatchScore']('search', mockTool);

      expect(exactMatch).toBeGreaterThan(partialMatch);
    });

    it('should give higher score for description match', () => {
      const mockTool: MCPTool = {
        name: 'get_file',
        description: 'Get file contents from filesystem',
        inputSchema: { type: 'object', properties: {} },
      };

      const withContext = integration['calculateMatchScore'](
        'read',
        mockTool,
        'I need to read a file'
      );
      const withoutContext = integration['calculateMatchScore']('read', mockTool);

      expect(withContext).toBeGreaterThanOrEqual(withoutContext);
    });

    it('should return zero score for no match', () => {
      const mockTool: MCPTool = {
        name: 'delete_file',
        description: 'Delete a file from filesystem',
        inputSchema: { type: 'object', properties: {} },
      };

      const score = integration['calculateMatchScore']('create', mockTool);

      expect(score).toBe(0);
    });
  });

  describe('tool caching', () => {
    it('should cache tools', () => {
      const mockTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      };

      integration.cacheTool('test-server', mockTool);

      const cached = integration.getCachedTool('test-server', 'test_tool');
      expect(cached).toBeDefined();
      expect(cached?.tool.name).toBe('test_tool');
    });

    it('should expire cached tools', async () => {
      const integration = new AgentMCPIntegration(
        {
          cacheTTL: 100, // 100ms TTL
          enableCache: true,
        },
        mockLogger
      );

      const mockTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      };

      integration.cacheTool('test-server', mockTool);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cached = integration.getCachedTool('test-server', 'test_tool');
      expect(cached).toBeUndefined();
    });

    it('should clear cache', () => {
      const mockTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      };

      integration.cacheTool('test-server', mockTool);
      integration.clearCache();

      const cached = integration.getCachedTool('test-server', 'test_tool');
      expect(cached).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should return integration statistics', () => {
      const stats = integration.getStatistics();

      expect(stats).toHaveProperty('cachedTools');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('totalMatches');
      expect(stats).toHaveProperty('avgMatchScore');

      expect(typeof stats.cachedTools).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
      expect(typeof stats.totalMatches).toBe('number');
      expect(typeof stats.avgMatchScore).toBe('number');
    });

    it('should track cache hits and misses', () => {
      const mockTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      };

      integration.cacheTool('test-server', mockTool);

      // Cache hit
      integration.getCachedTool('test-server', 'test_tool');

      // Cache miss
      integration.getCachedTool('test-server', 'other_tool');

      const stats = integration.getStatistics();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeLessThan(1);
    });

    it('should track match statistics', () => {
      const mockTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      };

      integration['calculateMatchScore']('test', mockTool);
      integration['calculateMatchScore']('test', mockTool, 'with context');

      const stats = integration.getStatistics();
      expect(stats.totalMatches).toBe(2);
      expect(stats.avgMatchScore).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should clear cache', () => {
      integration.clearCache();
      const stats = integration.getStatistics();
      expect(stats.cachedTools).toBe(0);
    });

    it('should disconnect', async () => {
      await integration.disconnect();
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});

describe('ToolMatchOptions', () => {
  it('should accept default options', () => {
    const options: ToolMatchOptions = {};
    expect(options).toBeDefined();
  });

  it('should accept custom options', () => {
    const options: ToolMatchOptions = {
      minScore: 0.5,
      maxResults: 5,
      includeMetadata: true,
    };
    expect(options.minScore).toBe(0.5);
    expect(options.maxResults).toBe(5);
    expect(options.includeMetadata).toBe(true);
  });
});

describe('ToolMatchResult', () => {
  it('should have required properties', () => {
    const result: ToolMatchResult = {
      tool: {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      },
      score: 0.8,
      serverId: 'test-server',
    };

    expect(result).toHaveProperty('tool');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('serverId');
    expect(result.score).toBe(0.8);
    expect(result.serverId).toBe('test-server');
  });
});
