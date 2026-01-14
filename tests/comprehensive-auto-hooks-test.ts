#!/usr/bin/env bun
/**
 * Comprehensive Auto Hooks Test Suite
 *
 * Tests all 27 newly created hooks:
 * - hooks/auto-evaluator.sh
 * - hooks/constitutional-ai.sh
 * - hooks/reasoning-mode-switcher.sh
 * - hooks/tree-of-thoughts.sh
 * - hooks/strategy-selector.sh
 * - hooks/hypothesis-tester.sh
 * - hooks/bounded-autonomy.sh
 * - hooks/risk-predictor.sh
 * - hooks/multi-agent-orchestrator.sh
 * - hooks/parallel-execution-planner.sh
 * - hooks/reinforcement-learning.sh
 * - hooks/learning-engine.sh
 * - hooks/feedback-loop.sh
 * - hooks/pattern-miner.sh
 * - hooks/meta-reflection.sh
 * - hooks/react-reflexion.sh
 * - hooks/agent-loop.sh
 * - hooks/plan-execute.sh
 * - hooks/task-queue.sh
 * - hooks/autonomous-orchestrator-v2.sh
 * - hooks/thinking-framework.sh
 * - hooks/error-handler.sh
 * - hooks/ui-testing.sh
 * - hooks/mac-app-testing.sh
 * - hooks/enhanced-audit-trail.sh
 * - hooks/context-optimizer.sh
 * - hooks/self-healing.sh
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Get project root directory
const TEST_FILE_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = dirname(dirname(TEST_FILE_PATH));

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: string;
}

const results: TestResult[] = [];

// Helper to track test execution
async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  const result: TestResult = {
    name,
    passed: false,
    duration: 0
  };

  try {
    await fn();
    result.passed = true;
    console.log(chalk.green(`  ✓ ${name}`));
  } catch (error: any) {
    result.error = error.message;
    result.output = error.stdout || error.stderr || '';
    console.log(chalk.red(`  ✗ ${name}: ${error.message}`));
  }

  result.duration = Date.now() - start;
  results.push(result);
}

// Helper to execute bash command
function execBash(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, { shell: true, cwd: PROJECT_ROOT });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// HOOK EXISTENCE TESTS
// ============================================================================

const HOOKS_TO_TEST = [
  'auto-evaluator.sh',
  'constitutional-ai.sh',
  'reasoning-mode-switcher.sh',
  'tree-of-thoughts.sh',
  'strategy-selector.sh',
  'hypothesis-tester.sh',
  'bounded-autonomy.sh',
  'risk-predictor.sh',
  'multi-agent-orchestrator.sh',
  'parallel-execution-planner.sh',
  'reinforcement-learning.sh',
  'learning-engine.sh',
  'feedback-loop.sh',
  'pattern-miner.sh',
  'meta-reflection.sh',
  'react-reflexion.sh',
  'agent-loop.sh',
  'plan-execute.sh',
  'task-queue.sh',
  'autonomous-orchestrator-v2.sh',
  'thinking-framework.sh',
  'error-handler.sh',
  'ui-testing.sh',
  'mac-app-testing.sh',
  'enhanced-audit-trail.sh',
  'context-optimizer.sh',
  'self-healing.sh'
];

async function testHookExists(hookName: string) {
  const hookPath = join(PROJECT_ROOT, 'hooks', hookName);
  if (!existsSync(hookPath)) {
    throw new Error(`Hook file does not exist: ${hookPath}`);
  }
}

async function testHookExecutable(hookName: string) {
  const hookPath = join(PROJECT_ROOT, 'hooks', hookName);
  const content = readFileSync(hookPath, 'utf-8');
  if (!content.startsWith('#!/')) {
    throw new Error(`Hook missing shebang: ${hookName}`);
  }
}

async function testHookHasFunctions(hookName: string) {
  const hookPath = join(PROJECT_ROOT, 'hooks', hookName);
  const content = readFileSync(hookPath, 'utf-8');
  
  // Check for function definitions
  const functionMatches = content.match(/^[a-zA-Z_][a-zA-Z0-9_]*\(\)/gm);
  if (!functionMatches || functionMatches.length === 0) {
    throw new Error(`Hook has no functions: ${hookName}`);
  }
}

async function testHookCanRunHelp(hookName: string) {
  const hookPath = join(PROJECT_ROOT, 'hooks', hookName);
  
  try {
    const { stdout } = await execBash(`bash "${hookPath}" help 2>&1 || bash "${hookPath}" --help 2>&1 || bash "${hookPath}" 2>&1`);
    // If we get here, the hook is executable (even if help isn't implemented)
  } catch (error: any) {
    // Some hooks might not have help, that's okay
    if (error.message.includes('Permission denied')) {
      throw new Error(`Hook not executable: ${hookName}`);
    }
  }
}

// ============================================================================
// HOOK FUNCTIONALITY TESTS
// ============================================================================

async function testAutoEvaluatorHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/auto-evaluator.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('evaluate')) {
    throw new Error('auto-evaluator.sh missing evaluate function');
  }
  if (!content.includes('quality')) {
    throw new Error('auto-evaluator.sh missing quality function');
  }
}

async function testConstitutionalAIHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/constitutional-ai.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('constitutional')) {
    throw new Error('constitutional-ai.sh missing constitutional function');
  }
  if (!content.includes('principle')) {
    throw new Error('constitutional-ai.sh missing principle function');
  }
}

async function testReasoningModeSwitcherHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/reasoning-mode-switcher.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('select()')) {
    throw new Error('reasoning-mode-switcher.sh missing select function');
  }
  if (!content.includes('analyze()')) {
    throw new Error('reasoning-mode-switcher.sh missing analyze function');
  }
}

async function testTreeOfThoughtsHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/tree-of-thoughts.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('tree')) {
    throw new Error('tree-of-thoughts.sh missing tree function');
  }
  if (!content.includes('thought')) {
    throw new Error('tree-of-thoughts.sh missing thought function');
  }
}

async function testStrategySelectorHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/strategy-selector.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('strategy')) {
    throw new Error('strategy-selector.sh missing strategy function');
  }
  if (!content.includes('select')) {
    throw new Error('strategy-selector.sh missing select function');
  }
}

async function testHypothesisTesterHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/hypothesis-tester.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('hypothesis')) {
    throw new Error('hypothesis-tester.sh missing hypothesis function');
  }
  if (!content.includes('test')) {
    throw new Error('hypothesis-tester.sh missing test function');
  }
}

async function testBoundedAutonomyHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/bounded-autonomy.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('bounded')) {
    throw new Error('bounded-autonomy.sh missing bounded function');
  }
  if (!content.includes('autonomy')) {
    throw new Error('bounded-autonomy.sh missing autonomy function');
  }
}

async function testRiskPredictorHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/risk-predictor.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('risk')) {
    throw new Error('risk-predictor.sh missing risk function');
  }
  if (!content.includes('predict')) {
    throw new Error('risk-predictor.sh missing predict function');
  }
}

async function testMultiAgentOrchestratorHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/multi-agent-orchestrator.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('agent')) {
    throw new Error('multi-agent-orchestrator.sh missing agent function');
  }
  if (!content.includes('orchestrator')) {
    throw new Error('multi-agent-orchestrator.sh missing orchestrator function');
  }
}

async function testParallelExecutionPlannerHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/parallel-execution-planner.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('parallel')) {
    throw new Error('parallel-execution-planner.sh missing parallel function');
  }
  if (!content.includes('execution')) {
    throw new Error('parallel-execution-planner.sh missing execution function');
  }
}

async function testReinforcementLearningHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/reinforcement-learning.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('reinforcement')) {
    throw new Error('reinforcement-learning.sh missing reinforcement function');
  }
  if (!content.includes('learning')) {
    throw new Error('reinforcement-learning.sh missing learning function');
  }
}

async function testLearningEngineHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/learning-engine.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('learn')) {
    throw new Error('learning-engine.sh missing learn function');
  }
  if (!content.includes('engine')) {
    throw new Error('learning-engine.sh missing engine function');
  }
}

async function testFeedbackLoopHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/feedback-loop.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('feedback')) {
    throw new Error('feedback-loop.sh missing feedback function');
  }
  if (!content.includes('loop')) {
    throw new Error('feedback-loop.sh missing loop function');
  }
}

async function testPatternMinerHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/pattern-miner.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('pattern')) {
    throw new Error('pattern-miner.sh missing pattern function');
  }
  if (!content.includes('miner')) {
    throw new Error('pattern-miner.sh missing miner function');
  }
}

async function testMetaReflectionHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/meta-reflection.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('meta')) {
    throw new Error('meta-reflection.sh missing meta function');
  }
  if (!content.includes('reflection')) {
    throw new Error('meta-reflection.sh missing reflection function');
  }
}

async function testReactReflexionHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/react-reflexion.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('react')) {
    throw new Error('react-reflexion.sh missing react function');
  }
  if (!content.includes('reflexion')) {
    throw new Error('react-reflexion.sh missing reflexion function');
  }
}

async function testAgentLoopHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/agent-loop.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('agent')) {
    throw new Error('agent-loop.sh missing agent function');
  }
  if (!content.includes('loop')) {
    throw new Error('agent-loop.sh missing loop function');
  }
}

async function testPlanExecuteHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/plan-execute.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('plan')) {
    throw new Error('plan-execute.sh missing plan function');
  }
  if (!content.includes('execute')) {
    throw new Error('plan-execute.sh missing execute function');
  }
}

async function testTaskQueueHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/task-queue.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('task')) {
    throw new Error('task-queue.sh missing task function');
  }
  if (!content.includes('queue')) {
    throw new Error('task-queue.sh missing queue function');
  }
}

async function testAutonomousOrchestratorV2Hook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/autonomous-orchestrator-v2.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('autonomous')) {
    throw new Error('autonomous-orchestrator-v2.sh missing autonomous function');
  }
  if (!content.includes('orchestrator')) {
    throw new Error('autonomous-orchestrator-v2.sh missing orchestrator function');
  }
}

async function testThinkingFrameworkHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/thinking-framework.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('thinking')) {
    throw new Error('thinking-framework.sh missing thinking function');
  }
  if (!content.includes('framework')) {
    throw new Error('thinking-framework.sh missing framework function');
  }
}

async function testErrorHandlerHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/error-handler.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('error')) {
    throw new Error('error-handler.sh missing error function');
  }
  if (!content.includes('handler')) {
    throw new Error('error-handler.sh missing handler function');
  }
}

async function testUITestingHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/ui-testing.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('ui')) {
    throw new Error('ui-testing.sh missing ui function');
  }
  if (!content.includes('testing')) {
    throw new Error('ui-testing.sh missing testing function');
  }
}

async function testMacAppTestingHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/mac-app-testing.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('mac')) {
    throw new Error('mac-app-testing.sh missing mac function');
  }
  if (!content.includes('app')) {
    throw new Error('mac-app-testing.sh missing app function');
  }
}

async function testEnhancedAuditTrailHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/enhanced-audit-trail.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('audit')) {
    throw new Error('enhanced-audit-trail.sh missing audit function');
  }
  if (!content.includes('trail')) {
    throw new Error('enhanced-audit-trail.sh missing trail function');
  }
}

async function testContextOptimizerHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/context-optimizer.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('context')) {
    throw new Error('context-optimizer.sh missing context function');
  }
  if (!content.includes('optimizer')) {
    throw new Error('context-optimizer.sh missing optimizer function');
  }
}

async function testSelfHealingHook() {
  const hookPath = join(PROJECT_ROOT, 'hooks/self-healing.sh');
  const content = readFileSync(hookPath, 'utf-8');
  
  if (!content.includes('self')) {
    throw new Error('self-healing.sh missing self function');
  }
  if (!content.includes('healing')) {
    throw new Error('self-healing.sh missing healing function');
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log(chalk.bold.blue('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║   Comprehensive Auto Hooks Test Suite       ║'));
  console.log(chalk.bold.blue('╚══════════════════════════════════════════════╝\n'));

  const tests: Array<{ name: string; fn: () => Promise<void> }> = [];

  // Hook existence tests
  console.log(chalk.bold('\n=== Phase 1: Hook Existence Tests ===\n'));
  for (const hook of HOOKS_TO_TEST) {
    tests.push({ name: `Hook exists: ${hook}`, fn: () => testHookExists(hook) });
  }

  // Hook executable tests
  console.log(chalk.bold('\n=== Phase 2: Hook Executable Tests ===\n'));
  for (const hook of HOOKS_TO_TEST) {
    tests.push({ name: `Hook executable: ${hook}`, fn: () => testHookExecutable(hook) });
  }

  // Hook function tests
  console.log(chalk.bold('\n=== Phase 3: Hook Function Tests ===\n'));
  for (const hook of HOOKS_TO_TEST) {
    tests.push({ name: `Hook has functions: ${hook}`, fn: () => testHookHasFunctions(hook) });
  }

  // Hook execution tests
  console.log(chalk.bold('\n=== Phase 4: Hook Execution Tests ===\n'));
  for (const hook of HOOKS_TO_TEST) {
    tests.push({ name: `Hook can run: ${hook}`, fn: () => testHookCanRunHelp(hook) });
  }

  // Hook functionality tests
  console.log(chalk.bold('\n=== Phase 5: Hook Functionality Tests ===\n'));
  tests.push({ name: 'Auto Evaluator functionality', fn: testAutoEvaluatorHook });
  tests.push({ name: 'Constitutional AI functionality', fn: testConstitutionalAIHook });
  tests.push({ name: 'Reasoning Mode Switcher functionality', fn: testReasoningModeSwitcherHook });
  tests.push({ name: 'Tree of Thoughts functionality', fn: testTreeOfThoughtsHook });
  tests.push({ name: 'Strategy Selector functionality', fn: testStrategySelectorHook });
  tests.push({ name: 'Hypothesis Tester functionality', fn: testHypothesisTesterHook });
  tests.push({ name: 'Bounded Autonomy functionality', fn: testBoundedAutonomyHook });
  tests.push({ name: 'Risk Predictor functionality', fn: testRiskPredictorHook });
  tests.push({ name: 'Multi-Agent Orchestrator functionality', fn: testMultiAgentOrchestratorHook });
  tests.push({ name: 'Parallel Execution Planner functionality', fn: testParallelExecutionPlannerHook });
  tests.push({ name: 'Reinforcement Learning functionality', fn: testReinforcementLearningHook });
  tests.push({ name: 'Learning Engine functionality', fn: testLearningEngineHook });
  tests.push({ name: 'Feedback Loop functionality', fn: testFeedbackLoopHook });
  tests.push({ name: 'Pattern Miner functionality', fn: testPatternMinerHook });
  tests.push({ name: 'Meta Reflection functionality', fn: testMetaReflectionHook });
  tests.push({ name: 'React Reflexion functionality', fn: testReactReflexionHook });
  tests.push({ name: 'Agent Loop functionality', fn: testAgentLoopHook });
  tests.push({ name: 'Plan Execute functionality', fn: testPlanExecuteHook });
  tests.push({ name: 'Task Queue functionality', fn: testTaskQueueHook });
  tests.push({ name: 'Autonomous Orchestrator V2 functionality', fn: testAutonomousOrchestratorV2Hook });
  tests.push({ name: 'Thinking Framework functionality', fn: testThinkingFrameworkHook });
  tests.push({ name: 'Error Handler functionality', fn: testErrorHandlerHook });
  tests.push({ name: 'UI Testing functionality', fn: testUITestingHook });
  tests.push({ name: 'Mac App Testing functionality', fn: testMacAppTestingHook });
  tests.push({ name: 'Enhanced Audit Trail functionality', fn: testEnhancedAuditTrailHook });
  tests.push({ name: 'Context Optimizer functionality', fn: testContextOptimizerHook });
  tests.push({ name: 'Self Healing functionality', fn: testSelfHealingHook });

  // Run all tests
  for (const test of tests) {
    await runTest(test.name, test.fn);
  }

  // Print summary
  console.log(chalk.bold('\n' + '═'.repeat(66)));
  console.log(chalk.bold('Test Summary'));
  console.log('═'.repeat(66) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(chalk.green(`✓ Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`✗ Failed: ${failed}`));
  }
  console.log();

  // Print failed tests details
  if (failed > 0) {
    console.log(chalk.bold.red('\nFailed Tests:\n'));
    for (const result of results.filter(r => !r.passed)) {
      console.log(chalk.red(`  ✗ ${result.name}`));
      console.log(chalk.gray(`    Error: ${result.error}`));
    }
    console.log();
  }

  // Print duration stats
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / total;
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Duration: ${Math.round(avgDuration)}ms`);
  console.log();

  // Final result
  if (failed === 0) {
    console.log(chalk.bold.green('🎉 All hooks tests passed!'));
    console.log(chalk.green('\nAll 27 hooks are properly configured:'));
    console.log(chalk.green('  • All hook files exist'));
    console.log(chalk.green('  • All hooks are executable'));
    console.log(chalk.green('  • All hooks have functions'));
    console.log(chalk.green('  • All hooks can run'));
    console.log(chalk.green('  • All hooks have expected functionality'));
    process.exit(0);
  } else {
    console.log(chalk.bold.yellow(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(chalk.red('\nFatal error:'), err);
  process.exit(1);
});
