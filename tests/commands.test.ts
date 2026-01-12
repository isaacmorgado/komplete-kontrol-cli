/**
 * Command Parser and Registry Tests
 *
 * Tests for slash command parsing and registry management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Logger, createLogger } from '../src/utils/logger';
import { ErrorHandler, initErrorHandler } from '../src/utils/error-handler';
import {
  CommandParser,
  createCommandParser,
} from '../src/core/commands/parser';
import {
  CommandRegistry,
  createCommandRegistry,
} from '../src/core/commands/registry';
import type { SlashCommand, CommandExecutionContext } from '../src/core/commands/types';

describe('Command Parser', () => {
  let parser: CommandParser;
  let logger: Logger;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    logger = createLogger('CommandParser');
    errorHandler = initErrorHandler({ logger });
    parser = createCommandParser(logger, errorHandler);
  });

  it('should parse command file', async () => {
    // Create a temporary command file
    const tempFile = `/tmp/test-command-${Date.now()}.md`;
    const content = `---
description: Test command
---

Test content with $ARGUMENTS`;
    await Bun.write(tempFile, content);

    const command = await parser.parseCommandFile(tempFile);
    expect(command).toBeDefined();
    expect(command?.name).toBeDefined();
    expect(command?.content).toContain('Test content');
    expect(command?.frontmatter).toBeDefined();

    // Clean up
    await Bun.write(tempFile, '');
  });

  it('should parse command with arguments', async () => {
    const tempFile = `/tmp/test-command-${Date.now()}.md`;
    const content = `---
description: Test command
---

Test content with $1 and $2`;
    await Bun.write(tempFile, content);

    const command = await parser.parseCommandFile(tempFile);
    expect(command).toBeDefined();

    const context: CommandExecutionContext = {
      arguments: ['arg1', 'arg2'],
      variables: {},
    };

    if (command) {
      const processed = parser.processCommand(command, context);
      expect(processed).toContain('arg1');
      expect(processed).toContain('arg2');
    }

    // Clean up
    await Bun.write(tempFile, '');
  });

  it('should process command with variables', async () => {
    const tempFile = `/tmp/test-command-${Date.now()}.md`;
    const content = `---
description: Test command
---

Test content with $ARGUMENTS`;
    await Bun.write(tempFile, content);

    const command = await parser.parseCommandFile(tempFile);
    expect(command).toBeDefined();

    const context: CommandExecutionContext = {
      arguments: ['hello', 'world'],
      variables: {},
    };

    if (command) {
      const processed = parser.processCommand(command, context);
      expect(processed).toContain('hello world');
    }

    // Clean up
    await Bun.write(tempFile, '');
  });

  it('should parse command content directly', () => {
    const content = `---
description: Test command
---

Test content`;
    const command = parser.parseCommandContent(content, 'test.md');
    expect(command).toBeDefined();
    expect(command?.name).toBe('test');
    expect(command?.content).toContain('Test content');
  });

  it('should handle frontmatter with arrays', () => {
    const content = `---
allowed-tools: [Read, Write, Bash]
---

Test content`;
    const command = parser.parseCommandContent(content, 'test.md');
    expect(command).toBeDefined();
    expect(command?.frontmatter.allowedTools).toEqual(['Read', 'Write', 'Bash']);
  });

  it('should handle boolean values in frontmatter', () => {
    const content = `---
use-context: true
use-tools: false
---

Test content`;
    const command = parser.parseCommandContent(content, 'test.md');
    expect(command).toBeDefined();
    expect(command?.frontmatter.useContext).toBe(true);
    expect(command?.frontmatter.useTools).toBe(false);
  });

  it('should extract namespace from path', () => {
    const content = `---
description: Test command
---

Test content`;
    const command = parser.parseCommandContent(content, 'commands/namespace/test.md');
    expect(command).toBeDefined();
    expect(command?.namespace).toBe('namespace');
  });

  it('should handle IF conditional', async () => {
    const tempFile = `/tmp/test-command-${Date.now()}.md`;
    const content = `---
description: Test command
---

$IF($1, yes, no)`;
    await Bun.write(tempFile, content);

    const command = await parser.parseCommandFile(tempFile);

    if (command) {
      const context1: CommandExecutionContext = {
        arguments: ['value'],
        variables: {},
      };
      const processed1 = parser.processCommand(command, context1);
      expect(processed1).toContain('yes');

      const context2: CommandExecutionContext = {
        arguments: [],
        variables: {},
      };
      const processed2 = parser.processCommand(command, context2);
      expect(processed2).toContain('no');
    }

    // Clean up
    await Bun.write(tempFile, '');
  });

  it('should validate frontmatter', () => {
    const validFrontmatter = {
      model: 'sonnet',
      allowedTools: ['Read', 'Write'],
    };
    const isValid = parser.validateFrontmatter(validFrontmatter);
    expect(isValid).toBe(true);
  });

  it('should reject invalid model', () => {
    const invalidFrontmatter = {
      model: 'invalid-model',
    };
    const isValid = parser.validateFrontmatter(invalidFrontmatter);
    expect(isValid).toBe(false);
  });
});

describe('Command Registry', () => {
  let registry: CommandRegistry;
  let logger: Logger;
  let errorHandler: ErrorHandler;
  let parser: CommandParser;

  beforeEach(() => {
    logger = createLogger('CommandRegistry');
    errorHandler = initErrorHandler({ logger });
    parser = createCommandParser(logger, errorHandler);
    registry = createCommandRegistry(logger, errorHandler, parser);
  });

  it('should get command by name after initialization', async () => {
    await registry.initialize();
    const command = registry.getCommand('help');
    expect(command).toBeDefined();
  });

  it('should resolve command', async () => {
    await registry.initialize();
    const resolved = registry.resolveCommand('help');
    expect(resolved).toBeDefined();
    expect(resolved?.command).toBeDefined();
    expect(resolved?.command.name).toBe('help');
  });

  it('should list commands', async () => {
    await registry.initialize();
    const commands = registry.listCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should execute command', async () => {
    await registry.initialize();
    const command = registry.getCommand('help');
    expect(command).toBeDefined();

    if (command) {
      const context: CommandExecutionContext = {
        arguments: [],
        variables: {},
      };

      const result = await registry.executeCommand(command, context);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    }
  });

  it('should handle command execution with errors', async () => {
    await registry.initialize();
    const command = registry.getCommand('help');
    expect(command).toBeDefined();

    if (command) {
      const context: CommandExecutionContext = {
        arguments: [],
        variables: {},
      };

      const result = await registry.executeCommand(command, context);
      // Should succeed even if there are issues
      expect(result).toBeDefined();
    }
  });

  it('should get command count', async () => {
    await registry.initialize();
    const count = registry.getCommandCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should check if initialized', async () => {
    expect(registry.isInitialized()).toBe(false);
    await registry.initialize();
    expect(registry.isInitialized()).toBe(true);
  });

  it('should reload commands', async () => {
    await registry.initialize();
    const count1 = registry.getCommandCount();
    await registry.reload();
    const count2 = registry.getCommandCount();
    expect(count2).toBe(count1);
  });

  it('should get directories', async () => {
    await registry.initialize();
    const dirs = registry.getDirectories();
    expect(dirs).toBeDefined();
    expect(dirs.builtin).toBeDefined();
    expect(dirs.user).toBeDefined();
    expect(dirs.project).toBeDefined();
  });

  it('should list commands with namespace filter', async () => {
    await registry.initialize();
    const commands = registry.listCommands({ namespace: 'common' });
    expect(commands).toBeDefined();
    expect(Array.isArray(commands)).toBe(true);
  });

  it('should list commands with tags filter', async () => {
    await registry.initialize();
    const commands = registry.listCommands({ tags: ['utility'] });
    expect(commands).toBeDefined();
    expect(Array.isArray(commands)).toBe(true);
  });

  it('should list commands with builtin filter', async () => {
    await registry.initialize();
    const commands = registry.listCommands({ includeBuiltin: true });
    expect(commands).toBeDefined();
    expect(Array.isArray(commands)).toBe(true);
  });

  it('should list commands with user filter', async () => {
    await registry.initialize();
    const commands = registry.listCommands({ includeUser: true });
    expect(commands).toBeDefined();
    expect(Array.isArray(commands)).toBe(true);
  });

  it('should resolve command with arguments', async () => {
    await registry.initialize();
    const resolved = registry.resolveCommand('help verbose');
    expect(resolved).toBeDefined();
    expect(resolved?.command).toBeDefined();
    expect(resolved?.arguments).toEqual(['verbose']);
  });

  it('should throw error for empty command', async () => {
    await registry.initialize();
    expect(() => registry.resolveCommand('')).toThrow('Command name is required');
  });

  it('should throw error for non-existent command', async () => {
    await registry.initialize();
    expect(() => registry.resolveCommand('nonexistent-command')).toThrow('Command not found');
  });
});
