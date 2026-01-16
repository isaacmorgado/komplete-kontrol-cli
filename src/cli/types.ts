/**
 * CLI Types and Interfaces
 */

import type { LLMRouter } from '../core/llm';
import type { ProviderRegistry } from '../core/llm/providers/ProviderFactory';

/**
 * Command context - shared state across all commands
 */
export interface CommandContext {
  // LLM integration
  llmRouter: LLMRouter;
  llmRegistry: ProviderRegistry;

  // Working directory
  workDir: string;

  // Autonomous mode state
  autonomousMode: boolean;

  // Verbose output
  verbose: boolean;
}

/**
 * Command result
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

/**
 * Base command interface
 */
export interface ICommand {
  name: string;
  description: string;
  execute(context: CommandContext, args: any): Promise<CommandResult>;
}

/**
 * Autonomous mode configuration
 */
export interface AutoConfig {
  goal: string;
  maxIterations?: number;
  checkpointThreshold?: number;
  model?: string;
  verbose?: boolean;
  context?: string;
}
