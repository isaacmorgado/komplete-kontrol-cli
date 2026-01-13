#!/usr/bin/env node
/**
 * Focused test for GLM model with tool calling
 * GLM has API key configured, so this should work
 */

const http = require('http');

const PROXY_URL = 'http://127.0.0.1:3000';

function makeRequest(model, messages, tools = null) {
  return new Promise((resolve, reject) => {
    const requestBody = {
      model,
      messages,
      max_tokens: 1024,
      stream: false
    };

    if (tools) {
      requestBody.tools = tools;
    }

    const bodyStr = JSON.stringify(requestBody);

    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'anthropic-version': '2023-06-01'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          resolve({ error: 'Failed to parse response', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function testGLMWithTools() {
  console.log('\n🧪 Testing GLM-4.7 with Tool Calling (Native Support)\n');
  console.log('═'.repeat(70));

  const tools = [
    {
      name: 'calculator',
      description: 'Performs basic arithmetic calculations',
      input_schema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide'],
            description: 'The arithmetic operation to perform'
          },
          a: {
            type: 'number',
            description: 'First operand'
          },
          b: {
            type: 'number',
            description: 'Second operand'
          }
        },
        required: ['operation', 'a', 'b']
      }
    },
    {
      name: 'Task',
      description: 'Spawn a sub-agent to handle complex tasks autonomously',
      input_schema: {
        type: 'object',
        properties: {
          subagent_type: {
            type: 'string',
            description: 'Type of agent to spawn'
          },
          description: {
            type: 'string',
            description: 'Short description of the task'
          },
          prompt: {
            type: 'string',
            description: 'Detailed task instructions'
          }
        },
        required: ['subagent_type', 'description', 'prompt']
      }
    }
  ];

  const messages = [
    {
      role: 'user',
      content: 'Calculate 45 * 8 using the calculator tool.'
    }
  ];

  console.log('Request:');
  console.log(`  Model: glm/glm-4.7`);
  console.log(`  Tools: calculator, Task`);
  console.log(`  Message: "${messages[0].content}"\n`);

  try {
    const response = await makeRequest('glm/glm-4.7', messages, tools);

    if (response.error) {
      console.log('❌ FAILED');
      console.log(`  Error: ${response.error.message || JSON.stringify(response.error)}`);
      return false;
    }

    console.log('Response:');
    console.log(`  Stop Reason: ${response.stop_reason}`);

    // Check for tool use
    const hasToolUse = response.content?.some(block => block.type === 'tool_use');
    const textContent = response.content?.find(block => block.type === 'text')?.text || '';

    if (hasToolUse) {
      console.log('  ✅ Tool use detected (native tool calling works!)');
      response.content.forEach(block => {
        if (block.type === 'tool_use') {
          console.log(`    → Tool: ${block.name}`);
          console.log(`    → Args: ${block.input}`);
        }
      });
      return true;
    } else {
      console.log('  ⚠️  No tool use found');
      console.log(`  Text response: ${textContent.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function testFeatherlessWithToolEmulation() {
  console.log('\n🧪 Testing Featherless with Tool Emulation\n');
  console.log('═'.repeat(70));

  const tools = [
    {
      name: 'get_current_time',
      description: 'Returns the current time',
      input_schema: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  ];

  const messages = [
    {
      role: 'user',
      content: 'What is the current time? Use the get_current_time tool.'
    }
  ];

  console.log('Request:');
  console.log(`  Model: featherless/dphn/Dolphin-Mistral-24B-Venice-Edition`);
  console.log(`  Tools: get_current_time`);
  console.log(`  Message: "${messages[0].content}"\n`);

  try {
    const response = await makeRequest(
      'featherless/dphn/Dolphin-Mistral-24B-Venice-Edition',
      messages,
      tools
    );

    if (response.error) {
      console.log('❌ FAILED');
      console.log(`  Error: ${response.error.message || JSON.stringify(response.error)}`);
      if (response.error.message && response.error.message.includes('FEATHERLESS_API_KEY')) {
        console.log('  ℹ️  Featherless requires API key to be configured');
      }
      return false;
    }

    console.log('Response:');
    console.log(`  Stop Reason: ${response.stop_reason}`);

    const hasToolUse = response.content?.some(block => block.type === 'tool_use');
    const textContent = response.content?.find(block => block.type === 'text')?.text || '';

    if (hasToolUse) {
      console.log('  ✅ Tool emulation working!');
      response.content.forEach(block => {
        if (block.type === 'tool_use') {
          console.log(`    → Tool: ${block.name}`);
        }
      });
      return true;
    } else {
      // Check if response contains <tool_call> tags (emulation format)
      if (textContent.includes('<tool_call>')) {
        console.log('  ✅ Tool emulation working (emulated format detected)');
        console.log(`  Response snippet: ${textContent.substring(0, 300)}...`);
        return true;
      } else {
        console.log('  ⚠️  No tool use detected');
        console.log(`  Text response: ${textContent.substring(0, 200)}...`);
        return false;
      }
    }
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║          Tool Calling Verification for Claude Code Models        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  const glmResult = await testGLMWithTools();
  const featherlessResult = await testFeatherlessWithToolEmulation();

  console.log('\n═'.repeat(70));
  console.log('Summary:');
  console.log(`  GLM-4.7 (native tools):     ${glmResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Dolphin-3 (tool emulation): ${featherlessResult ? '✅ PASS' : '❌ FAIL (likely missing API key)'}`);
  console.log('═'.repeat(70));

  console.log('\nNext steps:');
  console.log('  1. Configure FEATHERLESS_API_KEY for Featherless models');
  console.log('  2. Configure GOOGLE_API_KEY for Google Gemini models');
  console.log('  3. Configure ANTHROPIC_API_KEY for Claude models');
  console.log('  4. All models support tools (native or emulated)');
  console.log('  5. Context management works via proxy passthrough\n');
}

main().catch(console.error);
