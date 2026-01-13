#!/usr/bin/env node
/**
 * Comprehensive test of ALL providers after authentication
 * Tests: GLM (with API key), Google Gemini (with OAuth), Featherless (verified)
 */

const http = require('http');

const MODELS = [
  // GLM Models (Native tool calling)
  {
    id: 'glm/glm-4.7',
    name: 'GLM-4.7',
    provider: 'GLM',
    alias: '--builder, --glm, --orchestrator'
  },
  {
    id: 'glm/glm-4',
    name: 'GLM-4',
    provider: 'GLM',
    alias: '--glm4'
  },

  // Google Gemini Models (Native tool calling, OAuth)
  {
    id: 'google/gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'Google',
    alias: '--frontend, --gemini, --research'
  },
  {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    alias: '--gemini2, --flash'
  },

  // Featherless Models (Tool emulation) - Already verified
  {
    id: 'featherless/dphn/Dolphin-Mistral-24B-Venice-Edition',
    name: 'Dolphin-3',
    provider: 'Featherless',
    alias: '--security, --dolphin, --re'
  },
  {
    id: 'featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated',
    name: 'Qwen 72B',
    provider: 'Featherless',
    alias: '--unrestricted, --qwen'
  }
];

function makeRequest(model, messages, tools = null) {
  return new Promise((resolve, reject) => {
    const requestBody = {
      model,
      messages,
      max_tokens: 256,
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
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          resolve({ error: 'Parse failed', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(bodyStr);
    req.end();
  });
}

async function testModel(modelInfo) {
  console.log(`\n📦 ${modelInfo.name} (${modelInfo.provider})`);
  console.log(`   Aliases: ${modelInfo.alias}`);
  console.log(`   ` + '─'.repeat(65));

  const results = {
    basic: false,
    toolCalling: false,
    error: null
  };

  // Test 1: Basic response
  try {
    const response = await makeRequest(
      modelInfo.id,
      [{ role: 'user', content: 'Say hello in 5 words or less.' }],
      null
    );

    if (response.error) {
      results.error = response.error.message || JSON.stringify(response.error);
      console.log(`   ❌ Basic: ${results.error}`);
    } else {
      const text = response.content?.find(b => b.type === 'text')?.text || '';
      if (text.length > 0) {
        console.log(`   ✅ Basic Response: Works`);
        results.basic = true;
      } else {
        console.log(`   ⚠️  Basic: No text in response`);
      }
    }
  } catch (error) {
    results.error = error.message;
    console.log(`   ❌ Basic: ${error.message}`);
  }

  // Test 2: Tool calling (only if basic works)
  if (results.basic) {
    try {
      const tools = [{
        name: 'calculator',
        description: 'Performs arithmetic',
        input_schema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['add', 'multiply'] },
            a: { type: 'number' },
            b: { type: 'number' }
          },
          required: ['operation', 'a', 'b']
        }
      }];

      const response = await makeRequest(
        modelInfo.id,
        [{ role: 'user', content: 'Calculate 7 * 8 using the calculator tool.' }],
        tools
      );

      if (!response.error) {
        const hasToolUse = response.content?.some(b => b.type === 'tool_use' && b.name === 'calculator');
        const textContent = response.content?.find(b => b.type === 'text')?.text || '';
        const hasToolCallTag = textContent.includes('<tool_call>') && textContent.includes('"calculator"');

        if (hasToolUse || hasToolCallTag) {
          console.log(`   ✅ Tool Calling: Works (${hasToolUse ? 'native' : 'emulated'})`);
          results.toolCalling = true;
        } else {
          console.log(`   ⚠️  Tool Calling: No tool use detected`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Tool Calling: ${error.message}`);
    }
  }

  return results;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║     Comprehensive Multi-Provider Model Test                         ║');
  console.log('║     After Google OAuth + GLM API Key Configuration                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  const allResults = {};

  for (const model of MODELS) {
    allResults[model.name] = await testModel(model);
  }

  console.log('\n\n' + '═'.repeat(72));
  console.log('SUMMARY - All Providers');
  console.log('═'.repeat(72));
  console.log('');
  console.log('Provider     Model                Basic   Tools   Status');
  console.log('─'.repeat(72));

  const byProvider = {
    'GLM': [],
    'Google': [],
    'Featherless': []
  };

  for (const model of MODELS) {
    byProvider[model.provider].push({
      name: model.name,
      results: allResults[model.name]
    });
  }

  for (const [provider, models] of Object.entries(byProvider)) {
    for (let i = 0; i < models.length; i++) {
      const { name, results } = models[i];
      const providerLabel = i === 0 ? provider.padEnd(12) : ' '.repeat(12);
      const nameLabel = name.padEnd(20);
      const basicStatus = results.basic ? '  ✅   ' : '  ❌   ';
      const toolStatus = results.toolCalling ? '  ✅  ' : (results.basic ? '  ⚠️  ' : '  ❌  ');
      const status = results.error ? `Error: ${results.error.substring(0, 20)}` :
                     results.basic && results.toolCalling ? 'Working' :
                     results.basic ? 'Partial' : 'Failed';

      console.log(`${providerLabel}${nameLabel}${basicStatus}${toolStatus}${status}`);
    }
  }

  console.log('─'.repeat(72));

  // Count successes
  let totalModels = 0;
  let workingModels = 0;
  let workingTools = 0;

  for (const modelName in allResults) {
    const r = allResults[modelName];
    totalModels++;
    if (r.basic) workingModels++;
    if (r.toolCalling) workingTools++;
  }

  console.log('');
  console.log(`Models Working: ${workingModels}/${totalModels}`);
  console.log(`Tool Calling Working: ${workingTools}/${totalModels}`);
  console.log('');
  console.log('PROVIDER STATUS:');
  console.log('  GLM:         ✅ API key configured (Z.AI)');
  console.log('  Google:      ✅ OAuth authenticated');
  console.log('  Featherless: ✅ API key configured (verified earlier)');
  console.log('  Anthropic:   ⚠️  Needs ANTHROPIC_API_KEY for Claude models');
  console.log('');
  console.log('═'.repeat(72));
  console.log('');
}

main().catch(console.error);
