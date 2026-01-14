#!/usr/bin/env bun

/**
 * Komplete Kontrol CLI
 * Ultimate AI coding assistant integrating Roo Code, /auto, and advanced autonomous features
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createLLMClient } from './core/llm';
import type { CommandContext } from './cli/types';
import {
  AutoCommand,
  SPARCCommand,
  SwarmCommand,
  ReflectCommand,
  ReflexionCommand,
  ResearchCommand,
  RootCauseCommand,
  CheckpointCommand,
  BuildCommand,
  CollabCommand,
  CompactCommand,
  MultiRepoCommand,
  PersonalityCommand,
  ReCommand,
  ResearchApiCommand,
  VoiceCommand
} from './cli/commands';

const program = new Command();

program
  .name('komplete')
  .description('Ultimate AI coding assistant with autonomous capabilities')
  .version('1.0.0');

/**
 * Initialize command context
 */
async function initializeContext(): Promise<CommandContext> {
  const llmClient = await createLLMClient();

  return {
    llmRouter: llmClient.router,
    llmRegistry: llmClient.registry,
    workDir: process.cwd(),
    autonomousMode: false,
    verbose: false
  };
}

/**
 * /auto - Autonomous mode
 */
program
  .command('auto')
  .description('Enter autonomous mode with ReAct + Reflexion loop')
  .argument('<goal>', 'Goal to achieve autonomously')
  .option('-m, --model <model>', 'Model to use. Supports provider/model syntax (e.g., "glm/glm-4.7", "dolphin-3"). Default: auto-routed')
  .option('-i, --iterations <number>', 'Max iterations (default: 50)', '50')
  .option('-c, --checkpoint <number>', 'Checkpoint every N iterations (default: 10)', '10')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (goal: string, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;
      context.autonomousMode = true;

      const autoCommand = new AutoCommand();
      const result = await autoCommand.execute(context, {
        goal,
        model: options.model,
        maxIterations: parseInt(options.iterations, 10),
        checkpointThreshold: parseInt(options.checkpoint, 10),
        verbose: options.verbose
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /init - Initialize project
 */
program
  .command('init')
  .description('Initialize komplete in current project')
  .action(() => {
    console.log(chalk.green('✅ Komplete initialized'));
    console.log(chalk.gray('Created .komplete/ directory with configuration'));
  });

/**
 * /sparc - SPARC methodology
 */
program
  .command('sparc')
  .description('Execute SPARC methodology (Specification → Pseudocode → Architecture → Refinement → Completion)')
  .argument('<task>', 'Task description')
  .option('-r, --requirements <items...>', 'Requirements list')
  .option('-c, --constraints <items...>', 'Constraints list')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (task: string, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;

      const sparcCommand = new SPARCCommand();
      const result = await sparcCommand.execute(context, {
        task,
        requirements: options.requirements,
        constraints: options.constraints,
        verbose: options.verbose
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /swarm - Distributed agent swarms
 */
program
  .command('swarm')
  .description('Spawn and manage distributed agent swarms for parallel execution')
  .argument('<action>', 'Action: spawn, status, collect, clear')
  .argument('[task]', 'Task description (required for spawn)')
  .option('-n, --count <number>', 'Number of agents (for spawn)', '5')
  .option('-id, --swarm-id <id>', 'Swarm ID (for status/collect)')
  .option('-d, --dir <directory>', 'Working directory')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (action: string, task: string | undefined, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;

      const swarmCommand = new SwarmCommand();
      const result = await swarmCommand.execute(context, {
        action: action as 'spawn' | 'status' | 'collect' | 'clear',
        task,
        agentCount: parseInt(options.count, 10),
        swarmId: options.swarmId,
        workDir: options.dir,
        verbose: options.verbose
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /reflect - ReAct + Reflexion loop
 */
program
  .command('reflect')
  .description('Run ReAct + Reflexion loop (Think → Act → Observe → Reflect)')
  .argument('<goal>', 'Goal to achieve')
  .option('-i, --iterations <number>', 'Number of reflexion cycles (default: 3)', '3')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (goal: string, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;

      const reflectCommand = new ReflectCommand();
      const result = await reflectCommand.execute(context, {
        goal,
        iterations: parseInt(options.iterations, 10),
        verbose: options.verbose
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /reflexion - ReflexionAgent execution
 */
program
  .command('reflexion')
  .description('Execute autonomous tasks with ReflexionAgent (Think → Act → Observe → Reflect loop)')
  .argument('<action>', 'Action: execute, status, metrics')
  .option('-g, --goal <text>', 'Goal to achieve (for execute)')
  .option('-i, --max-iterations <number>', 'Max iterations (default: 30)', '30')
  .option('-m, --preferred-model <model>', 'Preferred LLM model (e.g., glm-4.7, llama-70b)')
  .option('--output-json', 'Output JSON for orchestrator consumption', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (action: string, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;

      const reflexionCommand = new ReflexionCommand();

      let result;
      if (action === 'execute') {
        result = await reflexionCommand.execute(context, {
          goal: options.goal,
          maxIterations: parseInt(options.maxIterations, 10),
          preferredModel: options.preferredModel,
          outputJson: options.outputJson,
          verbose: options.verbose
        });
      } else if (action === 'status') {
        result = await reflexionCommand.status(context, {});
      } else if (action === 'metrics') {
        result = await reflexionCommand.metrics(context, {});
      } else {
        console.error(chalk.red('\nError:'), `Unknown action: ${action}`);
        console.log(chalk.gray('Available actions: execute, status, metrics'));
        process.exit(1);
      }

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /research - Research code patterns and solutions
 */
program
  .command('research')
  .description('Research code patterns, solutions, and best practices')
  .argument('<query>', 'Research query')
  .option('-s, --sources <sources...>', 'Sources: github, memory, web (default: all)', ['github', 'memory'])
  .option('-l, --limit <number>', 'Result limit (default: 10)', '10')
  .option('--lang <languages...>', 'Filter by programming languages')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (query: string, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;

      const researchCommand = new ResearchCommand();
      const result = await researchCommand.execute(context, {
        query,
        sources: options.sources as ('github' | 'memory' | 'web')[],
        limit: parseInt(options.limit, 10),
        language: options.lang,
        verbose: options.verbose
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /rootcause - Root cause analysis
 */
program
  .command('rootcause')
  .description('Perform root cause analysis with regression detection')
  .argument('<action>', 'Action: analyze, verify')
  .option('-b, --bug <description>', 'Bug description (for analyze)')
  .option('-t, --type <type>', 'Bug type (for analyze)')
  .option('--test <command>', 'Test command (for verify)')
  .option('--snapshot <id>', 'Before snapshot ID (for verify)')
  .option('-f, --fix <description>', 'Fix description (for verify)')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (action: string, options: any) => {
    try {
      const context = await initializeContext();
      context.verbose = options.verbose;

      const rootcauseCommand = new RootCauseCommand();
      const result = await rootcauseCommand.execute(context, {
        action: action as 'analyze' | 'verify',
        bugDescription: options.bug,
        bugType: options.type,
        testCommand: options.test,
        beforeSnapshotId: options.snapshot,
        fixDescription: options.fix,
        verbose: options.verbose
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

// Error handling
program.exitOverride((err) => {
  // Help-related errors should exit cleanly
  if (err.code === 'commander.help' || err.code === 'outputHelp' ||
      err.message?.includes('outputHelp') || err.message?.includes('help')) {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

/**
 * /checkpoint - Save session state and generate continuation prompt
 */
program
  .command('checkpoint')
  .description('Save session state to CLAUDE.md and generate continuation prompt')
  .argument('[summary]', 'Optional summary of session work')
  .action(async (summary: string | undefined) => {
    try {
      const context = await initializeContext();
      const checkpointCommand = new CheckpointCommand();
      const result = await checkpointCommand.execute(context, { summary });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /build - Autonomous feature builder
 */
program
  .command('build')
  .description('Build features autonomously by reading architecture, researching patterns, and implementing')
  .argument('[feature-name]', 'Feature name to build')
  .option('--from <file>', 'Use specific architecture document')
  .action(async (featureName: string | undefined, options: any) => {
    try {
      const context = await initializeContext();
      const buildCommand = new BuildCommand();
      const result = await buildCommand.execute(context, {
        feature: featureName,
        from: options.from
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /collab - Real-time collaboration
 */
program
  .command('collab')
  .description('Enable multiple users to work simultaneously with Claude on same project')
  .argument('<action>', 'Action: start, join, status, sync, leave')
  .option('--session <name>', 'Session name (for start)')
  .option('--session-id <id>', 'Session ID (for join)')
  .action(async (action: string, options: any) => {
    try {
      const context = await initializeContext();
      const collabCommand = new CollabCommand();
      const result = await collabCommand.execute(context, {
        action: action as any,
        sessionName: options.session,
        sessionId: options.sessionId
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /compact - Compact memory and optimize context usage
 */
program
  .command('compact')
  .description('Compact memory to optimize context usage and reduce token consumption')
  .argument('[level]', 'Compaction level: aggressive, conservative (default: standard)')
  .action(async (level: string | undefined) => {
    try {
      const context = await initializeContext();
      const compactCommand = new CompactCommand();
      const result = await compactCommand.execute(context, {
        level: level as any
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /commit - Commit changes to version history
 */
program
  .command('commit')
  .description('Commit changes to version history')
  .argument('[message]', 'Commit message')
  .option('--push', 'Push to remote after commit', false)
  .action(async (message: string | undefined, options: any) => {
    try {
      const context = await initializeContext();
      const commitCommand = new CommitCommand();
      const result = await commitCommand.execute(context, {
        message,
        push: options.push
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /multi-repo - Multi-repository orchestration
 */
program
  .command('multi-repo')
  .description('Coordinate work across multiple repositories with dependency tracking')
  .argument('<action>', 'Action: status, add, sync, checkpoint, exec')
  .option('--repos <paths...>', 'Repository paths (for add)')
  .option('--message <text>', 'Checkpoint message')
  .option('--command <cmd>', 'Command to execute (for exec)')
  .action(async (action: string, options: any) => {
    try {
      const context = await initializeContext();
      const multiRepoCommand = new MultiRepoCommand();
      const result = await multiRepoCommand.execute(context, {
        action: action as any,
        repos: options.repos,
        message: options.message,
        command: options.command
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /personality - Custom agent personalities
 */
program
  .command('personality')
  .description('Configure Claude\'s behavior, knowledge focus, and communication style')
  .argument('<action>', 'Action: list, load, create, edit, current')
  .option('--name <name>', 'Personality name (for load/create/edit)')
  .action(async (action: string, options: any) => {
    try {
      const context = await initializeContext();
      const personalityCommand = new PersonalityCommand();
      const result = await personalityCommand.execute(context, {
        action: action as any,
        name: options.name
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /re - Reverse engineering commands
 */
program
  .command('re')
  .description('Extract, analyze, and understand any software')
  .argument('<target>', 'Target: path, URL, or app identifier')
  .option('--action <type>', 'Action: extract, analyze, deobfuscate')
  .action(async (target: string, options: any) => {
    try {
      const context = await initializeContext();
      const reCommand = new ReCommand();
      const result = await reCommand.execute(context, {
        target,
        action: options.action
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /research-api - API & protocol research
 */
program
  .command('research-api')
  .description('Reverse engineer APIs, protocols, and binaries when documentation is lacking')
  .argument('<target>', 'Target: URL, mobile app, protocol, or binary')
  .option('--depth <level>', 'Research depth: quick, deep, forensic')
  .action(async (target: string, options: any) => {
    try {
      const context = await initializeContext();
      const researchApiCommand = new ResearchApiCommand();
      const result = await researchApiCommand.execute(context, {
        target,
        depth: options.depth
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

/**
 * /voice - Voice command interface
 */
program
  .command('voice')
  .description('Control Claude hands-free using voice commands')
  .argument('<action>', 'Action: start, stop, status, settings')
  .action(async (action: string) => {
    try {
      const context = await initializeContext();
      const voiceCommand = new VoiceCommand();
      const result = await voiceCommand.execute(context, {
        action: action as any
      });

      if (!result.success) {
        console.error(chalk.red('\nError:'), result.message);
        process.exit(1);
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('\nFatal error:'), err.message);
      process.exit(1);
    }
  });

program.parse();
