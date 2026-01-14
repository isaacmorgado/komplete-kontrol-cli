import type { CommandContext, CommandResult } from '../types';
import { ReflexionAgent } from '../../core/agents/reflexion';
import { LLMRouter } from '../../core/llm/Router';
import { createDefaultRegistry } from '../../core/llm/providers/ProviderFactory';
import chalk from 'chalk';

export interface ReflexionOptions {
  goal?: string;
  maxIterations?: number;
  preferredModel?: string;
  outputJson?: boolean;
  verbose?: boolean;
}

export interface ReflexionResult {
  success: boolean;
  iterations: number;
  filesCreated: number;
  filesModified: number;
  linesChanged: number;
  stagnationDetected: boolean;
  goalAchieved: boolean;
  elapsedTime: number;
  finalObservation: string;
}

/**
 * ReflexionCommand - CLI interface for ReflexionAgent
 *
 * Provides autonomous task execution with ReAct+Reflexion pattern:
 * - Think: Reason about next action
 * - Act: Execute file operations or shell commands
 * - Observe: Capture results with filename context
 * - Reflect: Self-critique and learn from outcomes
 *
 * Usage:
 *   bun run kk reflexion execute --goal "Create calculator" --max-iterations 30
 *   bun run kk reflexion execute --goal "Build REST API" --preferred-model glm-4.7
 *   bun run kk reflexion status   (check ongoing execution)
 *   bun run kk reflexion metrics  (view performance stats)
 */
export class ReflexionCommand {
  name = 'reflexion';
  private router?: LLMRouter;

  /**
   * Execute a goal using ReflexionAgent
   */
  async execute(context: CommandContext, options: ReflexionOptions): Promise<CommandResult> {
    const startTime = Date.now();

    // Validate options
    if (!options.goal) {
      return {
        success: false,
        message: 'Error: --goal parameter is required\nExample: bun run kk reflexion execute --goal "Create calculator app"'
      };
    }

    const maxIterations = options.maxIterations || 30;
    const preferredModel = options.preferredModel;
    const outputJson = options.outputJson ?? false;
    const verbose = options.verbose ?? false;

    try {
      // Initialize LLM Router
      if (!this.router) {
        const registry = await createDefaultRegistry();
        this.router = new LLMRouter(registry);
      }

      if (!outputJson) {
        console.log(chalk.bold('\n🤖 ReflexionAgent Execution\n'));
        console.log(chalk.cyan(`Goal: ${options.goal}`));
        console.log(chalk.gray(`Max Iterations: ${maxIterations}`));
        if (preferredModel) {
          console.log(chalk.gray(`Preferred Model: ${preferredModel}`));
        }
        console.log('');
      }

      // Create agent
      const agent = new ReflexionAgent(options.goal, this.router, preferredModel);

      let cycles = 0;
      let lastInput = 'Start task';
      let stagnationDetected = false;
      let goalAchieved = false;
      let finalObservation = '';

      // Execute cycles
      while (cycles < maxIterations) {
        cycles++;

        if (!outputJson && verbose) {
          console.log(chalk.yellow(`\n--- Cycle ${cycles}/${maxIterations} ---`));
        }

        const result = await agent.cycle(lastInput);
        finalObservation = result.observation;

        // JSON output for orchestrator consumption
        if (outputJson) {
          console.log(JSON.stringify({
            cycle: cycles,
            thought: result.thought.substring(0, 200) + (result.thought.length > 200 ? '...' : ''),
            action: result.action,
            observation: result.observation.substring(0, 200) + (result.observation.length > 200 ? '...' : ''),
            reflection: result.reflection?.substring(0, 200) + (result.reflection && result.reflection.length > 200 ? '...' : '')
          }));
        } else if (verbose) {
          console.log(chalk.white(`Thought: ${result.thought.substring(0, 150)}...`));
          console.log(chalk.green(`Action: ${result.action}`));
          console.log(chalk.blue(`Observation: ${result.observation.substring(0, 150)}...`));
          if (result.reflection) {
            console.log(chalk.magenta(`Reflection: ${result.reflection.substring(0, 150)}...`));
          }
        } else {
          // Minimal progress output
          process.stdout.write('.');
        }

        // Check for completion signals
        const metrics = agent.getMetrics();

        // Stagnation detection
        if (result.observation.includes('No progress detected') ||
            result.observation.includes('stagnation')) {
          stagnationDetected = true;
          if (!outputJson) {
            console.log(chalk.yellow('\n⚠️  Stagnation detected - stopping early'));
          }
          break;
        }

        // Goal achievement (simple heuristic: files created and no errors)
        if (metrics.filesCreated > 0 || metrics.filesModified > 0) {
          const hasErrors = result.observation.toLowerCase().includes('error') ||
                           result.observation.toLowerCase().includes('failed');
          if (!hasErrors && cycles > 2) {
            goalAchieved = true;
            if (!outputJson) {
              console.log(chalk.green('\n✅ Goal appears achieved'));
            }
            break;
          }
        }

        lastInput = result.observation;
      }

      // Get final metrics
      const metrics = agent.getMetrics();
      const elapsedTime = Date.now() - startTime;

      const resultData: ReflexionResult = {
        success: goalAchieved || (metrics.filesCreated + metrics.filesModified > 0),
        iterations: cycles,
        filesCreated: metrics.filesCreated,
        filesModified: metrics.filesModified,
        linesChanged: metrics.linesChanged,
        stagnationDetected,
        goalAchieved,
        elapsedTime,
        finalObservation: finalObservation.substring(0, 500)
      };

      // Output final results
      if (outputJson) {
        console.log(JSON.stringify({ status: 'complete', ...resultData }));
      } else {
        console.log('\n');
        console.log(chalk.bold('📊 Execution Summary:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.white(`Status: ${resultData.success ? chalk.green('Success') : chalk.yellow('Incomplete')}`));
        console.log(chalk.white(`Iterations: ${resultData.iterations}`));
        console.log(chalk.white(`Files Created: ${resultData.filesCreated}`));
        console.log(chalk.white(`Files Modified: ${resultData.filesModified}`));
        console.log(chalk.white(`Lines Changed: ${resultData.linesChanged}`));
        console.log(chalk.white(`Elapsed Time: ${(elapsedTime / 1000).toFixed(2)}s`));
        if (stagnationDetected) {
          console.log(chalk.yellow('Stagnation: Detected'));
        }
        console.log('');
      }

      return {
        success: resultData.success,
        message: resultData.success
          ? `Goal achieved in ${resultData.iterations} iterations`
          : `Task incomplete after ${resultData.iterations} iterations`,
        data: resultData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (outputJson) {
        console.log(JSON.stringify({
          status: 'error',
          error: errorMessage,
          iterations: 0
        }));
      }

      return {
        success: false,
        message: `ReflexionAgent error: ${errorMessage}`
      };
    }
  }

  /**
   * Show status of ongoing execution
   * (Future: track execution state in persistent storage)
   */
  async status(_context: CommandContext, _options: ReflexionOptions): Promise<CommandResult> {
    return {
      success: true,
      message: 'Status tracking not yet implemented.\nFuture: Will show ongoing executions and their progress.'
    };
  }

  /**
   * Show aggregated metrics from past executions
   * (Future: store metrics in memory system)
   */
  async metrics(_context: CommandContext, _options: ReflexionOptions): Promise<CommandResult> {
    return {
      success: true,
      message: 'Metrics tracking not yet implemented.\nFuture: Will show aggregated performance stats from past runs.'
    };
  }
}
