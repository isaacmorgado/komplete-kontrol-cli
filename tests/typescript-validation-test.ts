/**
 * Test TypeScript validation in ActionExecutor
 */

import { ActionExecutor } from '../src/core/agents/ActionExecutor';
import { LLMRouter } from '../src/core/llm/Router';
import { AnthropicProvider } from '../src/core/llm/providers/AnthropicProvider';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testTypeScriptValidation() {
  console.log('🧪 Testing TypeScript validation...\n');

  // Setup
  const apiKey = process.env.ANTHROPIC_API_KEY || 'test-key';
  const provider = new AnthropicProvider(apiKey);
  const router = new LLMRouter([provider]);
  const testDir = path.join(process.cwd(), 'test-validation');
  const executor = new ActionExecutor(router, testDir);

  // Create test directory
  await fs.mkdir(testDir, { recursive: true });

  try {
    // Test 1: Valid TypeScript code
    console.log('Test 1: Validating correct TypeScript...');
    await executor.execute({
      type: 'file_write',
      params: {
        path: 'valid.ts',
        content: `export function add(a: number, b: number): number {
  return a + b;
}

export const result = add(1, 2);`
      }
    });

    const result1 = await executor.validateTypeScript(['valid.ts']);
    console.log('✓ Result:', result1.output);
    console.log('  Metadata:', JSON.stringify(result1.metadata, null, 2));

    if (result1.success) {
      console.log('✅ Test 1 PASSED: Valid code accepted\n');
    } else {
      console.log('❌ Test 1 FAILED: Valid code rejected\n');
      console.log('  Error:', result1.error);
    }

    // Test 2: Invalid TypeScript code (type error)
    console.log('Test 2: Validating invalid TypeScript...');
    await executor.execute({
      type: 'file_write',
      params: {
        path: 'invalid.ts',
        content: `export function add(a: number, b: number): number {
  return a + b;
}

// Type error: passing string to number parameter
export const result = add("hello", 2);`
      }
    });

    const result2 = await executor.validateTypeScript(['invalid.ts']);
    console.log('✓ Result:', result2.success ? 'PASS' : 'FAIL');
    console.log('  Error:', result2.error || 'none');
    console.log('  Metadata:', JSON.stringify(result2.metadata, null, 2));

    if (!result2.success && result2.metadata?.errorCount && result2.metadata.errorCount > 0) {
      console.log('✅ Test 2 PASSED: Invalid code rejected\n');
    } else {
      console.log('❌ Test 2 FAILED: Invalid code should be rejected\n');
    }

    // Test 3: Using execute() interface with validate_typescript action
    console.log('Test 3: Using execute() with validate_typescript action...');
    const result3 = await executor.execute({
      type: 'validate_typescript',
      params: {
        files: ['valid.ts']
      }
    });

    console.log('✓ Result:', result3.output);

    if (result3.success) {
      console.log('✅ Test 3 PASSED: validate_typescript action works\n');
    } else {
      console.log('❌ Test 3 FAILED: validate_typescript action failed\n');
    }

    console.log('🎉 All validation tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

// Run test
testTypeScriptValidation().catch(console.error);
