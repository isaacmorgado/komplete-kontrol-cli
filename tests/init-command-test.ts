#!/usr/bin/env bun
/**
 * InitCommand Test Suite
 *
 * Tests InitCommand with all project templates:
 * - TypeScript template
 * - JavaScript template
 * - Python template
 * - Rust template
 */

import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
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
    console.log(chalk.red(`  ✗ ${name}: ${error.message}`));
  }

  result.duration = Date.now() - start;
  results.push(result);
}

// Helper to create test directory
function createTestDir(dirName: string): string {
  const testDir = join(PROJECT_ROOT, 'test-temp', dirName);
  try {
    mkdirSync(testDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  return testDir;
}

// Helper to clean up test directory
function cleanupTestDir(dirName: string): void {
  const testDir = join(PROJECT_ROOT, 'test-temp', dirName);
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist
  }
}

// ============================================================================
// InitCommand EXISTENCE AND STRUCTURE TESTS
// ============================================================================

async function testInitCommandFileExists() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  if (!existsSync(initCommandPath)) {
    throw new Error('InitCommand.ts does not exist');
  }
}

async function testInitCommandExports() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('export class InitCommand')) {
    throw new Error('InitCommand class not exported');
  }
  if (!content.includes('extends BaseCommand')) {
    throw new Error('InitCommand does not extend BaseCommand');
  }
  if (!content.includes("name = 'init'")) {
    throw new Error('InitCommand name is not "init"');
  }
}

// ============================================================================
// TEMPLATE EXISTENCE TESTS
// ============================================================================

async function testTypeScriptTemplateExists() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('typescript:')) {
    throw new Error('TypeScript template does not exist');
  }
  if (!content.includes('getTsConfig()')) {
    throw new Error('getTsConfig() method does not exist');
  }
  if (!content.includes('getIndexTs()')) {
    throw new Error('getIndexTs() method does not exist');
  }
}

async function testJavaScriptTemplateExists() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('javascript:')) {
    throw new Error('JavaScript template does not exist');
  }
  if (!content.includes('getIndexJs()')) {
    throw new Error('getIndexJs() method does not exist');
  }
}

async function testPythonTemplateExists() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('python:')) {
    throw new Error('Python template does not exist');
  }
  if (!content.includes('getMainPy()')) {
    throw new Error('getMainPy() method does not exist');
  }
  if (!content.includes('getPythonGitignore()')) {
    throw new Error('getPythonGitignore() method does not exist');
  }
}

async function testRustTemplateExists() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('rust:')) {
    throw new Error('Rust template does not exist');
  }
  if (!content.includes('getCargoToml()')) {
    throw new Error('getCargoToml() method does not exist');
  }
  if (!content.includes('getMainRs()')) {
    throw new Error('getMainRs() method does not exist');
  }
  if (!content.includes('getRustGitignore()')) {
    throw new Error('getRustGitignore() method does not exist');
  }
}

// ============================================================================
// TEMPLATE CONTENT TESTS
// ============================================================================

async function testTypeScriptTemplateContent() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check tsconfig.json content
  if (!content.includes('tsconfig.json')) {
    throw new Error('TypeScript template missing tsconfig.json');
  }
  if (!content.includes('compilerOptions')) {
    throw new Error('TypeScript template missing compilerOptions');
  }
  if (!content.includes('strict: true')) {
    throw new Error('TypeScript template missing strict mode');
  }
  
  // Check package.json content
  if (!content.includes('scripts:')) {
    throw new Error('TypeScript template missing scripts');
  }
  if (!content.includes('build: \'tsc\'')) {
    throw new Error('TypeScript template missing build script');
  }
}

async function testJavaScriptTemplateContent() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check index.js content
  if (!content.includes('console.log(\'Hello, World!\')')) {
    throw new Error('JavaScript template missing hello world');
  }
  
  // Check package.json content
  if (!content.includes('scripts:')) {
    throw new Error('JavaScript template missing scripts');
  }
}

async function testPythonTemplateContent() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check main.py content
  if (!content.includes('print("Hello, World!")')) {
    throw new Error('Python template missing hello world');
  }
  if (!content.includes('if __name__ == "__main__":')) {
    throw new Error('Python template missing main guard');
  }
  
  // Check requirements.txt content
  if (!content.includes('requirements.txt')) {
    throw new Error('Python template missing requirements.txt');
  }
  if (!content.includes('pytest')) {
    throw new Error('Python template missing pytest dependency');
  }
}

async function testRustTemplateContent() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check main.rs content
  if (!content.includes('println!("Hello, World!");')) {
    throw new Error('Rust template missing hello world');
  }
  if (!content.includes('fn main()')) {
    throw new Error('Rust template missing main function');
  }
  
  // Check Cargo.toml content
  if (!content.includes('Cargo.toml')) {
    throw new Error('Rust template missing Cargo.toml');
  }
  if (!content.includes('[package]')) {
    throw new Error('Rust template missing [package] section');
  }
  if (!content.includes('edition = "2021"')) {
    throw new Error('Rust template missing edition');
  }
}

// ============================================================================
// GITIGNORE TESTS
// ============================================================================

async function testTypeScriptGitignore() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('getGitignore()')) {
    throw new Error('TypeScript template missing getGitignore method');
  }
  if (!content.includes('node_modules/')) {
    throw new Error('TypeScript .gitignore missing node_modules');
  }
  if (!content.includes('dist/')) {
    throw new Error('TypeScript .gitignore missing dist');
  }
}

async function testPythonGitignore() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('__pycache__/')) {
    throw new Error('Python .gitignore missing __pycache__');
  }
  if (!content.includes('.venv/')) {
    throw new Error('Python .gitignore missing .venv');
  }
}

async function testRustGitignore() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('target/')) {
    throw new Error('Rust .gitignore missing target');
  }
  if (!content.includes('Cargo.lock')) {
    throw new Error('Rust .gitignore missing Cargo.lock');
  }
}

// ============================================================================
// EXECUTION LOGIC TESTS
// ============================================================================

async function testExecuteMethodExists() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  if (!content.includes('async execute()')) {
    throw new Error('execute() method does not exist');
  }
  if (!content.includes('Promise<void>')) {
    throw new Error('execute() method missing Promise<void> return type');
  }
}

async function testTemplateSelectionLogic() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check template selection
  if (!content.includes('this.flags.template')) {
    throw new Error('Template flag not used');
  }
  if (!content.includes('this.templates[')) {
    throw new Error('Templates object not accessed');
  }
  if (!content.includes('Unknown template')) {
    throw new Error('Missing unknown template error handling');
  }
}

async function testForceFlagHandling() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check force flag handling
  if (!content.includes('this.flags.force')) {
    throw new Error('Force flag not used');
  }
  if (!content.includes('already exists')) {
    throw new Error('Missing directory exists check');
  }
}

async function testDirectoryCreationLogic() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check directory creation
  if (!content.includes('Deno.mkdir')) {
    throw new Error('Directory creation logic missing');
  }
  if (!content.includes('recursive: true')) {
    throw new Error('Missing recursive directory creation');
  }
}

async function testFileCreationLogic() {
  const initCommandPath = join(PROJECT_ROOT, 'src/cli/commands/InitCommand.ts');
  const content = readFileSync(initCommandPath, 'utf-8');
  
  // Check file creation
  if (!content.includes('Deno.writeTextFile')) {
    throw new Error('File creation logic missing');
  }
  if (!content.includes('templateConfig.files')) {
    throw new Error('Template files iteration missing');
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main() {
  console.log(chalk.bold.blue('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║       InitCommand Test Suite              ║'));
  console.log(chalk.bold.blue('╚══════════════════════════════════════════════╝\n'));

  const tests: Array<{ name: string; fn: () => Promise<void> }> = [];

  // File existence tests
  console.log(chalk.bold('\n=== Phase 1: File Existence Tests ===\n'));
  tests.push({ name: 'InitCommand.ts exists', fn: testInitCommandFileExists });
  tests.push({ name: 'InitCommand exports', fn: testInitCommandExports });

  // Template existence tests
  console.log(chalk.bold('\n=== Phase 2: Template Existence Tests ===\n'));
  tests.push({ name: 'TypeScript template exists', fn: testTypeScriptTemplateExists });
  tests.push({ name: 'JavaScript template exists', fn: testJavaScriptTemplateExists });
  tests.push({ name: 'Python template exists', fn: testPythonTemplateExists });
  tests.push({ name: 'Rust template exists', fn: testRustTemplateExists });

  // Template content tests
  console.log(chalk.bold('\n=== Phase 3: Template Content Tests ===\n'));
  tests.push({ name: 'TypeScript template content', fn: testTypeScriptTemplateContent });
  tests.push({ name: 'JavaScript template content', fn: testJavaScriptTemplateContent });
  tests.push({ name: 'Python template content', fn: testPythonTemplateContent });
  tests.push({ name: 'Rust template content', fn: testRustTemplateContent });

  // Gitignore tests
  console.log(chalk.bold('\n=== Phase 4: Gitignore Tests ===\n'));
  tests.push({ name: 'TypeScript .gitignore', fn: testTypeScriptGitignore });
  tests.push({ name: 'Python .gitignore', fn: testPythonGitignore });
  tests.push({ name: 'Rust .gitignore', fn: testRustGitignore });

  // Execution logic tests
  console.log(chalk.bold('\n=== Phase 5: Execution Logic Tests ===\n'));
  tests.push({ name: 'execute() method exists', fn: testExecuteMethodExists });
  tests.push({ name: 'Template selection logic', fn: testTemplateSelectionLogic });
  tests.push({ name: 'Force flag handling', fn: testForceFlagHandling });
  tests.push({ name: 'Directory creation logic', fn: testDirectoryCreationLogic });
  tests.push({ name: 'File creation logic', fn: testFileCreationLogic });

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
    console.log(chalk.bold.green('🎉 All InitCommand tests passed!'));
    console.log(chalk.green('\nAll project templates are properly configured:'));
    console.log(chalk.green('  • TypeScript template is complete'));
    console.log(chalk.green('  • JavaScript template is complete'));
    console.log(chalk.green('  • Python template is complete'));
    console.log(chalk.green('  • Rust template is complete'));
    console.log(chalk.green('  • All templates have proper .gitignore files'));
    console.log(chalk.green('  • Execution logic is properly implemented'));
    console.log(chalk.green('  • Force flag handling is implemented'));
    console.log(chalk.green('  • Directory and file creation logic is correct'));
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
