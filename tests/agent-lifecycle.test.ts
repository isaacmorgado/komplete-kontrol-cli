/**
 * Test suite for Agent Lifecycle Management functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getAgentRegistry,
  initAgentRegistry,
  type AgentDefinition,
} from '../src/core/agents';
import {
  getAgentLifecycleManager,
  initAgentLifecycleManager,
  AgentLifecycleState,
} from '../src/core/agents/lifecycle';

describe('Agent Lifecycle', () => {
  let registry: ReturnType<typeof getAgentRegistry>;
  let lifecycleManager: ReturnType<typeof getAgentLifecycleManager>;

  beforeEach(() => {
    // Create fresh instances for each test
    registry = initAgentRegistry();
    lifecycleManager = initAgentLifecycleManager({}, undefined, undefined, registry);
  });

  afterEach(async () => {
    // Clean up - stop and dispose all agents
    const instances = lifecycleManager.getAllInstances();
    for (const [agentId] of instances.entries()) {
      try {
        await lifecycleManager.stop(agentId);
        await lifecycleManager.dispose(agentId);
      } catch {
        // Ignore errors during cleanup
      }
    }
    registry.clear();
    lifecycleManager.clear();
  });

  it('should get initial state of agent', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);
    await lifecycleManager.initialize('test-agent');

    const state = lifecycleManager.getState('test-agent');
    expect(state).toBe(AgentLifecycleState.INITIALIZED);
  });

  it('should start agent', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);
    await lifecycleManager.initialize('test-agent');
    await lifecycleManager.start('test-agent');

    const state = lifecycleManager.getState('test-agent');
    expect(state).toBe(AgentLifecycleState.RUNNING);
    expect(lifecycleManager.isActive('test-agent')).toBe(true);
  });

  it('should pause agent', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);
    await lifecycleManager.initialize('test-agent');
    await lifecycleManager.start('test-agent');
    await lifecycleManager.pause('test-agent');

    const state = lifecycleManager.getState('test-agent');
    expect(state).toBe(AgentLifecycleState.PAUSED);
    expect(lifecycleManager.isActive('test-agent')).toBe(false);
  });

  it('should resume agent', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);
    await lifecycleManager.initialize('test-agent');
    await lifecycleManager.start('test-agent');
    await lifecycleManager.pause('test-agent');
    await lifecycleManager.resume('test-agent');

    const state = lifecycleManager.getState('test-agent');
    expect(state).toBe(AgentLifecycleState.RUNNING);
    expect(lifecycleManager.isActive('test-agent')).toBe(true);
  });

  it('should stop agent', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);
    await lifecycleManager.initialize('test-agent');
    await lifecycleManager.start('test-agent');
    await lifecycleManager.stop('test-agent');

    const state = lifecycleManager.getState('test-agent');
    expect(state).toBe(AgentLifecycleState.STOPPED);
    expect(lifecycleManager.isActive('test-agent')).toBe(false);
  });

  it('should dispose agent', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);
    await lifecycleManager.initialize('test-agent');
    await lifecycleManager.start('test-agent');
    await lifecycleManager.dispose('test-agent');

    const state = lifecycleManager.getState('test-agent');
    expect(state).toBeUndefined();
  });

  it('should start agent with dependencies', async () => {
    const depDefinition: AgentDefinition = {
      id: 'dep-agent',
      name: 'Dependency Agent',
      description: 'A dependency agent',
      capabilities: ['dep'],
      systemPrompt: 'You are a dependency agent',
    };

    const mainDefinition: AgentDefinition = {
      id: 'main-agent',
      name: 'Main Agent',
      description: 'A main agent with dependencies',
      capabilities: ['main'],
      systemPrompt: 'You are a main agent',
      dependencies: ['dep-agent'],
    };

    registry.register(depDefinition);
    registry.register(mainDefinition);
    await lifecycleManager.initialize('dep-agent');
    await lifecycleManager.initialize('main-agent');

    const depState = lifecycleManager.getState('dep-agent');
    const mainState = lifecycleManager.getState('main-agent');

    expect(depState).toBe(AgentLifecycleState.INITIALIZED);
    expect(mainState).toBe(AgentLifecycleState.INITIALIZED);
  });

  it('should not start agent if dependencies not met', async () => {
    const mainDefinition: AgentDefinition = {
      id: 'main-agent',
      name: 'Main Agent',
      description: 'A main agent with dependencies',
      capabilities: ['main'],
      systemPrompt: 'You are a main agent',
      dependencies: ['non-existent-dep'],
    };

    registry.register(mainDefinition);

    await expect(lifecycleManager.initialize('main-agent')).rejects.toThrow();
  });

  it('should get state for unknown agent', () => {
    const state = lifecycleManager.getState('non-existent');
    expect(state).toBeUndefined();
  });

  it('should handle multiple state transitions', async () => {
    const definition: AgentDefinition = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['test'],
      systemPrompt: 'You are a test agent',
    };

    registry.register(definition);

    // Initial state
    await lifecycleManager.initialize('test-agent');
    expect(lifecycleManager.getState('test-agent')).toBe(AgentLifecycleState.INITIALIZED);

    // Start
    await lifecycleManager.start('test-agent');
    expect(lifecycleManager.getState('test-agent')).toBe(AgentLifecycleState.RUNNING);

    // Pause
    await lifecycleManager.pause('test-agent');
    expect(lifecycleManager.getState('test-agent')).toBe(AgentLifecycleState.PAUSED);

    // Resume
    await lifecycleManager.resume('test-agent');
    expect(lifecycleManager.getState('test-agent')).toBe(AgentLifecycleState.RUNNING);

    // Stop
    await lifecycleManager.stop('test-agent');
    expect(lifecycleManager.getState('test-agent')).toBe(AgentLifecycleState.STOPPED);
  });

  it('should get active agents', async () => {
    const definition1: AgentDefinition = {
      id: 'agent-1',
      name: 'Agent 1',
      description: 'First agent',
      capabilities: ['test'],
      systemPrompt: 'You are agent 1',
    };

    const definition2: AgentDefinition = {
      id: 'agent-2',
      name: 'Agent 2',
      description: 'Second agent',
      capabilities: ['test'],
      systemPrompt: 'You are agent 2',
    };

    registry.register(definition1);
    registry.register(definition2);
    await lifecycleManager.initialize('agent-1');
    await lifecycleManager.initialize('agent-2');
    await lifecycleManager.start('agent-1');
    await lifecycleManager.start('agent-2');

    const activeAgents = lifecycleManager.getActiveAgents();

    expect(activeAgents).toHaveLength(2);
    expect(activeAgents).toContain('agent-1');
    expect(activeAgents).toContain('agent-2');
  });
});
