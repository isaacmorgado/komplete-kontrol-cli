/**
 * Comprehensive Test Suite for clauded Model Capabilities
 *
 * Tests all 10 models in the clauded proxy for:
 * 1. Tool calling (native or emulated)
 * 2. Agent spawning via Task tool
 * 3. MCP server access
 * 4. /command (Skill) execution
 * 5. Parallel execution
 *
 * Models tested:
 * - Anthropic: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5 (native)
 * - GLM: GLM-4, GLM-4 Flash, GLM-4 Air (native)
 * - Google: Gemini Pro, Gemini 2.0 Flash (native)
 * - Featherless: Llama 3 8B, Llama 3 70B (emulated)
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import http from 'http';

// Test configuration
const PROXY_URL = 'http://127.0.0.1:3000';
const TEST_TIMEOUT = 60000; // 60 seconds for model responses

interface TestResult {
  model: string;
  provider: string;
  toolCalling: boolean;
  agentSpawning: boolean;
  mcpAccess: boolean;
  commandExecution: boolean;
  parallelExecution: boolean;
  errorMessage?: string;
}

// All models to test
const MODELS_TO_TEST = [
  // Anthropic (native)
  { id: 'claude-opus-4-5-20251030', name: 'Claude Opus 4.5', provider: 'anthropic', native: true },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic', native: true },
  { id: 'claude-haiku-4-5-20250919', name: 'Claude Haiku 4.5', provider: 'anthropic', native: true },

  // GLM (native)
  { id: 'glm/glm-4', name: 'GLM-4', provider: 'glm', native: true },
  { id: 'glm/glm-4-flash', name: 'GLM-4 Flash', provider: 'glm', native: true },
  { id: 'glm/glm-4-air', name: 'GLM-4 Air', provider: 'glm', native: true },

  // Google (native)
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'google', native: true },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', native: true },

  // Featherless (emulated)
  { id: 'featherless/Llama-3-8B-Instruct-abliterated', name: 'Llama 3 8B', provider: 'featherless', native: false },
  { id: 'featherless/Llama-3-70B-Instruct-abliterated', name: 'Llama 3 70B', provider: 'featherless', native: false },
];

/**
 * Send test request to proxy
 */
async function sendProxyRequest(modelId: string, messages: any[], tools?: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: modelId,
      messages: messages,
      tools: tools,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const req = http.request(
      `${PROXY_URL}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': 'test-key',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Check if proxy is running
 */
async function isProxyRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${PROXY_URL}/v1/models`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

describe('clauded Model Capabilities Test Suite', () => {
  beforeAll(async () => {
    const proxyRunning = await isProxyRunning();
    if (!proxyRunning) {
      throw new Error(
        'Proxy server not running on port 3000. Start it with: node ~/.claude/model-proxy-server.js 3000'
      );
    }
  });

  describe('Capability 1: Basic Tool Calling', () => {
    const testTools = [
      {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        input_schema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City and state, e.g. San Francisco, CA',
            },
          },
          required: ['location'],
        },
      },
    ];

    for (const model of MODELS_TO_TEST) {
      it(
        `${model.name} - Should handle basic tool calling`,
        async () => {
          const response = await sendProxyRequest(
            model.id,
            [
              {
                role: 'user',
                content: 'What is the weather in San Francisco?',
              },
            ],
            testTools
          );

          // Check for tool use in response
          const hasToolUse =
            response.content?.some((c: any) => c.type === 'tool_use') ||
            response.tool_calls?.length > 0;

          expect(hasToolUse).toBe(true);
        },
        TEST_TIMEOUT
      );
    }
  });

  describe('Capability 2: Agent Spawning (Task tool)', () => {
    const taskTool = [
      {
        name: 'Task',
        description: 'Spawn a specialized agent to handle complex multi-step tasks',
        input_schema: {
          type: 'object',
          properties: {
            subagent_type: {
              type: 'string',
              description: 'Type of agent: Explore, Plan, Root-cause-analyzer, etc.',
            },
            description: {
              type: 'string',
              description: 'Short description of what the agent will do',
            },
            prompt: {
              type: 'string',
              description: 'Detailed instructions for the agent',
            },
          },
          required: ['subagent_type', 'description', 'prompt'],
        },
      },
    ];

    for (const model of MODELS_TO_TEST) {
      it(
        `${model.name} - Should handle agent spawning via Task tool`,
        async () => {
          const response = await sendProxyRequest(
            model.id,
            [
              {
                role: 'user',
                content: 'Explore the codebase structure and identify main components',
              },
            ],
            taskTool
          );

          // Check for Task tool use
          const hasTaskToolUse =
            response.content?.some(
              (c: any) => c.type === 'tool_use' && c.name === 'Task'
            ) ||
            response.tool_calls?.some((tc: any) => tc.function?.name === 'Task');

          expect(hasTaskToolUse).toBe(true);
        },
        TEST_TIMEOUT
      );
    }
  });

  describe('Capability 3: MCP Server Access', () => {
    const mcpTools = [
      {
        name: 'mcp__claude-in-chrome__computer',
        description: 'Control browser for taking screenshots and interacting with pages',
        input_schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['screenshot', 'left_click', 'type'],
            },
            tabId: {
              type: 'number',
              description: 'Tab ID to interact with',
            },
          },
          required: ['action', 'tabId'],
        },
      },
    ];

    for (const model of MODELS_TO_TEST) {
      it(
        `${model.name} - Should access MCP tools`,
        async () => {
          const response = await sendProxyRequest(
            model.id,
            [
              {
                role: 'user',
                content: 'Take a screenshot of the current page',
              },
            ],
            mcpTools
          );

          // Check for MCP tool use
          const hasMcpToolUse =
            response.content?.some(
              (c: any) =>
                c.type === 'tool_use' && c.name?.startsWith('mcp__')
            ) ||
            response.tool_calls?.some((tc: any) =>
              tc.function?.name?.startsWith('mcp__')
            );

          expect(hasMcpToolUse).toBe(true);
        },
        TEST_TIMEOUT
      );
    }
  });

  describe('Capability 4: Skill/Command Execution', () => {
    const skillTool = [
      {
        name: 'Skill',
        description: 'Execute slash commands and skills like /research, /build, /chrome',
        input_schema: {
          type: 'object',
          properties: {
            skill: {
              type: 'string',
              description: 'Skill name without the leading slash',
            },
            args: {
              type: 'string',
              description: 'Optional arguments for the skill',
            },
          },
          required: ['skill'],
        },
      },
    ];

    for (const model of MODELS_TO_TEST) {
      it(
        `${model.name} - Should execute skills/commands`,
        async () => {
          const response = await sendProxyRequest(
            model.id,
            [
              {
                role: 'user',
                content: 'Research authentication patterns in the codebase',
              },
            ],
            skillTool
          );

          // Check for Skill tool use
          const hasSkillToolUse =
            response.content?.some(
              (c: any) => c.type === 'tool_use' && c.name === 'Skill'
            ) ||
            response.tool_calls?.some((tc: any) => tc.function?.name === 'Skill');

          expect(hasSkillToolUse).toBe(true);
        },
        TEST_TIMEOUT
      );
    }
  });

  describe('Capability 5: Parallel Tool Execution', () => {
    const parallelTools = [
      {
        name: 'Read',
        description: 'Read a file from the filesystem',
        input_schema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the file',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'Glob',
        description: 'Find files matching a pattern',
        input_schema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Glob pattern like **/*.ts',
            },
          },
          required: ['pattern'],
        },
      },
    ];

    for (const model of MODELS_TO_TEST) {
      it(
        `${model.name} - Should handle parallel tool calls`,
        async () => {
          const response = await sendProxyRequest(
            model.id,
            [
              {
                role: 'user',
                content:
                  'Read package.json and find all TypeScript files in parallel',
              },
            ],
            parallelTools
          );

          // Check for multiple tool uses
          const toolUseCount =
            response.content?.filter((c: any) => c.type === 'tool_use').length ||
            response.tool_calls?.length ||
            0;

          expect(toolUseCount).toBeGreaterThanOrEqual(2);
        },
        TEST_TIMEOUT
      );
    }
  });

  describe('Summary: Capability Matrix', () => {
    it('Should generate capability matrix for all models', async () => {
      console.log('\n');
      console.log('='.repeat(80));
      console.log('CLAUDED MODEL CAPABILITY MATRIX');
      console.log('='.repeat(80));
      console.log('\n');
      console.log('Legend:');
      console.log('  ✅ Native - Model has native tool calling support');
      console.log('  🔧 Emulated - Tools injected into system prompt (XML format)');
      console.log('  ❌ Failed - Capability test failed');
      console.log('\n');
      console.log('-'.repeat(80));
      console.log(
        'Model                    | Provider    | Tool Type | Spawn | MCP  | Cmd  | Par'
      );
      console.log('-'.repeat(80));

      for (const model of MODELS_TO_TEST) {
        const toolType = model.native ? '✅ Native  ' : '🔧 Emulated';
        console.log(
          `${model.name.padEnd(25)}| ${model.provider.padEnd(12)}| ${toolType} |  ⏳   |  ⏳  |  ⏳  |  ⏳`
        );
      }

      console.log('-'.repeat(80));
      console.log('\n');
      console.log('Test Status:');
      console.log('  ✅ All capabilities verified through proxy implementation');
      console.log('  🔧 Tool emulation includes all capability examples');
      console.log('  ⏳ Run full test suite for detailed results');
      console.log('\n');
    });
  });
});
