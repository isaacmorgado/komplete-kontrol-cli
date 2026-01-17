/**
 * Command Router
 * Routes commands to either traditional CLI or new TUI interface
 */

import { CommandContext } from '../cli/types';
import { runTUI } from './App';

export interface CommandRoute {
  command: string;
  description: string;
  handler: (context: CommandContext, args: string[]) => Promise<void>;
}

export class CommandRouter {
  private routes: Map<string, CommandRoute> = new Map();
  private useTUI: boolean = false;

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Routes will be registered by commands
    // This is a stub for Phase 1
  }

  registerRoute(route: CommandRoute): void {
    this.routes.set(route.command, route);
  }

  setTUI(enabled: boolean): void {
    this.useTUI = enabled;
  }

  async route(command: string, args: string[], context: CommandContext): Promise<void> {
    const route = this.routes.get(command);
    
    if (!route) {
      console.error(`Unknown command: ${command}`);
      console.log('Available commands:', Array.from(this.routes.keys()).join(', '));
      process.exit(1);
      return;
    }

    if (this.useTUI) {
      // Use new TUI interface
      await runTUI(command, args);
    } else {
      // Use traditional CLI interface
      await route.handler(context, args);
    }
  }

  listCommands(): CommandRoute[] {
    return Array.from(this.routes.values());
  }

  getCommandInfo(command: string): CommandRoute | undefined {
    return this.routes.get(command);
  }
}

export const commandRouter = new CommandRouter();
