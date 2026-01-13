/**
 * End-to-end LLM Integration Test
 *
 * Tests the complete LLM integration layer:
 * 1. Provider initialization
 * 2. Model selection and routing
 * 3. Completion requests
 * 4. Debug orchestrator integration
 */

import { createLLMClient, createDefaultRegistry, LLMRouter } from './src/core/llm';
import { createLLMDebugger } from './src/core/debug/LLMDebugger';

async function testProviderSetup() {
  console.log('\n=== Test 1: Provider Setup ===');

  try {
    const registry = await createDefaultRegistry();
    console.log('✓ Registry created');

    const providers = registry.list();
    console.log(`✓ Available providers: ${providers.join(', ')}`);

    const anthropic = registry.get('anthropic');
    console.log(`✓ Anthropic provider: ${anthropic ? 'available' : 'unavailable'}`);

    const mcp = registry.get('mcp');
    console.log(`✓ MCP provider: ${mcp ? 'available' : 'unavailable'}`);

    return true;
  } catch (error: any) {
    console.error('✗ Provider setup failed:', error.message);
    return false;
  }
}

async function testModelSelection() {
  console.log('\n=== Test 2: Model Selection ===');

  try {
    const registry = await createDefaultRegistry();
    const router = new LLMRouter(registry);

    const contexts = [
      {
        taskType: 'coding' as const,
        priority: 'speed' as const,
        requiresUnrestricted: false
      },
      {
        taskType: 'security' as const,
        priority: 'quality' as const,
        requiresUnrestricted: true
      },
      {
        taskType: 'reasoning' as const,
        priority: 'balanced' as const,
        requiresUnrestricted: false
      }
    ];

    for (const context of contexts) {
      const selection = router.selectModel(context);
      console.log(`✓ ${context.taskType} (${context.priority}): ${selection.provider}/${selection.model}`);
      console.log(`  Reason: ${selection.reason}`);
    }

    return true;
  } catch (error: any) {
    console.error('✗ Model selection failed:', error.message);
    return false;
  }
}

async function testSimpleCompletion() {
  console.log('\n=== Test 3: Simple Completion ===');

  try {
    const client = await createLLMClient();

    console.log('Sending request: "Write a function to calculate fibonacci"');
    const response = await client.complete('Write a function to calculate fibonacci in TypeScript', {
      system: 'You are a helpful coding assistant. Provide concise code examples.',
      taskType: 'coding',
      priority: 'speed'
    });

    console.log(`✓ Response received from ${response.model}`);
    console.log(`✓ Tokens: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');

    console.log(`✓ Response length: ${text.length} characters`);

    if (text.includes('function') || text.includes('const')) {
      console.log('✓ Response contains code');
    }

    return true;
  } catch (error: any) {
    console.error('✗ Completion failed:', error.message);
    return false;
  }
}

async function testDebugOrchestrator() {
  console.log('\n=== Test 4: Debug Orchestrator Integration ===');

  try {
    const llmDebugger = await createLLMDebugger({
      debugDir: '/tmp/test-debug',
      githubMcpAvailable: false
    });

    console.log('✓ LLM debugger created');

    // Test error analysis
    console.log('Analyzing error...');
    const analysis = await llmDebugger.analyzeError({
      message: 'TypeError: Cannot read property "length" of undefined',
      stack: 'at processArray (index.ts:42)',
      context: 'Processing user input array'
    });

    console.log(`✓ Error type: ${analysis.errorType}`);
    console.log(`✓ Root cause: ${analysis.rootCause}`);
    console.log(`✓ Suggested fixes: ${analysis.suggestedFixes.length}`);

    if (analysis.suggestedFixes.length > 0) {
      console.log('  Fixes:');
      analysis.suggestedFixes.slice(0, 2).forEach(fix => {
        console.log(`    - ${fix}`);
      });
    }

    return true;
  } catch (error: any) {
    console.error('✗ Debug orchestrator test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('LLM Integration Layer - End-to-End Test\n');
  console.log('This test verifies the complete integration:');
  console.log('- Provider initialization and registry');
  console.log('- Smart model selection and routing');
  console.log('- Completion requests with various models');
  console.log('- Debug orchestrator with LLM enhancement\n');

  const results = {
    providerSetup: await testProviderSetup(),
    modelSelection: await testModelSelection(),
    simpleCompletion: await testSimpleCompletion(),
    debugOrchestrator: await testDebugOrchestrator()
  };

  console.log('\n=== Test Summary ===');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  console.log(`Passed: ${passed}/${total}`);

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✓' : '✗'} ${name}`);
  });

  if (passed === total) {
    console.log('\n✅ All tests passed!');
    console.log('\nLLM Integration Layer is ready to use.');
    console.log('Next steps:');
    console.log('  1. Wire into autonomous mode hooks');
    console.log('  2. Add first CLI commands (/auto, /sparc, /reflect)');
    console.log('  3. Test with real debugging scenarios');
  } else {
    console.log('\n❌ Some tests failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
