/**
 * Test suite for Agent Executor functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  AgentExecutor,
  initAgentExecutor,
  getAgentExecutor,
  type ExecutionContext,
  type ExecutionResult,
} from '../src/core/agents/executor';
import { initAgentRegistry, getAgentRegistry, type AgentDefinition } from '../src/core/agents';
import { initProviderRegistry, getProviderRegistry } from '../src/core/providers/registry';
import { initModelRouter } from '../src/core/providers/router';
import type { AgentTask } from '../src/types';

describe('Agent Executor', () => {
  let executor: AgentExecutor;
  let registry: ReturnType<typeof getAgentRegistry>;

  beforeEach(() => {
    // Create fresh instances for each test
    registry = initAgentRegistry();
    initProviderRegistry();
    initModelRouter();
    executor = initAgentExecutor({
      maxIterations: 5,
      executionTimeoutMs: 30000,
      enableToolUse: false, // Disable tools for unit tests
    });
  });

  afterEach(async () => {
    // Clean up
    await executor.disconnect();
    registry.clear();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultExecutor = new AgentExecutor();
      const config = defaultExecutor.getConfig();

      expect(config.defaultProvider).toBe('anthropic');
      expect(config.maxIterations).toBe(10);
      expect(config.executionTimeoutMs).toBe(120000);
      expect(config.enableToolUse).toBe(true);
      expect(config.enableStreaming).toBe(false);
    });

    it('should initialize with custom configuration', () => {
      const customExecutor = new AgentExecutor({
        defaultProvider: 'oai',
        defaultModel: 'oai/gpt-4',
        maxIterations: 20,
        executionTimeoutMs: 60000,
        enableToolUse: false,
      });

      const config = customExecutor.getConfig();

      expect(config.defaultProvider).toBe('oai');
      expect(config.defaultModel).toBe('oai/gpt-4');
      expect(config.maxIterations).toBe(20);
      expect(config.executionTimeoutMs).toBe(60000);
      expect(config.enableToolUse).toBe(false);
    });

    it('should update configuration', () => {
      executor.updateConfig({
        maxIterations: 15,
        temperature: 0.5,
      });

      const config = executor.getConfig();

      expect(config.maxIterations).toBe(15);
      expect(config.temperature).toBe(0.5);
    });
  });

  describe('Context Building', () => {
    it('should build execution context for a task', async () => {
      const agentDef: AgentDefinition = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent for unit tests',
        capabilities: ['test', 'debug'],
        systemPrompt: 'You are a test agent.',
      };

      registry.register(agentDef);

      const task: AgentTask = {
        id: 'task-1',
        agentId: 'test-agent',
        description: 'Test task',
        type: 'cpu-bound',
        priority: 1,
        input: { key: 'value' },
      };

      const context = await executor.buildContext(task);

      expect(context.agentId).toBe('test-agent');
      expect(context.agent.id).toBe('test-agent');
      expect(context.agent.name).toBe('Test Agent');
      expect(context.task.id).toBe('task-1');
      expect(context.messages).toHaveLength(0);
      expect(context.tools).toHaveLength(0);
      expect(context.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should throw error for non-existent agent', async () => {
      const task: AgentTask = {
        id: 'task-1',
        agentId: 'non-existent-agent',
        description: 'Test task',
        type: 'cpu-bound',
        priority: 1,
        input: {},
      };

      await expect(executor.buildContext(task)).rejects.toThrow('Agent not found');
    });
  });

  describe('Global Instance', () => {
    it('should return same instance from getAgentExecutor', () => {
      const executor1 = getAgentExecutor();
      const executor2 = getAgentExecutor();

      expect(executor1).toBe(executor2);
    });

    it('should create new instance with initAgentExecutor', () => {
      const newExecutor = initAgentExecutor({ maxIterations: 25 });
      const config = newExecutor.getConfig();

      expect(config.maxIterations).toBe(25);
    });
  });

  describe('Execution Result Structure', () => {
    it('should return proper execution result on failure', async () => {
      const agentDef: AgentDefinition = {
        id: 'fail-agent',
        name: 'Failing Agent',
        description: 'An agent that fails',
        capabilities: ['fail'],
        systemPrompt: 'You always fail.',
      };

      registry.register(agentDef);

      const task: AgentTask = {
        id: 'fail-task',
        agentId: 'fail-agent',
        description: 'This will fail',
        type: 'cpu-bound',
        priority: 1,
        input: {},
      };

      const context = await executor.buildContext(task);

      // This will fail because no provider is registered
      const result = await executor.execute(context);

      expect(result.taskId).toBe('fail-task');
      expect(result.agentId).toBe('fail-agent');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.usage.inputTokens).toBe(0);
      expect(result.usage.outputTokens).toBe(0);
      expect(result.iterations).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.toolCalls).toHaveLength(0);
    });
  });

  describe('Tool Call Record Structure', () => {
    it('should have correct tool call record structure', () => {
      // This tests the type structure, not actual execution
      const toolCallRecord = {
        toolName: 'test-tool',
        toolUseId: 'toolu_12345',
        input: { param: 'value' },
        output: 'result',
        success: true,
        durationMs: 100,
      };

      expect(toolCallRecord.toolName).toBe('test-tool');
      expect(toolCallRecord.toolUseId).toBe('toolu_12345');
      expect(toolCallRecord.input).toEqual({ param: 'value' });
      expect(toolCallRecord.output).toBe('result');
      expect(toolCallRecord.success).toBe(true);
      expect(toolCallRecord.durationMs).toBe(100);
    });

    it('should have error field for failed tool calls', () => {
      const failedToolCall = {
        toolName: 'failing-tool',
        toolUseId: 'toolu_failed',
        input: {},
        output: '',
        success: false,
        error: 'Tool not found',
        durationMs: 50,
      };

      expect(failedToolCall.success).toBe(false);
      expect(failedToolCall.error).toBe('Tool not found');
    });
  });

  describe('Disconnection', () => {
    it('should disconnect all MCP clients', async () => {
      // This should not throw
      await executor.disconnect();

      // Calling disconnect again should also not throw
      await executor.disconnect();
    });
  });
});

describe('Agent Executor Integration', () => {
  // These tests require actual providers to be configured
  // They are marked with appropriate skip conditions

  it.skip('should execute a task with real provider', async () => {
    // This test requires ANTHROPIC_API_KEY or OPENAI_API_KEY
    // It's skipped by default but can be run manually

    const executor = new AgentExecutor({
      defaultModel: 'anthropic/claude-3-haiku-20240307',
      maxIterations: 3,
      enableToolUse: false,
    });

    const registry = initAgentRegistry();

    registry.register({
      id: 'simple-agent',
      name: 'Simple Agent',
      description: 'A simple agent for testing',
      capabilities: ['respond'],
      systemPrompt: 'You are a helpful assistant. Keep responses brief.',
    });

    const task: AgentTask = {
      id: 'simple-task',
      agentId: 'simple-agent',
      description: 'Say hello',
      type: 'cpu-bound',
      priority: 1,
      input: {},
    };

    const context = await executor.buildContext(task);
    const result = await executor.execute(context);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(typeof result.output).toBe('string');
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });
});
