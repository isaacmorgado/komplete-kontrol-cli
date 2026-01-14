#!/usr/bin/env ts-node
/**
 * Comprehensive Test Suite for /auto Command
 *
 * Tests:
 * 1. Task type detection
 * 2. Reverse engineering tool invocation
 * 3. /re command integration
 * 4. Checkpoint/commit/compact invocation
 * 5. All CLI commands
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function startTest(name: string) {
  log(`\n${colors.bold}Testing: ${name}${colors.reset}`);
  return Date.now();
}

function endTest(name: string, startTime: number, passed: boolean, message: string) {
  const duration = Date.now() - startTime;
  const result: TestResult = { name, passed, message, duration };
  results.push(result);

  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  log(`${status} - ${message} (${duration}ms)`, passed ? colors.green : colors.red);
  return result;
}

function runCommand(command: string, cwd: string = process.cwd()): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    return { stdout, stderr: '', code: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      code: error.status || 1
    };
  }
}

// ============================================================================
// Test 1: Task Type Detection
// ============================================================================

async function testTaskTypeDetection() {
  const startTime = startTest('Task Type Detection');

  try {
    // Import AutoCommand to test detectTaskType method
    const AutoCommandModule = await import('../src/cli/commands/index');
    const AutoCommand = AutoCommandModule.AutoCommand;

    // Create instance (we need to access private method via prototype)
    const autoCmd = new AutoCommand();

    // Test cases for task type detection
    const testCases: { goal: string; expected: string }[] = [
      { goal: 'reverse engineer the codebase', expected: 'reverse-engineering' },
      { goal: 'deobfuscate the minified javascript', expected: 'reverse-engineering' },
      { goal: 'analyze code patterns', expected: 'reverse-engineering' },
      { goal: 'understand code structure', expected: 'reverse-engineering' },
      { goal: 'extract extension code', expected: 'reverse-engineering' },
      { goal: 'research best practices', expected: 'research' },
      { goal: 'investigate the issue', expected: 'research' },
      { goal: 'find examples on github', expected: 'research' },
      { goal: 'debug the error', expected: 'debugging' },
      { goal: 'fix the bug', expected: 'debugging' },
      { goal: 'document the api', expected: 'documentation' },
      { goal: 'create readme', expected: 'documentation' },
      { goal: 'refactor the code', expected: 'refactoring' },
      { goal: 'clean up the codebase', expected: 'refactoring' },
      { goal: 'implement a new feature', expected: 'general' }
    ];

    let passed = 0;
    let failed = 0;

    // Access private method via prototype
    const detectTaskType = (autoCmd as any).detectTaskType.bind(autoCmd);

    for (const testCase of testCases) {
      const detected = detectTaskType(testCase.goal);
      if (detected === testCase.expected) {
        passed++;
      } else {
        failed++;
        log(`  ✗ "${testCase.goal}" detected as "${detected}" (expected "${testCase.expected}")`, colors.red);
      }
    }

    const total = testCases.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    if (failed === 0) {
      endTest('Task Type Detection', startTime, true, `All ${total} test cases passed`);
    } else {
      endTest('Task Type Detection', startTime, false, `${passed}/${total} passed (${successRate}%)`);
    }
  } catch (error: any) {
    endTest('Task Type Detection', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Test 2: Reverse Engineering Tools
// ============================================================================

async function testReverseEngineeringTools() {
  const startTime = startTest('Reverse Engineering Tools');

  const tools = [
    { name: 're-analyze.sh', path: 'src/reversing/re-analyze.sh' },
    { name: 're-docs.sh', path: 'src/reversing/re-docs.sh' },
    { name: 're-prompt.sh', path: 'src/reversing/re-prompt.sh' }
  ];

  let allExist = true;
  const toolResults: string[] = [];

  for (const tool of tools) {
    const exists = existsSync(join(process.cwd(), tool.path));
    if (!exists) {
      allExist = false;
      toolResults.push(`✗ ${tool.name} not found`);
    } else {
      toolResults.push(`✓ ${tool.name} exists`);
    }
  }

  // Test if tools are executable
  let allExecutable = true;
  for (const tool of tools) {
    const result = runCommand(`bash -c "test -x ${tool.path} && echo executable || echo not executable"`);
    if (!result.stdout.includes('executable')) {
      allExecutable = false;
      toolResults.push(`✗ ${tool.name} not executable`);
    }
  }

  // Test help commands
  const helpResults: string[] = [];
  for (const tool of tools) {
    const result = runCommand(`bash ${tool.path} help`);
    if (result.code === 0) {
      helpResults.push(`✓ ${tool.name} help works`);
    } else {
      helpResults.push(`✗ ${tool.name} help failed`);
    }
  }

  // Test analyze command
  const analyzeResult = runCommand('bash src/reversing/re-analyze.sh analyze src/cli/commands/');
  const analyzeWorks = analyzeResult.code === 0;

  // Test docs command
  const docsResult = runCommand('bash src/reversing/re-docs.sh project src/cli/commands/');
  const docsWorks = docsResult.code === 0;

  // Test prompt command
  const promptResult = runCommand('bash src/reversing/re-prompt.sh understand src/cli/commands/AutoCommand.ts');
  const promptWorks = promptResult.code === 0;

  if (allExist && allExecutable && analyzeWorks && docsWorks && promptWorks) {
    endTest('Reverse Engineering Tools', startTime, true, 'All tools exist, executable, and functional');
  } else {
    const issues: string[] = [];
    if (!allExist) issues.push('Some tools missing');
    if (!allExecutable) issues.push('Some tools not executable');
    if (!analyzeWorks) issues.push('re-analyze.sh analyze failed');
    if (!docsWorks) issues.push('re-docs.sh project failed');
    if (!promptWorks) issues.push('re-prompt.sh understand failed');
    endTest('Reverse Engineering Tools', startTime, false, issues.join(', '));
  }
}

// ============================================================================
// Test 3: /re Command Integration
// ============================================================================

async function testReCommandIntegration() {
  const startTime = startTest('/re Command Integration');

  try {
    // Import ReCommand
    const ReCommandModule = await import('../src/cli/commands/ReCommand');
    const ReCommand = ReCommandModule.ReCommand;

    const reCmd = new ReCommand();

    // Create mock context
    const mockContext = {
      workDir: process.cwd(),
      llmRouter: null
    };

    // Test extract action with different targets
    const testCases = [
      { action: 'analyze', target: 'package.json', shouldPass: true },
      { action: 'extract', target: 'test.js', shouldPass: true },
      { action: 'deobfuscate', target: 'test.js', shouldPass: true },
      { action: 'invalid', target: 'test.js', shouldPass: false }
    ];

    let passed = 0;
    const failures: string[] = [];

    for (const testCase of testCases) {
      const result = await reCmd.execute(mockContext, { action: testCase.action as any, target: testCase.target });
      if (result.success === testCase.shouldPass) {
        passed++;
      } else {
        failures.push(`${testCase.action}/${testCase.target}`);
      }
    }

    if (passed === testCases.length) {
      endTest('/re Command Integration', startTime, true, 'All test cases passed');
    } else {
      endTest('/re Command Integration', startTime, false, `${passed}/${testCases.length} passed - ${failures.join(', ')}`);
    }
  } catch (error: any) {
    endTest('/re Command Integration', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Test 4: Checkpoint Command
// ============================================================================

async function testCheckpointCommand() {
  const startTime = startTest('Checkpoint Command');

  try {
    const CheckpointCommandModule = await import('../src/cli/commands/index');
    const CheckpointCommand = CheckpointCommandModule.CheckpointCommand;

    const checkpointCmd = new CheckpointCommand();

    const mockContext = {
      workDir: process.cwd(),
      llmRouter: null
    };

    const result = await checkpointCmd.execute(mockContext, { summary: 'Test checkpoint' });

    if (result.success) {
      endTest('Checkpoint Command', startTime, true, 'Checkpoint created successfully');
    } else {
      endTest('Checkpoint Command', startTime, false, `Failed: ${result.message}`);
    }
  } catch (error: any) {
    endTest('Checkpoint Command', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Test 5: Commit Command
// ============================================================================

async function testCommitCommand() {
  const startTime = startTest('Commit Command');

  try {
    const CommitCommandModule = await import('../src/cli/commands/index');
    const CommitCommand = CommitCommandModule.CommitCommand;

    const commitCmd = new CommitCommand();

    const mockContext = {
      workDir: process.cwd(),
      llmRouter: null
    };

    const result = await commitCmd.execute(mockContext, { message: 'Test commit', push: false });

    // Commit may fail if no changes, that's okay
    if (result.success || result.message.includes('No changes to commit')) {
      endTest('Commit Command', startTime, true, 'Commit command works correctly');
    } else {
      endTest('Commit Command', startTime, false, `Failed: ${result.message}`);
    }
  } catch (error: any) {
    endTest('Commit Command', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Test 6: Compact Command
// ============================================================================

async function testCompactCommand() {
  const startTime = startTest('Compact Command');

  try {
    const CompactCommandModule = await import('../src/cli/commands/index');
    const CompactCommand = CompactCommandModule.CompactCommand;

    const compactCmd = new CompactCommand();

    const mockContext = {
      workDir: process.cwd(),
      llmRouter: null
    };

    const result = await compactCmd.execute(mockContext, { level: 'conservative' });

    if (result.success) {
      endTest('Compact Command', startTime, true, 'Compact executed successfully');
    } else {
      endTest('Compact Command', startTime, false, `Failed: ${result.message}`);
    }
  } catch (error: any) {
    endTest('Compact Command', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Test 7: TypeScript Compilation
// ============================================================================

async function testTypeScriptCompilation() {
  const startTime = startTest('TypeScript Compilation');

  const result = runCommand('npx tsc --noEmit');

  if (result.code === 0) {
    endTest('TypeScript Compilation', startTime, true, 'No TypeScript errors');
  } else {
    endTest('TypeScript Compilation', startTime, false, `Compilation errors found`);
  }
}

// ============================================================================
// Test 8: CLI Commands Availability
// ============================================================================

async function testCLICommandsAvailability() {
  const startTime = startTest('CLI Commands Availability');

  const commands = [
    'AutoCommand',
    'BuildCommand',
    'CheckpointCommand',
    'CollabCommand',
    'CommitCommand',
    'CompactCommand',
    'MultiRepoCommand',
    'PersonalityCommand',
    'ReCommand',
    'ReflectCommand',
    'ResearchApiCommand',
    'ResearchCommand',
    'RootCauseCommand',
    'SPARCCommand',
    'SwarmCommand',
    'VoiceCommand'
  ];

  let available = 0;
  const missing: string[] = [];

  for (const cmd of commands) {
    try {
      const module = await import(`../src/cli/commands/${cmd}`);
      if (module[cmd]) {
        available++;
      } else {
        missing.push(cmd);
      }
    } catch (error) {
      missing.push(cmd);
    }
  }

  if (missing.length === 0) {
    endTest('CLI Commands Availability', startTime, true, `All ${commands.length} commands available`);
  } else {
    endTest('CLI Commands Availability', startTime, false, `${available}/${commands.length} available - Missing: ${missing.join(', ')}`);
  }
}

// ============================================================================
// Test 9: AutoCommand Integration
// ============================================================================

async function testAutoCommandIntegration() {
  const startTime = startTest('AutoCommand Integration');

  try {
    const AutoCommandModule = await import('../src/cli/commands/AutoCommand');
    const AutoCommand = AutoCommandModule.AutoCommand;

    const autoCmd = new AutoCommand();

    // Verify AutoCommand has required methods
    const requiredMethods = [
      'execute',
      'detectTaskType',
      'selectPromptForTaskType',
      'executeReverseEngineeringTools'
    ];

    const missingMethods: string[] = [];
    for (const method of requiredMethods) {
      if (typeof (autoCmd as any)[method] !== 'function') {
        missingMethods.push(method);
      }
    }

    // Verify skill commands are initialized
    const hasCheckpoint = (autoCmd as any).checkpointCommand !== undefined;
    const hasCommit = (autoCmd as any).commitCommand !== undefined;
    const hasCompact = (autoCmd as any).compactCommand !== undefined;
    const hasRe = (autoCmd as any).reCommand !== undefined;

    if (missingMethods.length === 0 && hasCheckpoint && hasCommit && hasCompact && hasRe) {
      endTest('AutoCommand Integration', startTime, true, 'All required methods and skill commands present');
    } else {
      const issues: string[] = [];
      if (missingMethods.length > 0) issues.push(`Missing methods: ${missingMethods.join(', ')}`);
      if (!hasCheckpoint) issues.push('Missing checkpointCommand');
      if (!hasCommit) issues.push('Missing commitCommand');
      if (!hasCompact) issues.push('Missing compactCommand');
      if (!hasRe) issues.push('Missing reCommand');
      endTest('AutoCommand Integration', startTime, false, issues.join(', '));
    }
  } catch (error: any) {
    endTest('AutoCommand Integration', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Test 10: Skill Invocation Logic
// ============================================================================

async function testSkillInvocationLogic() {
  const startTime = startTest('Skill Invocation Logic');

  try {
    const AutoCommandModule = await import('../src/cli/commands/AutoCommand');
    const AutoCommand = AutoCommandModule.AutoCommand;

    const autoCmd = new AutoCommand();

    // Verify tracking variables exist
    const hasCheckpointTracking = (autoCmd as any).lastCheckpointIteration !== undefined;
    const hasCommitTracking = (autoCmd as any).lastCommitIteration !== undefined;
    const hasCompactTracking = (autoCmd as any).lastCompactIteration !== undefined;
    const hasReTracking = (autoCmd as any).lastReIteration !== undefined;
    const hasSuccessTracking = (autoCmd as any).consecutiveSuccesses !== undefined;
    const hasFailureTracking = (autoCmd as any).consecutiveFailures !== undefined;

    if (hasCheckpointTracking && hasCommitTracking && hasCompactTracking &&
        hasReTracking && hasSuccessTracking && hasFailureTracking) {
      endTest('Skill Invocation Logic', startTime, true, 'All tracking variables present');
    } else {
      const issues: string[] = [];
      if (!hasCheckpointTracking) issues.push('Missing lastCheckpointIteration');
      if (!hasCommitTracking) issues.push('Missing lastCommitIteration');
      if (!hasCompactTracking) issues.push('Missing lastCompactIteration');
      if (!hasReTracking) issues.push('Missing lastReIteration');
      if (!hasSuccessTracking) issues.push('Missing consecutiveSuccesses');
      if (!hasFailureTracking) issues.push('Missing consecutiveFailures');
      endTest('Skill Invocation Logic', startTime, false, issues.join(', '));
    }
  } catch (error: any) {
    endTest('Skill Invocation Logic', startTime, false, `Error: ${error.message}`);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('COMPREHENSIVE /auto COMMAND TEST SUITE', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const testStartTime = Date.now();

  // Run all tests
  await testTaskTypeDetection();
  await testReverseEngineeringTools();
  await testReCommandIntegration();
  await testCheckpointCommand();
  await testCommitCommand();
  await testCompactCommand();
  await testTypeScriptCompilation();
  await testCLICommandsAvailability();
  await testAutoCommandIntegration();
  await testSkillInvocationLogic();

  const totalDuration = Date.now() - testStartTime;

  // Generate summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('TEST SUMMARY', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  log(`Total Tests: ${total}`, colors.bold);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`Pass Rate: ${passRate}%`, colors.bold);
  log(`Total Duration: ${totalDuration}ms\n`, colors.gray);

  // Detailed results
  log('DETAILED RESULTS:', colors.bold);
  for (const result of results) {
    const status = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    log(`  ${status} ${result.name} (${result.duration}ms) - ${result.message}`);
  }

  // Failed tests details
  const failedResults = results.filter(r => !r.passed);
  if (failedResults.length > 0) {
    log('\nFAILED TESTS:', colors.red);
    for (const result of failedResults) {
      log(`  ✗ ${result.name}`, colors.red);
      log(`    ${result.message}`, colors.gray);
    }
  }

  log('\n' + '='.repeat(60), colors.cyan);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\nFatal error: ${error.message}`, colors.red);
  process.exit(1);
});
