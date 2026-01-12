/**
 * Tests for MCP Tool Discovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolDiscovery, type DiscoveredTool } from '../src/mcp/discovery';
import { Logger } from '../src/utils/logger';
import { MCPTool } from '../src/mcp/types';

describe('ToolDiscovery', () => {
  let toolDiscovery: ToolDiscovery;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    toolDiscovery = new ToolDiscovery(
      {
        autoDiscover: false,
        refreshIntervalMs: 60000,
        extractCapabilities: true,
        minSuccessRate: 0.3,
      },
      mockLogger
    );
  });

  afterEach(async () => {
    await toolDiscovery.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const discovery = new ToolDiscovery();
      expect(discovery).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const discovery = new ToolDiscovery(
        {
          autoDiscover: false,
          refreshIntervalMs: 30000,
          extractCapabilities: true,
          minSuccessRate: 0.5,
        },
        mockLogger
      );
      expect(discovery).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ToolDiscovery initialized',
        'ToolDiscovery',
        expect.any(Object)
      );
    });
  });

  describe('tool discovery', () => {
    it('should discover tools from servers', async () => {
      const result = await toolDiscovery.discover();
      expect(result).toHaveProperty('serversDiscovered');
      expect(result).toHaveProperty('toolsDiscovered');
      expect(result).toHaveProperty('toolsRegistered');
      expect(result).toHaveProperty('durationMs');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should get all tools', () => {
      const tools = toolDiscovery.getAllTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should get tool by server and name', () => {
      const tool = toolDiscovery.getTool('test-server', 'test-tool');
      // May be undefined if no tools are registered
      expect(tool).toBeDefined();
    });

    it('should filter tools by server', () => {
      const tools = toolDiscovery.getAllTools({ serverId: 'test-server' });
      expect(Array.isArray(tools)).toBe(true);
      tools.forEach((tool) => {
        expect(tool.serverId).toBe('test-server');
      });
    });

    it('should filter tools by capability', () => {
      const tools = toolDiscovery.getToolsByCapability('read');
      expect(Array.isArray(tools)).toBe(true);
      tools.forEach((tool) => {
        expect(tool.capabilities).toContain('read');
      });
    });

    it('should filter tools by minimum success rate', () => {
      const tools = toolDiscovery.getAllTools({ minSuccessRate: 0.5 });
      expect(Array.isArray(tools)).toBe(true);
      tools.forEach((tool) => {
        expect(tool.successRate ?? 1.0).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('tool usage tracking', () => {
    it('should update tool usage statistics', () => {
      // First register a tool
      const mockTool: DiscoveredTool = {
        name: 'test-tool',
        description: 'A test tool for reading data',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
        },
        serverId: 'test-server',
        serverName: 'Test Server',
        capabilities: ['read'],
        discoveredAt: new Date(),
      };

      toolDiscovery['discoveredTools'].set('test-server:test-tool', mockTool);

      toolDiscovery.updateToolUsage('test-server', 'test-tool', true, 100);

      const tool = toolDiscovery.getTool('test-server', 'test-tool');
      expect(tool).toBeDefined();
      expect(tool?.lastUsedAt).toBeInstanceOf(Date);
      expect(tool?.successRate).toBeGreaterThan(0);
      expect(tool?.avgExecutionTimeMs).toBeGreaterThan(0);
    });

    it('should calculate success rate correctly', () => {
      const mockTool: DiscoveredTool = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
        serverId: 'test-server',
        serverName: 'Test Server',
        capabilities: [],
        discoveredAt: new Date(),
      };

      toolDiscovery['discoveredTools'].set('test-server:test-tool', mockTool);

      // Simulate multiple executions
      toolDiscovery.updateToolUsage('test-server', 'test-tool', true, 100);
      toolDiscovery.updateToolUsage('test-server', 'test-tool', false, 150);
      toolDiscovery.updateToolUsage('test-server', 'test-tool', true, 90);

      const tool = toolDiscovery.getTool('test-server', 'test-tool');
      expect(tool?.successRate).toBeGreaterThan(0);
      expect(tool?.successRate).toBeLessThan(1);
    });
  });

  describe('tool pruning', () => {
    it('should prune tools with low success rate', () => {
      const mockTool: DiscoveredTool = {
        name: 'bad-tool',
        description: 'A tool that fails often',
        inputSchema: { type: 'object', properties: {} },
        serverId: 'test-server',
        serverName: 'Test Server',
        capabilities: [],
        discoveredAt: new Date(),
        successRate: 0.2,
      };

      toolDiscovery['discoveredTools'].set('test-server:bad-tool', mockTool);

      const removed = toolDiscovery.pruneLowSuccessTools();

      expect(removed).toBeGreaterThan(0);
      expect(toolDiscovery.getTool('test-server', 'bad-tool')).toBeUndefined();
    });

    it('should not prune tools with high success rate', () => {
      const mockTool: DiscoveredTool = {
        name: 'good-tool',
        description: 'A reliable tool',
        inputSchema: { type: 'object', properties: {} },
        serverId: 'test-server',
        serverName: 'Test Server',
        capabilities: [],
        discoveredAt: new Date(),
        successRate: 0.9,
      };

      toolDiscovery['discoveredTools'].set('test-server:good-tool', mockTool);

      toolDiscovery.pruneLowSuccessTools();

      expect(toolDiscovery.getTool('test-server', 'good-tool')).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should return discovery statistics', () => {
      const stats = toolDiscovery.getStatistics();

      expect(stats).toHaveProperty('totalTools');
      expect(stats).toHaveProperty('totalServers');
      expect(stats).toHaveProperty('toolsByServer');
      expect(stats).toHaveProperty('capabilitiesDistribution');
      expect(stats).toHaveProperty('avgSuccessRate');

      expect(typeof stats.totalTools).toBe('number');
      expect(typeof stats.totalServers).toBe('number');
      expect(typeof stats.avgSuccessRate).toBe('number');
    });
  });

  describe('cleanup', () => {
    it('should clear discovered tools', () => {
      toolDiscovery.clear();
      const tools = toolDiscovery.getAllTools();
      expect(tools).toHaveLength(0);
    });

    it('should disconnect all clients', async () => {
      await toolDiscovery.disconnect();
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});

describe('Tool Discovery Capability Extraction', () => {
  let toolDiscovery: ToolDiscovery;

  beforeEach(() => {
    toolDiscovery = new ToolDiscovery({
      autoDiscover: false,
      extractCapabilities: true,
    });
  });

  it('should extract read capability', () => {
    const tool: MCPTool = {
      name: 'read_file',
      description: 'Read the contents of a file',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(capabilities).toContain('read');
  });

  it('should extract write capability', () => {
    const tool: MCPTool = {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(capabilities).toContain('write');
  });

  it('should extract search capability', () => {
    const tool: MCPTool = {
      name: 'search_code',
      description: 'Search for code patterns in the codebase',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(capabilities).toContain('search');
  });

  it('should extract filesystem capability', () => {
    const tool: MCPTool = {
      name: 'list_files',
      description: 'List files in a directory',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(capabilities).toContain('filesystem');
  });

  it('should extract http capability', () => {
    const tool: MCPTool = {
      name: 'http_request',
      description: 'Make an HTTP request to a URL',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(capabilities).toContain('http');
  });

  it('should extract multiple capabilities', () => {
    const tool: MCPTool = {
      name: 'git_search',
      description: 'Search git repository for files and code',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(capabilities).toContain('search');
    expect(capabilities).toContain('git');
  });

  it('should handle tools with no recognizable capabilities', () => {
    const tool: MCPTool = {
      name: 'custom_tool',
      description: 'A custom tool that does something unique',
      inputSchema: { type: 'object', properties: {} },
    };

    const capabilities = toolDiscovery['extractCapabilities'](tool);
    expect(Array.isArray(capabilities)).toBe(true);
    // May be empty if no patterns match
  });
});
