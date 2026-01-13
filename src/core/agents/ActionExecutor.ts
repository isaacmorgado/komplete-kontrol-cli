/**
 * ActionExecutor - Real action execution for autonomous agents
 *
 * Executes actual file operations, bash commands, LLM code generation,
 * and tool calls. Replaces placeholder ReflexionAgent methods.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import type { LLMRouter } from '../llm/Router';
import type { Message } from '../llm/types';

const exec = promisify(execCallback);

export interface Action {
  type: 'file_write' | 'file_read' | 'file_edit' | 'command' | 'llm_generate' | 'git_operation' | 'validate_typescript';
  params: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class ActionExecutor {
  constructor(
    private llmRouter: LLMRouter,
    private workingDir: string = process.cwd()
  ) {}

  /**
   * Execute an action based on type
   */
  async execute(action: Action): Promise<ActionResult> {
    try {
      switch (action.type) {
        case 'file_write':
          return await this.executeFileWrite(
            action.params.path,
            action.params.content
          );

        case 'file_read':
          return await this.executeFileRead(action.params.path);

        case 'file_edit':
          return await this.executeFileEdit(
            action.params.path,
            action.params.searchPattern,
            action.params.replacement
          );

        case 'command':
          return await this.executeCommand(action.params.command);

        case 'llm_generate':
          return await this.executeLLMGeneration(
            action.params.prompt,
            action.params.context
          );

        case 'git_operation':
          return await this.executeGitOperation(
            action.params.operation,
            action.params.args
          );

        case 'validate_typescript':
          return await this.validateTypeScript(action.params.files);

        default:
          return {
            success: false,
            output: '',
            error: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        output: '',
        error: err.message
      };
    }
  }

  /**
   * Write content to a file (creates directories if needed)
   */
  private async executeFileWrite(
    filePath: string,
    content: string
  ): Promise<ActionResult> {
    const fullPath = path.resolve(this.workingDir, filePath);
    const dir = path.dirname(fullPath);

    // Check if file exists
    let fileExists = false;
    let existingContent = '';
    try {
      existingContent = await fs.readFile(fullPath, 'utf-8');
      fileExists = true;
    } catch (error) {
      // File doesn't exist, which is fine
      fileExists = false;
    }

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      success: true,
      output: fileExists
        ? `File updated: ${filePath} (${content.length} bytes)`
        : `File created: ${filePath} (${content.length} bytes)`,
      metadata: {
        path: fullPath,
        bytes: content.length,
        lines: content.split('\n').length,
        existed: fileExists,
        previousBytes: fileExists ? existingContent.length : 0
      }
    };
  }

  /**
   * Read content from a file
   */
  private async executeFileRead(filePath: string): Promise<ActionResult> {
    const fullPath = path.resolve(this.workingDir, filePath);

    const content = await fs.readFile(fullPath, 'utf-8');

    return {
      success: true,
      output: content,
      metadata: {
        path: fullPath,
        bytes: content.length,
        lines: content.split('\n').length
      }
    };
  }

  /**
   * Edit file by replacing pattern with replacement
   */
  private async executeFileEdit(
    filePath: string,
    searchPattern: string,
    replacement: string
  ): Promise<ActionResult> {
    const fullPath = path.resolve(this.workingDir, filePath);

    // Read file
    let content = await fs.readFile(fullPath, 'utf-8');

    // Count matches before replacement
    const regex = new RegExp(searchPattern, 'g');
    const matches = content.match(regex);
    const matchCount = matches ? matches.length : 0;

    // Perform replacement
    content = content.replace(regex, replacement);

    // Write back
    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      success: true,
      output: `File edited: ${filePath} (${matchCount} replacements)`,
      metadata: {
        path: fullPath,
        replacements: matchCount
      }
    };
  }

  /**
   * Execute a bash command
   */
  private async executeCommand(command: string): Promise<ActionResult> {
    const { stdout, stderr } = await exec(command, {
      cwd: this.workingDir,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    return {
      success: !stderr || stderr.trim() === '',
      output: stdout,
      error: stderr || undefined,
      metadata: {
        command,
        exitCode: 0
      }
    };
  }

  /**
   * Generate code using LLM
   */
  private async executeLLMGeneration(
    prompt: string,
    context?: string
  ): Promise<ActionResult> {
    const messages: Message[] = [
      {
        role: 'user',
        content: context
          ? `${context}\n\n${prompt}`
          : prompt
      }
    ];

    const response = await this.llmRouter.route(
      { messages },
      {
        taskType: 'coding',
        priority: 'quality'
      }
    );

    // Extract text from response
    const firstContent = response.content[0];
    const generatedCode = firstContent.type === 'text' ? firstContent.text : '';

    return {
      success: generatedCode.length > 0,
      output: generatedCode,
      metadata: {
        prompt: prompt.substring(0, 100) + '...',
        generatedLength: generatedCode.length
      }
    };
  }

  /**
   * Execute git operations
   */
  private async executeGitOperation(
    operation: string,
    args: string[]
  ): Promise<ActionResult> {
    const command = `git ${operation} ${args.join(' ')}`;
    return await this.executeCommand(command);
  }

  /**
   * Validate TypeScript code by running tsc typecheck
   * Returns success if no type errors, includes error details if failed
   */
  async validateTypeScript(
    files?: string[]
  ): Promise<ActionResult> {
    try {
      // Use skipLibCheck to avoid dependency type errors
      const skipLibCheck = '--skipLibCheck';
      const fileArgs = files && files.length > 0 ? files.join(' ') : '';
      const command = `bunx tsc --noEmit ${skipLibCheck} ${fileArgs}`;

      const { stdout, stderr } = await exec(command, {
        cwd: this.workingDir,
        maxBuffer: 1024 * 1024 * 10
      });

      // If exec succeeded, no errors
      return {
        success: true,
        output: 'TypeScript validation passed - no type errors',
        metadata: {
          errorCount: 0,
          files: files || ['all']
        }
      };
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string };

      // tsc exits with non-zero code when there are type errors
      // Errors are in stderr for bunx tsc
      const output = err.stderr || err.stdout || '';
      const hasErrors = output.includes('error TS');

      if (hasErrors) {
        // Count errors
        const errorMatches = output.match(/error TS\d+:/g);
        const errorCount = errorMatches ? errorMatches.length : 0;

        return {
          success: false,
          output,
          error: `TypeScript validation failed with ${errorCount} error(s)`,
          metadata: {
            errorCount,
            files: files || ['all']
          }
        };
      }

      // Non-tsc error (command not found, etc.)
      return {
        success: false,
        output: output,
        error: err.message,
        metadata: {
          files: files || ['all']
        }
      };
    }
  }

  /**
   * Parse a natural language thought into an actionable command
   * Uses LLM to interpret intent and generate structured action
   */
  async parseThoughtToAction(thought: string, goal: string): Promise<Action> {
    const prompt = `
You are an autonomous agent action parser. Convert the following thought into a structured action.

Goal: ${goal}
Thought: ${thought}

Available action types:
1. file_write: Create or overwrite a file
2. file_read: Read a file's contents
3. file_edit: Edit a file by replacing text
4. command: Execute a bash command
5. llm_generate: Generate code using LLM
6. git_operation: Perform git operations

Return ONLY a JSON object with this structure:
{
  "type": "action_type",
  "params": {
    // action-specific parameters
  }
}

Examples:
- "Create types.ts file" → {"type": "file_write", "params": {"path": "types.ts", "content": "..."}}
- "Run TypeScript compiler" → {"type": "command", "params": {"command": "tsc --noEmit"}}
- "Generate Logger class" → {"type": "llm_generate", "params": {"prompt": "Generate TypeScript Logger class"}}

Return JSON now:
`.trim();

    const response = await this.llmRouter.route(
      {
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a JSON generator. Return ONLY valid JSON, no explanation.'
      },
      {
        taskType: 'reasoning',
        priority: 'speed'
      }
    );

    // Extract and parse JSON
    const firstContent = response.content[0];
    const jsonText = firstContent.type === 'text' ? firstContent.text : '{}';

    try {
      // Remove markdown code blocks if present
      const cleanJson = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const action = JSON.parse(cleanJson) as Action;
      return action;
    } catch (error) {
      // Fallback: simple heuristic parsing
      return this.heuristicParse(thought);
    }
  }

  /**
   * Heuristic action parsing (fallback when LLM fails)
   */
  private heuristicParse(thought: string): Action {
    const lowerThought = thought.toLowerCase();

    // File operations
    if (lowerThought.includes('create') || lowerThought.includes('write')) {
      // Extract filename from thought
      const fileMatch = thought.match(/(\w+\.ts)/);
      const filename = fileMatch ? fileMatch[1] : 'unknown.ts';

      return {
        type: 'file_write',
        params: {
          path: filename,
          content: '// Generated file\n'
        }
      };
    }

    // Read operations
    if (lowerThought.includes('read') || lowerThought.includes('check')) {
      const fileMatch = thought.match(/(\w+\.ts)/);
      const filename = fileMatch ? fileMatch[1] : 'unknown.ts';

      return {
        type: 'file_read',
        params: {
          path: filename
        }
      };
    }

    // Command execution
    if (lowerThought.includes('run') || lowerThought.includes('execute')) {
      return {
        type: 'command',
        params: {
          command: 'echo "Command parsed from thought"'
        }
      };
    }

    // Default: LLM generation
    return {
      type: 'llm_generate',
      params: {
        prompt: thought
      }
    };
  }
}
