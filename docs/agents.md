# Agent System Documentation

## Overview

The KOMPLETE-KONTROL CLI agent system provides a flexible framework for creating, managing, and orchestrating AI agents that can perform complex tasks using LLMs and tools.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                        │
│  - Task planning and decomposition                          │
│  - Agent coordination                                       │
│  - Result aggregation                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    AgentExecutor                            │
│  - LLM interaction (via ProviderRegistry)                   │
│  - Tool execution (via MCP)                                 │
│  - Agentic loop management                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ ProviderRegistry │   │  MCP Client   │
│ (LLM Access)  │   │ (Tool Access) │
└───────────────┘   └───────────────┘
```

## Core Components

### AgentRegistry

Manages agent registration and lifecycle.

```typescript
import { getAgentRegistry } from './src/core/agents';

const registry = getAgentRegistry();

// Register an agent
registry.register({
  id: 'code-analyzer',
  name: 'Code Analyzer',
  description: 'Analyzes code for issues and improvements',
  capabilities: ['code-analysis', 'refactoring'],
  config: {
    model: 'anthropic/claude-3-5-sonnet-20241022',
    maxTokens: 4096,
  },
});

// Get agent
const agent = registry.get('code-analyzer');

// List all agents
const agents = registry.list();
```

### AgentExecutor

Executes tasks using the agentic loop pattern.

```typescript
import { getAgentExecutor } from './src/core/agents';

const executor = getAgentExecutor();

// Build execution context
const context = await executor.buildContext({
  id: 'task-123',
  agentId: 'code-analyzer',
  description: 'Analyze the user service for performance issues',
  input: { files: ['src/services/user.ts'] },
});

// Execute
const result = await executor.execute(context);

console.log(result.success);      // true/false
console.log(result.output);       // Agent's response
console.log(result.toolCalls);    // List of tool calls made
console.log(result.usage);        // Token usage
```

### AgentOrchestrator

Coordinates multiple agents for complex tasks.

```typescript
import { getAgentOrchestrator } from './src/core/agents';

const orchestrator = getAgentOrchestrator();

// Submit a complex task
const taskId = orchestrator.submitTask({
  description: 'Refactor the authentication module',
  priority: 1,
  metadata: {
    files: ['src/auth/*'],
  },
});

// Monitor progress
const status = orchestrator.getTaskStatus(taskId);
```

## Execution Flow

### 1. Task Submission

Tasks enter the system through the orchestrator:

```
User Request → Orchestrator → Task Planning → Agent Assignment
```

### 2. Agentic Loop

The executor runs an agentic loop for each task:

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────┐    ┌──────────┐    ┌───────┐  │
│  │ LLM Call │ → │ Tool Use? │ → │ Done? │  │
│  └─────────┘    └────┬─────┘    └───┬───┘  │
│       ▲              │              │      │
│       │              ▼              │      │
│       │        ┌──────────┐        │      │
│       └────────│ Run Tool │        │      │
│                └──────────┘        │      │
│                                    ▼      │
│                              Return Result │
└─────────────────────────────────────────────┘
```

### 3. Tool Integration

Tools are discovered from connected MCP servers:

```typescript
// MCP tools are automatically available
const tools = await executor.discoverTools();
// Returns: [{ name: 'read_file', ... }, { name: 'write_file', ... }, ...]

// During execution, the agent can call tools
// Tool calls are recorded in result.toolCalls
```

## Configuration

### AgentExecutorConfig

```typescript
interface AgentExecutorConfig {
  // Default LLM provider
  defaultProvider: 'anthropic' | 'openai' | 'ollama';

  // Default model to use
  defaultModel: string;

  // Maximum iterations in agentic loop
  maxIterations: number;  // default: 10

  // Execution timeout in milliseconds
  executionTimeoutMs: number;  // default: 120000 (2 min)

  // Enable tool usage
  enableToolUse: boolean;  // default: true

  // Enable streaming responses
  enableStreaming: boolean;  // default: false

  // Max tokens per LLM request
  maxTokensPerRequest: number;  // default: 4096

  // Temperature for LLM
  temperature: number;  // default: 0.7
}
```

### Configuring the Executor

```typescript
import { initAgentExecutor } from './src/core/agents';

const executor = initAgentExecutor({
  defaultProvider: 'anthropic',
  defaultModel: 'anthropic/claude-3-5-sonnet-20241022',
  maxIterations: 15,
  executionTimeoutMs: 300000,  // 5 minutes
});
```

## Agent Definition

### Creating an Agent

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  config: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: string[];  // Tool names this agent can use
  };
}

registry.register({
  id: 'test-writer',
  name: 'Test Writer',
  description: 'Generates unit tests for code',
  capabilities: ['testing', 'code-generation'],
  config: {
    model: 'openai/gpt-4o',
    systemPrompt: 'You are an expert at writing unit tests...',
    tools: ['read_file', 'write_file', 'run_tests'],
  },
});
```

## Result Structure

### ExecutionResult

```typescript
interface ExecutionResult {
  // Task identifier
  taskId: string;

  // Agent that executed
  agentId: string;

  // Success status
  success: boolean;

  // Final output from agent
  output: unknown;

  // Full message history
  messages: Message[];

  // Tool calls made during execution
  toolCalls: ToolCallRecord[];

  // Token usage
  usage: {
    inputTokens: number;
    outputTokens: number;
  };

  // Number of iterations in agentic loop
  iterations: number;

  // Total execution time
  durationMs: number;

  // Error if failed
  error?: Error;
}
```

### ToolCallRecord

```typescript
interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
}
```

## Best Practices

### 1. Agent Specialization

Create focused agents with specific capabilities:

```typescript
// Good: Specialized agent
registry.register({
  id: 'sql-optimizer',
  capabilities: ['sql', 'performance'],
  config: {
    systemPrompt: 'You optimize SQL queries...',
    tools: ['run_query', 'explain_plan'],
  },
});

// Avoid: Generic "do everything" agents
```

### 2. Tool Selection

Limit tools to what's necessary:

```typescript
// Good: Agent with focused toolset
config: {
  tools: ['read_file', 'analyze_code'],
}

// Avoid: Giving all tools to every agent
config: {
  tools: ['*'],  // Too permissive
}
```

### 3. Iteration Limits

Set appropriate iteration limits based on task complexity:

```typescript
// Simple tasks: low iterations
const simpleExecutor = initAgentExecutor({ maxIterations: 3 });

// Complex multi-step tasks: higher iterations
const complexExecutor = initAgentExecutor({ maxIterations: 20 });
```

### 4. Error Handling

Always check execution results:

```typescript
const result = await executor.execute(context);

if (!result.success) {
  console.error('Execution failed:', result.error);
  // Handle failure (retry, fallback, notify user)
}
```

## Integration with MCP

The agent system integrates with MCP for tool discovery and execution:

```typescript
import { getMCPClient } from './src/core/mcp';

const mcpClient = getMCPClient();

// Connect to MCP server
await mcpClient.connect('file-tools', {
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem'],
});

// Tools from connected servers are automatically available to agents
const executor = getAgentExecutor();
const context = await executor.buildContext(task);
// context.tools now includes tools from 'file-tools' server
```

## Monitoring and Debugging

### Token Usage Tracking

```typescript
const result = await executor.execute(context);
console.log(`Tokens used: ${result.usage.inputTokens} in, ${result.usage.outputTokens} out`);
```

### Tool Call Analysis

```typescript
for (const call of result.toolCalls) {
  console.log(`Tool: ${call.toolName}`);
  console.log(`Duration: ${call.durationMs}ms`);
  console.log(`Success: ${call.success}`);
}
```

### Execution Tracing

Enable debug logging for detailed traces:

```typescript
import { initLogger, LogLevel } from './src/utils/logger';

initLogger({ level: LogLevel.DEBUG });
// Now see detailed execution logs
```
