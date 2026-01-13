/**
 * Bash Bridge - Execute bash hooks from TypeScript
 *
 * Allows TypeScript to call bash hooks with proper error handling
 * Maintains compatibility with existing autonomous system
 */

import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Bash execution result
 */
export interface BashResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a bash command
 */
export async function executeBash(command: string, cwd?: string): Promise<BashResult> {
  return new Promise((resolve) => {
    const proc = spawn('bash', ['-c', command], {
      cwd: cwd || process.cwd(),
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code || 0
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        stderr: stderr + '\n' + err.message,
        exitCode: 1
      });
    });
  });
}

/**
 * Execute a bash hook script
 */
export async function executeHook(
  hookName: string,
  args: string[] = [],
  hooksDir: string = '~/.claude/hooks'
): Promise<BashResult> {
  // Expand tilde
  const expandedDir = hooksDir.replace(/^~/, process.env.HOME || '');
  const hookPath = path.join(expandedDir, hookName);

  // Check if hook exists
  try {
    await fs.access(hookPath);
  } catch {
    return {
      success: false,
      stdout: '',
      stderr: `Hook not found: ${hookPath}`,
      exitCode: 127
    };
  }

  // Execute hook
  const command = `"${hookPath}" ${args.map(a => `"${a}"`).join(' ')}`;
  return executeBash(command);
}

/**
 * Call memory-manager.sh
 */
export class MemoryManagerBridge {
  private hookPath: string;

  constructor(hooksDir: string = '~/.claude/hooks') {
    const expandedDir = hooksDir.replace(/^~/, process.env.HOME || '');
    this.hookPath = path.join(expandedDir, 'memory-manager.sh');
  }

  /**
   * Set current task
   */
  async setTask(task: string, context: string): Promise<boolean> {
    const result = await executeBash(`"${this.hookPath}" set-task "${task}" "${context}"`);
    return result.success;
  }

  /**
   * Add context note
   */
  async addContext(note: string, relevance: number = 8): Promise<boolean> {
    const result = await executeBash(`"${this.hookPath}" add-context "${note}" ${relevance}`);
    return result.success;
  }

  /**
   * Search memory with scoring
   */
  async rememberScored(query: string): Promise<string> {
    const result = await executeBash(`"${this.hookPath}" remember-scored "${query}"`);
    return result.success ? result.stdout : '';
  }

  /**
   * Record episode
   */
  async recordEpisode(
    type: string,
    description: string,
    outcome: string,
    details: string
  ): Promise<boolean> {
    const result = await executeBash(
      `"${this.hookPath}" record "${type}" "${description}" "${outcome}" "${details}"`
    );
    return result.success;
  }

  /**
   * Add fact
   */
  async addFact(
    category: string,
    key: string,
    value: string,
    confidence: number = 0.9
  ): Promise<boolean> {
    const result = await executeBash(
      `"${this.hookPath}" add-fact "${category}" "${key}" "${value}" ${confidence}`
    );
    return result.success;
  }

  /**
   * Add pattern
   */
  async addPattern(patternType: string, trigger: string, solution: string): Promise<boolean> {
    const result = await executeBash(
      `"${this.hookPath}" add-pattern "${patternType}" "${trigger}" "${solution}"`
    );
    return result.success;
  }

  /**
   * Get working memory
   */
  async getWorking(): Promise<string> {
    const result = await executeBash(`"${this.hookPath}" get-working`);
    return result.success ? result.stdout : '';
  }
}

/**
 * Call coordinator.sh
 */
export class CoordinatorBridge {
  private hookPath: string;

  constructor(hooksDir: string = '~/.claude/hooks') {
    const expandedDir = hooksDir.replace(/^~/, process.env.HOME || '');
    this.hookPath = path.join(expandedDir, 'coordinator.sh');
  }

  /**
   * Execute a task through coordinator
   */
  async executeTask(
    goal: string,
    context: string,
    mode: 'reflexive' | 'deliberate' | 'reactive' = 'reflexive'
  ): Promise<BashResult> {
    return executeBash(`"${this.hookPath}" execute "${goal}" "${context}" "${mode}"`);
  }

  /**
   * Route a command
   */
  async routeCommand(command: string, context: string): Promise<BashResult> {
    return executeBash(`"${this.hookPath}" route "${command}" "${context}"`);
  }
}

/**
 * Execute project commands
 */
export async function executeProjectCommand(
  command: string,
  projectRoot?: string
): Promise<BashResult> {
  const cwd = projectRoot || process.cwd();
  return executeBash(command, cwd);
}

/**
 * Get git status
 */
export async function getGitStatus(projectRoot?: string): Promise<string> {
  const result = await executeProjectCommand('git status --short', projectRoot);
  return result.stdout;
}

/**
 * Run tests
 */
export async function runTests(
  testCommand: string = 'bun test',
  projectRoot?: string
): Promise<BashResult> {
  return executeProjectCommand(testCommand, projectRoot);
}
