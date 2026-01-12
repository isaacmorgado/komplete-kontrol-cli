/**
 * Phase 4 Feature Tests
 *
 * Tests for God Mode features:
 * - REPL Interface
 * - Shadow Mode
 * - Hook System
 * - Context Ignore
 * - Memory File Manager
 */

import { test, expect, describe } from 'bun:test';
import {
  REPLInterface,
  REPLMode,
  ShadowMode,
  ShadowState,
} from '../src/core/healing';
import {
  HookManager,
  HookType,
  HookPriority,
} from '../src/core/hooks';
import {
  ContextIgnore,
  MemoryFileManager,
} from '../src/core/context';

describe('Phase 4: REPL Interface', () => {
  test('should initialize REPL', async () => {
    const repl = new REPLInterface({
      mode: REPLMode.INTERACTIVE,
      enableHistory: true,
    });

    const initialized = await repl.initialize();
    expect(initialized).toBe(true);

    const state = repl.getState();
    expect(state.mode).toBe(REPLMode.INTERACTIVE);
    expect(state.isRunning).toBe(true);

    repl.stop();
  });

  test('should execute code in REPL', async () => {
    const repl = new REPLInterface();
    await repl.initialize();

    const result = await repl.execute('2 + 2');
    expect(result.success).toBe(true);
    expect(result.value).toBe(4);

    repl.stop();
  });

  test('should track history', async () => {
    const repl = new REPLInterface({
      enableHistory: true,
      historySize: 10,
    });
    await repl.initialize();

    await repl.execute('1 + 1');
    await repl.execute('2 + 2');
    await repl.execute('3 + 3');

    const history = repl.getHistory();
    expect(history.length).toBe(3);

    repl.stop();
  });

  test('should handle REPL commands', async () => {
    const repl = new REPLInterface();
    await repl.initialize();

    const result = await repl.execute('.help');
    expect(result.success).toBe(true);
    expect(result.output).toContain('help');

    repl.stop();
  });

  test('should support variables', async () => {
    const repl = new REPLInterface();
    await repl.initialize();

    repl.setVariable('x', 10);
    repl.setVariable('y', 20);

    const result = await repl.execute('x + y');
    expect(result.success).toBe(true);
    expect(result.value).toBe(30);

    repl.stop();
  });
});

describe('Phase 4: Shadow Mode', () => {
  test('should initialize shadow mode', () => {
    const shadow = new ShadowMode();
    expect(shadow).toBeDefined();
  });

  test('should execute speculative code', async () => {
    const shadow = new ShadowMode();

    const executionId = await shadow.executeSpeculative(
      'console.log("Hello Shadow");',
      {
        workingDirectory: process.cwd(),
        parallel: false,
      }
    );

    expect(executionId).toContain('shadow_');

    const result = await shadow.waitForCompletion(executionId, 5000);
    expect(result.state).toBe(ShadowState.COMPLETE);
  });

  test('should detect conflicts', async () => {
    const shadow = new ShadowMode();

    const executionId = await shadow.executeSpeculative(
      'throw new Error("Test error");',
      {
        workingDirectory: process.cwd(),
        parallel: false,
      }
    );

    const result = await shadow.waitForCompletion(executionId, 5000);
    expect(result.canApply).toBe(false);
    expect(result.recommendation).toBe('discard');
  });

  test('should track execution history', async () => {
    const shadow = new ShadowMode();

    const executionId1 = await shadow.executeSpeculative('console.log("Test 1");', {
      workingDirectory: process.cwd(),
      parallel: false,
    });

    const executionId2 = await shadow.executeSpeculative('console.log("Test 2");', {
      workingDirectory: process.cwd(),
      parallel: false,
    });

    // Wait for completion and discard to move to history
    await shadow.waitForCompletion(executionId1, 5000);
    await shadow.waitForCompletion(executionId2, 5000);

    shadow.discard(executionId1);
    shadow.discard(executionId2);

    const history = shadow.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });
});

describe('Phase 4: Hook System', () => {
  test('should initialize hook manager', () => {
    const hookManager = new HookManager({
      enableStateMutex: true,
      defaultTimeout: 5000,
    });

    expect(hookManager).toBeDefined();
  });

  test('should register hooks', () => {
    const hookManager = new HookManager();

    const hookId = hookManager.register({
      type: HookType.BEFORE,
      operationPattern: 'test.*',
      fn: async (context) => {
        context.state.set('executed', true);
      },
      priority: HookPriority.NORMAL,
      enabled: true,
    });

    expect(hookId).toContain('hook_');
  });

  test('should execute before hooks', async () => {
    const hookManager = new HookManager();

    let executed = false;

    hookManager.register({
      type: HookType.BEFORE,
      operationPattern: 'test.operation',
      fn: async () => {
        executed = true;
      },
      priority: HookPriority.NORMAL,
      enabled: true,
    });

    await hookManager.executeBefore('test.operation');
    expect(executed).toBe(true);
  });

  test('should execute hooks in priority order', async () => {
    const hookManager = new HookManager();
    const executionOrder: number[] = [];

    hookManager.register({
      type: HookType.BEFORE,
      operationPattern: 'test.*',
      fn: async () => {
        executionOrder.push(1);
      },
      priority: HookPriority.LOWEST,
      enabled: true,
    });

    hookManager.register({
      type: HookType.BEFORE,
      operationPattern: 'test.*',
      fn: async () => {
        executionOrder.push(2);
      },
      priority: HookPriority.HIGHEST,
      enabled: true,
    });

    await hookManager.executeBefore('test.operation');
    expect(executionOrder).toEqual([2, 1]);
  });

  test('should share state between hooks', async () => {
    const hookManager = new HookManager();

    hookManager.register({
      type: HookType.BEFORE,
      operationPattern: 'test.*',
      fn: async (context) => {
        context.state.set('value', 42);
      },
      priority: HookPriority.HIGH,
      enabled: true,
    });

    hookManager.register({
      type: HookType.BEFORE,
      operationPattern: 'test.*',
      fn: async (context) => {
        const value = context.state.get('value');
        context.state.set('doubled', (value as number) * 2);
      },
      priority: HookPriority.LOW,
      enabled: true,
    });

    const state = await hookManager.executeBefore('test.operation');
    expect(state.get('value')).toBe(42);
    expect(state.get('doubled')).toBe(84);
  });
});

describe('Phase 4: Context Ignore', () => {
  test('should initialize context ignore', () => {
    const contextIgnore = new ContextIgnore({
      includeDefaults: true,
    });

    expect(contextIgnore).toBeDefined();
  });

  test('should ignore node_modules', () => {
    const contextIgnore = new ContextIgnore({
      includeDefaults: true,
    });

    expect(contextIgnore.shouldIgnore('node_modules/package.json')).toBe(true);
    expect(contextIgnore.shouldIgnore('src/index.ts')).toBe(false);
  });

  test('should add custom patterns', () => {
    const contextIgnore = new ContextIgnore({
      includeDefaults: false,
    });

    contextIgnore.addPattern('*.test.ts');
    expect(contextIgnore.shouldIgnore('foo.test.ts')).toBe(true);
    expect(contextIgnore.shouldIgnore('foo.ts')).toBe(false);
  });

  test('should filter file lists', () => {
    const contextIgnore = new ContextIgnore({
      includeDefaults: true,
    });

    const files = [
      'src/index.ts',
      'node_modules/package.json',
      '.git/config',
      'README.md',
    ];

    const filtered = contextIgnore.filter(files);
    expect(filtered).toEqual(['src/index.ts', 'README.md']);
  });

  test('should support negation patterns', () => {
    const contextIgnore = new ContextIgnore({
      includeDefaults: false,
    });

    contextIgnore.addPattern('*.log');
    contextIgnore.addPattern('!important.log');

    expect(contextIgnore.shouldIgnore('debug.log')).toBe(true);
    expect(contextIgnore.shouldIgnore('important.log')).toBe(false);
  });
});

describe('Phase 4: Memory File Manager', () => {
  test('should initialize memory file manager', () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    expect(memoryManager).toBeDefined();
  });

  test('should create default memory file', async () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    const loaded = await memoryManager.load();
    expect(loaded).toBe(true);

    const sections = memoryManager.getAllSections();
    expect(sections.length).toBeGreaterThan(0);
  });

  test('should update sections', async () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    await memoryManager.load();

    await memoryManager.updateSection(
      'Test Section',
      'Test content',
      8
    );

    const content = memoryManager.getSection('Test Section');
    expect(content).toBe('Test content');
  });

  test('should add notes', async () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    await memoryManager.load();

    await memoryManager.addNote('This is a test note');

    const notes = memoryManager.getSection('Notes');
    expect(notes).toContain('This is a test note');
  });

  test('should add decisions', async () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    await memoryManager.load();

    await memoryManager.addDecision(
      'Use TypeScript',
      'Better type safety and tooling'
    );

    const decisions = memoryManager.getSection('Key Decisions');
    expect(decisions).toContain('Use TypeScript');
    expect(decisions).toContain('Better type safety and tooling');
  });

  test('should add patterns', async () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    await memoryManager.load();

    await memoryManager.addPattern(
      'Error handling pattern',
      'Use try-catch with logging'
    );

    const patterns = memoryManager.getSection('Learned Patterns');
    expect(patterns).toContain('Error handling pattern');
    expect(patterns).toContain('Use try-catch with logging');
  });

  test('should generate summary', async () => {
    const memoryManager = new MemoryFileManager('.memory-test.md');
    await memoryManager.load();

    const summary = memoryManager.getSummary();
    expect(summary).toContain('Memory File Summary');
    expect(summary).toContain('Version:');
    expect(summary).toContain('Sections:');
  });
});

describe('Phase 4: Integration Tests', () => {
  test('should integrate REPL with Shadow Mode', async () => {
    const repl = new REPLInterface();
    const shadow = new ShadowMode();

    await repl.initialize();

    // Execute code in REPL
    const replResult = await repl.execute('2 + 2');
    expect(replResult.success).toBe(true);

    // Execute same code speculatively
    const executionId = await shadow.executeSpeculative(
      'console.log(2 + 2);',
      {
        workingDirectory: process.cwd(),
        parallel: false,
      }
    );

    const shadowResult = await shadow.waitForCompletion(executionId, 5000);
    expect(shadowResult.state).toBe(ShadowState.COMPLETE);

    repl.stop();
  });

  test('should integrate hooks with memory manager', async () => {
    const hookManager = new HookManager();
    const memoryManager = new MemoryFileManager('.memory-test.md');

    await memoryManager.load();

    hookManager.register({
      type: HookType.AFTER,
      operationPattern: 'test.operation',
      fn: async (context) => {
        await memoryManager.addNote(
          `Operation executed: ${context.operation}`
        );
      },
      priority: HookPriority.NORMAL,
      enabled: true,
    });

    await hookManager.executeAfter('test.operation', { success: true });

    const notes = memoryManager.getSection('Notes');
    expect(notes).toContain('Operation executed: test.operation');
  });
});
