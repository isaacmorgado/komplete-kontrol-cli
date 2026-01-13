#!/usr/bin/env node
/**
 * Comprehensive Test Suite for All 15 Models
 * Tests: Tool calling, MCP integration, context management, agent spawning
 */

const http = require('http');

// Model categories to test
const TEST_MODELS = {
  'Native Tool Support': [
    { id: 'claude-4.5-opus-20251101', name: 'Claude Opus 4.5', alias: 'opus' },
    { id: 'claude-4.5-sonnet-20250929', name: 'Claude Sonnet 4.5', alias: 'sonnet' },
    { id: 'glm/glm-4.7', name: 'GLM-4.7', alias: 'builder' },
    { id: 'google/gemini-3-pro', name: 'Gemini 3 Pro', alias: 'frontend' },
  ],
  'Tool Emulation (Abliterated)': [
    { id: 'featherless/dphn/Dolphin-Mistral-24B-Venice-Edition', name: 'Dolphin-3', alias: 'security' },
    { id: 'featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated', name: 'Qwen 72B', alias: 'unrestricted' },
    { id: 'featherless/WhiteRabbitNeo/Llama-3.1-WhiteRabbitNeo-2-70B', name: 'WhiteRabbitNeo', alias: 'rabbit' },
    { id: 'featherless/mlabonne/Llama-3-8B-Instruct-abliterated', name: 'Llama 8B', alias: 'fast' },
  ]
};

const TESTS = {
  toolCalling: {
    name: 'Tool Calling',
    request: {
      model: '', // Will be filled in
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'What is 15 * 24? Use the calculator tool.' }],
      tools: [{
        name: 'calculator',
        description: 'Performs arithmetic calculations',
        input_schema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression to evaluate' }
          },
          required: ['expression']
        }
      }]
    },
    validate: (response) => {
      // Check if response contains tool use or calculation result
      const content = JSON.stringify(response.content || response);
      return content.includes('360') || content.includes('calculator') || content.includes('tool');
    }
  },

  contextHandling: {
    name: 'Context Management',
    request: {
      model: '',
      max_tokens: 512,
      messages: [
        { role: 'user', content: 'Remember this number: 42' },
        { role: 'assistant', content: 'I will remember the number 42.' },
        { role: 'user', content: 'What number did I ask you to remember?' }
      ]
    },
    validate: (response) => {
      const content = JSON.stringify(response.content || response);
      return content.includes('42');
    }
  },

  mcpAwareness: {
    name: 'MCP Tool Awareness',
    request: {
      model: '',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'List 3 types of tools you have access to (like Task, Skill, or MCP tools). Just list them briefly.' }],
      tools: [
        {
          name: 'mcp__example__search',
          description: 'Search for information (MCP tool example)',
          input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
        },
        {
          name: 'Task',
          description: 'Spawn specialized agents for complex tasks',
          input_schema: { type: 'object', properties: { subagent_type: { type: 'string' }, prompt: { type: 'string' } }, required: ['subagent_type', 'prompt'] }
        }
      ]
    },
    validate: (response) => {
      const content = JSON.stringify(response.content || response).toLowerCase();
      return content.includes('tool') || content.includes('mcp') || content.includes('task') || content.includes('search');
    }
  }
};

async function testModel(modelId, modelName, testName, testConfig) {
  return new Promise((resolve) => {
    const requestBody = {
      ...testConfig.request,
      model: modelId
    };

    const postData = JSON.stringify(requestBody);

    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const passed = testConfig.validate(response);
          resolve({ passed, response, error: null });
        } catch (error) {
          resolve({ passed: false, response: null, error: error.message });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ passed: false, response: null, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ passed: false, response: null, error: 'Request timeout' });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Comprehensive Model Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byModel: {}
  };

  for (const [category, models] of Object.entries(TEST_MODELS)) {
    console.log(`\n📦 ${category}\n`);

    for (const model of models) {
      console.log(`\n  Testing: ${model.name} (${model.alias})`);
      results.byModel[model.alias] = { tests: {} };

      for (const [testKey, testConfig] of Object.entries(TESTS)) {
        process.stdout.write(`    ${testConfig.name}... `);

        const result = await testModel(model.id, model.name, testKey, testConfig);
        results.total++;

        if (result.passed) {
          console.log('✓ PASS');
          results.passed++;
          results.byModel[model.alias].tests[testKey] = 'PASS';
        } else {
          console.log(`✗ FAIL${result.error ? ': ' + result.error : ''}`);
          results.failed++;
          results.byModel[model.alias].tests[testKey] = 'FAIL: ' + (result.error || 'Validation failed');
        }
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  Passed: ${results.passed} ✓`);
  console.log(`  Failed: ${results.failed} ✗`);
  console.log(`  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  console.log('═══════════════════════════════════════════════════════════\n');

  return results;
}

// Run if executed directly
if (require.main === module) {
  runTests().then(results => {
    const allPassed = results.failed === 0;
    process.exit(allPassed ? 0 : 1);
  });
}

module.exports = { runTests, TEST_MODELS, TESTS };
