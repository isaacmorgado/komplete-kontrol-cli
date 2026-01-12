/**
 * Test suite for MCP Integration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getMCPRegistry,
  createMCPRegistry,
} from '../src/mcp';
import type { MCPServerConfig, MCPServerState } from '../src/mcp';

describe('MCP Registry', () => {
  let registry: ReturnType<typeof getMCPRegistry>;

  beforeEach(() => {
    // Create a fresh registry for each test
    registry = createMCPRegistry();
  });

  it('should create registry', () => {
    const r = createMCPRegistry();

    expect(r).toBeDefined();
  });

  it('should register a server', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    const state = registry.register(config);

    expect(state).toBeDefined();
    expect(state.id).toBe('test-server');
    expect(state.config.name).toBe('Test Server');
    expect(state.status).toBe('stopped');
  });

  it('should throw error when registering duplicate server', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    expect(() => registry.register(config)).toThrow();
  });

  it('should get server by ID', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    const server = registry.get('test-server');

    expect(server).toBeDefined();
    expect(server?.id).toBe('test-server');
  });

  it('should return undefined for non-existent server', () => {
    const server = registry.get('non-existent');

    expect(server).toBeUndefined();
  });

  it('should list all servers', () => {
    const config1: MCPServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      command: 'node',
      args: ['server1.js'],
      env: {},
      cwd: '/tmp',
    };

    const config2: MCPServerConfig = {
      id: 'server-2',
      name: 'Server 2',
      command: 'node',
      args: ['server2.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config1);
    registry.register(config2);

    const servers = registry.list();

    expect(servers).toHaveLength(2);
  });

  it('should list servers by status', () => {
    const config1: MCPServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      command: 'node',
      args: ['server1.js'],
      env: {},
      cwd: '/tmp',
    };

    const config2: MCPServerConfig = {
      id: 'server-2',
      name: 'Server 2',
      command: 'node',
      args: ['server2.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config1);
    registry.register(config2);

    registry.setStatus('server-1', 'running');

    const runningServers = registry.listByStatus('running');

    expect(runningServers).toHaveLength(1);
    expect(runningServers[0].id).toBe('server-1');
  });

  it('should update server state', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    const updated = registry.updateState('test-server', { status: 'running' });

    expect(updated.status).toBe('running');
  });

  it('should throw error when updating non-existent server', () => {
    expect(() => {
      registry.updateState('non-existent', { status: 'running' });
    }).toThrow();
  });

  it('should update server tools', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    const tools: MCPServerState['tools'] = [
      { name: 'tool1', description: 'Tool 1', inputSchema: {} },
      { name: 'tool2', description: 'Tool 2', inputSchema: {} },
    ];

    const updated = registry.updateTools('test-server', tools);

    expect(updated.tools).toHaveLength(2);
  });

  it('should set server status', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    const updated = registry.setStatus('test-server', 'running');

    expect(updated.status).toBe('running');
    expect(updated.startTime).toBeDefined();
  });

  it('should set server error', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    const updated = registry.setError('test-server', 'Connection failed');

    expect(updated.status).toBe('error');
    expect(updated.lastError).toBe('Connection failed');
    expect(updated.startTime).toBeUndefined();
  });

  it('should check if server exists', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    expect(registry.has('test-server')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);
  });

  it('should get all tools from active servers', () => {
    const config1: MCPServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      command: 'node',
      args: ['server1.js'],
      env: {},
      cwd: '/tmp',
    };

    const config2: MCPServerConfig = {
      id: 'server-2',
      name: 'Server 2',
      command: 'node',
      args: ['server2.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config1);
    registry.register(config2);

    registry.setStatus('server-1', 'running');
    registry.updateTools('server-1', [
      { name: 'tool1', description: 'Tool 1', inputSchema: {} },
    ]);

    const toolsMap = registry.getAllTools();

    expect(toolsMap.size).toBe(1);
    expect(toolsMap.get('server-1')).toHaveLength(1);
  });

  it('should get registry statistics', () => {
    const config1: MCPServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      command: 'node',
      args: ['server1.js'],
      env: {},
      cwd: '/tmp',
    };

    const config2: MCPServerConfig = {
      id: 'server-2',
      name: 'Server 2',
      command: 'node',
      args: ['server2.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config1);
    registry.register(config2);
    registry.setStatus('server-1', 'running');
    registry.updateTools('server-1', [
      { name: 'tool1', description: 'Tool 1', inputSchema: {} },
    ]);

    const stats = registry.getStatistics();

    expect(stats.totalServers).toBe(2);
    expect(stats.activeServers).toBe(1);
    expect(stats.totalTools).toBe(1);
    expect(stats.serversByStatus.running).toBe(1);
    expect(stats.serversByStatus.stopped).toBe(1);
  });

  it('should unregister a server', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);

    const result = registry.unregister('test-server');

    expect(result).toBe(true);
    expect(registry.has('test-server')).toBe(false);
  });

  it('should return false when unregistering non-existent server', () => {
    const result = registry.unregister('non-existent');

    expect(result).toBe(false);
  });

  it('should throw error when unregistering running server', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);
    registry.setStatus('test-server', 'running');

    expect(() => registry.unregister('test-server')).toThrow();
  });

  it('should clear all servers', () => {
    const config1: MCPServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      command: 'node',
      args: ['server1.js'],
      env: {},
      cwd: '/tmp',
    };

    const config2: MCPServerConfig = {
      id: 'server-2',
      name: 'Server 2',
      command: 'node',
      args: ['server2.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config1);
    registry.register(config2);

    registry.clear();

    expect(registry.list()).toHaveLength(0);
  });

  it('should throw error when clearing registry with running servers', () => {
    const config: MCPServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'node',
      args: ['server.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config);
    registry.setStatus('test-server', 'running');

    expect(() => registry.clear()).toThrow();
  });

  it('should load servers from configuration', () => {
    const configs: MCPServerConfig[] = [
      {
        id: 'server-1',
        name: 'Server 1',
        command: 'node',
        args: ['server1.js'],
        env: {},
        cwd: '/tmp',
      },
      {
        id: 'server-2',
        name: 'Server 2',
        command: 'node',
        args: ['server2.js'],
        env: {},
        cwd: '/tmp',
      },
    ];

    registry.loadFromConfig(configs);

    const servers = registry.list();

    expect(servers).toHaveLength(2);
  });

  it('should skip disabled servers when loading from config', () => {
    const configs: MCPServerConfig[] = [
      {
        id: 'server-1',
        name: 'Server 1',
        command: 'node',
        args: ['server1.js'],
        env: {},
        cwd: '/tmp',
      },
      {
        id: 'server-2',
        name: 'Server 2',
        command: 'node',
        args: ['server2.js'],
        env: {},
        cwd: '/tmp',
        disabled: true,
      },
    ];

    registry.loadFromConfig(configs);

    const servers = registry.list();

    expect(servers).toHaveLength(1);
    expect(servers[0].id).toBe('server-1');
  });

  it('should export server configurations', () => {
    const config1: MCPServerConfig = {
      id: 'server-1',
      name: 'Server 1',
      command: 'node',
      args: ['server1.js'],
      env: {},
      cwd: '/tmp',
    };

    const config2: MCPServerConfig = {
      id: 'server-2',
      name: 'Server 2',
      command: 'node',
      args: ['server2.js'],
      env: {},
      cwd: '/tmp',
    };

    registry.register(config1);
    registry.register(config2);

    const exported = registry.exportConfigs();

    expect(exported).toHaveLength(2);
    expect(exported[0].id).toBe('server-1');
    expect(exported[1].id).toBe('server-2');
  });
});
