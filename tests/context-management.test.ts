/**
 * Context Management Tests
 *
 * Tests for context window, token counting, session management,
 * and memory file handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  ContextWindow,
  createContextWindow,
} from '../src/core/context/window';
import {
  TokenCounter,
  TokenBudget,
  TokenTracker,
  createTokenCounter,
  createTokenBudget,
  createTokenTracker,
} from '../src/core/context/tokens';
import {
  ContextCondenser,
  createContextCondenser,
} from '../src/core/context/condensation';
import {
  SessionManager,
  createSessionManager,
} from '../src/core/context/session';
import {
  MemoryFileHandler,
  createMemoryFileHandler,
  createMemoryFile,
} from '../src/core/context/memory';
import type {
  Message,
  ContextMessage,
  MessageRole,
} from '../src/types';

describe('Context Window', () => {
  let contextWindow: ContextWindow;

  beforeEach(() => {
    contextWindow = createContextWindow({ maxTokens: 1000 });
  });

  it('should create context window', () => {
    expect(contextWindow).toBeDefined();
    expect(contextWindow.getMaxSize()).toBe(1000);
    expect(contextWindow.getCurrentSize()).toBe(0);
    expect(contextWindow.getMessages()).toEqual([]);
  });

  it('should calculate available tokens', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'Hello, world!',
    };
    contextWindow.addMessage(message);
    expect(contextWindow.getCurrentSize()).toBeGreaterThan(0);
    expect(contextWindow.getAvailableSpace()).toBeLessThan(1000);
  });

  it('should trim context when exceeding max tokens', () => {
    const longMessage: Message = {
      role: 'user' as MessageRole,
      content: 'A'.repeat(5000), // ~1250 tokens, exceeds 1000
    };
    const result = contextWindow.addMessage(longMessage);
    expect(result).toBe(false); // Should fail because it exceeds max
  });

  it('should clear context', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'Hello, world!',
    };
    contextWindow.addMessage(message);
    contextWindow.clear();
    expect(contextWindow.getCurrentSize()).toBe(0);
    expect(contextWindow.getMessages()).toEqual([]);
  });

  it('should get token usage', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'Hello, world!',
    };
    contextWindow.addMessage(message);
    expect(contextWindow.getCurrentSize()).toBeGreaterThan(0);
    expect(contextWindow.getUtilization()).toBeGreaterThan(0);
  });

  it('should check if window is full', () => {
    expect(contextWindow.isFull()).toBe(false);
    const longMessage: Message = {
      role: 'user' as MessageRole,
      content: 'A'.repeat(4000), // Should be ~1000 tokens
    };
    contextWindow.addMessage(longMessage);
    expect(contextWindow.isFull()).toBe(true);
  });

  it('should check if window is near full', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'A'.repeat(3000), // Should be ~750 tokens
    };
    contextWindow.addMessage(message);
    expect(contextWindow.isNearFull(0.7)).toBe(true);
  });

  it('should get message count', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'Hello',
    };
    contextWindow.addMessage(message);
    contextWindow.addMessage(message);
    expect(contextWindow.getMessageCount()).toBe(2);
  });
});

describe('Token Counter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    tokenCounter = createTokenCounter('char');
  });

  it('should count tokens in text', () => {
    const count = tokenCounter.countText('Hello, world!');
    expect(count).toBeGreaterThan(0);
    expect(count).toBe(Math.ceil('Hello, world!'.length / 4));
  });

  it('should estimate tokens for longer text', () => {
    const longText = 'A'.repeat(1000);
    const count = tokenCounter.countText(longText);
    expect(count).toBe(250); // 1000 chars / 4 = 250 tokens
  });

  it('should handle empty text', () => {
    const count = tokenCounter.countText('');
    expect(count).toBe(0);
  });

  it('should count tokens in message array', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'Hello, world!',
    };
    const count = tokenCounter.countMessage(message);
    expect(count).toBeGreaterThan(0);
  });

  it('should estimate cost for message', () => {
    const message: Message = {
      role: 'user' as MessageRole,
      content: 'Hello, world!',
    };
    const cost = tokenCounter.estimateCost(message);
    expect(cost).toBeGreaterThan(0);
  });

  it('should estimate cost for multiple messages', () => {
    const messages: Message[] = [
      { role: 'user' as MessageRole, content: 'Hello' },
      { role: 'assistant' as MessageRole, content: 'Hi there' },
    ];
    const cost = tokenCounter.estimateCostBatch(messages);
    expect(cost).toBeGreaterThan(0);
  });

  it('should set counting method', () => {
    tokenCounter.setMethod('word');
    expect(tokenCounter.getMethod()).toBe('word');
  });

  it('should set pricing', () => {
    const pricing = { inputPrice: 0.1, outputPrice: 0.5, currency: 'USD' };
    tokenCounter.setPricing(pricing);
    expect(tokenCounter.getPricing()).toEqual(pricing);
  });
});

describe('Token Budget', () => {
  let tokenBudget: TokenBudget;

  beforeEach(() => {
    tokenBudget = createTokenBudget(1000);
  });

  it('should create token budget', () => {
    expect(tokenBudget.getConfig().limit).toBe(1000);
    expect(tokenBudget.getUsed()).toBe(0);
    expect(tokenBudget.getRemaining()).toBe(1000);
  });

  it('should track token usage', () => {
    tokenBudget.addTokens(100);
    expect(tokenBudget.getUsed()).toBe(100);
    expect(tokenBudget.getRemaining()).toBe(900);
  });

  it('should calculate remaining budget', () => {
    tokenBudget.addTokens(300);
    expect(tokenBudget.getRemaining()).toBe(700);
  });

  it('should check if budget exceeded', () => {
    tokenBudget.addTokens(1001); // Add more than limit to trigger over-budget
    expect(tokenBudget.isOverBudget()).toBe(true);
  });

  it('should check if budget near limit', () => {
    tokenBudget.addTokens(950);
    expect(tokenBudget.isNearLimit(0.9)).toBe(true);
  });

  it('should reset budget', () => {
    tokenBudget.addTokens(500);
    tokenBudget.reset();
    expect(tokenBudget.getUsed()).toBe(0);
    expect(tokenBudget.getRemaining()).toBe(1000);
  });

  it('should get budget status', () => {
    tokenBudget.addTokens(300);
    const status = tokenBudget.getStatus();
    expect(status.used).toBe(300);
    expect(status.remaining).toBe(700);
    expect(status.percentUsed).toBe(0.3);
    expect(status.isNearLimit).toBe(false);
    expect(status.isOverBudget).toBe(false);
  });

  it('should get configuration', () => {
    const config = tokenBudget.getConfig();
    expect(config.limit).toBe(1000);
    expect(config.alertThreshold).toBe(0.9);
  });
});

describe('Token Tracker', () => {
  let tokenTracker: TokenTracker;

  beforeEach(() => {
    tokenTracker = createTokenTracker();
  });

  it('should track token usage', () => {
    tokenTracker.trackUsage(100);
    const usage = tokenTracker.getTotalUsage();
    expect(usage.totalTokens).toBe(100);
    expect(usage.sessions).toBe(1);
  });

  it('should track by category', () => {
    tokenTracker.trackUsage(100, 'session-1', 0.01);
    tokenTracker.trackUsage(200, 'session-2', 0.02);
    expect(tokenTracker.getSessionUsage('session-1')).toBe(100);
    expect(tokenTracker.getSessionUsage('session-2')).toBe(200);
  });

  it('should get remaining tokens', () => {
    tokenTracker.trackUsage(100);
    const usage = tokenTracker.getTotalUsage();
    expect(usage.totalTokens).toBe(100);
  });

  it('should reset tracker', () => {
    tokenTracker.trackUsage(100);
    tokenTracker.reset();
    const usage = tokenTracker.getTotalUsage();
    expect(usage.totalTokens).toBe(0);
    expect(usage.sessions).toBe(0);
  });

  it('should get all session usage', () => {
    tokenTracker.trackUsage(100, 'session-1');
    tokenTracker.trackUsage(200, 'session-2');
    const sessionUsage = tokenTracker.getAllSessionUsage();
    expect(sessionUsage.get('session-1')).toBe(100);
    expect(sessionUsage.get('session-2')).toBe(200);
  });

  it('should get summary', () => {
    tokenTracker.trackUsage(100, 'session-1', 0.01);
    tokenTracker.trackUsage(200, 'session-2', 0.02);
    const summary = tokenTracker.getSummary();
    expect(summary.totalTokens).toBe(300);
    expect(summary.totalCost).toBe(0.03);
    expect(summary.totalSessions).toBe(2);
    expect(summary.averageTokensPerSession).toBe(150);
    expect(summary.topSessions.length).toBeGreaterThan(0);
  });

  it('should reset session', () => {
    tokenTracker.trackUsage(100, 'session-1');
    tokenTracker.resetSession('session-1');
    expect(tokenTracker.getSessionUsage('session-1')).toBe(0);
  });
});

describe('Context Condenser', () => {
  let condenser: ContextCondenser;

  beforeEach(() => {
    condenser = createContextCondenser('fifo');
  });

  it('should condense messages by summarization', () => {
    const messages: ContextMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'A'.repeat(1000),
        timestamp: new Date(),
        tokens: 250,
      },
      {
        id: '2',
        role: 'user',
        content: 'B'.repeat(1000),
        timestamp: new Date(),
        tokens: 250,
      },
    ];

    const condensed = condenser.condense(messages, 200);
    expect(condensed.length).toBeLessThan(messages.length);
  });

  it('should condense messages by truncation', () => {
    const messages: ContextMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'A'.repeat(1000),
        timestamp: new Date(),
        tokens: 250,
      },
      {
        id: '2',
        role: 'user',
        content: 'B'.repeat(1000),
        timestamp: new Date(),
        tokens: 250,
      },
    ];

    const condensed = condenser.condense(messages, 200);
    expect(condensed.length).toBeLessThan(messages.length);
  });

  it('should condense messages by merging', () => {
    const messages: ContextMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'A'.repeat(1000),
        timestamp: new Date(),
        tokens: 250,
      },
      {
        id: '2',
        role: 'user',
        content: 'B'.repeat(1000),
        timestamp: new Date(),
        tokens: 250,
      },
    ];

    const condensed = condenser.condense(messages, 200);
    expect(condensed.length).toBeLessThan(messages.length);
  });

  it('should preserve system messages', () => {
    const messages: ContextMessage[] = [
      {
        id: '1',
        role: 'system',
        content: 'System message',
        timestamp: new Date(),
        tokens: 50,
      },
      {
        id: '2',
        role: 'user',
        content: 'A'.repeat(1000),
        // Use old timestamp so it's not considered recent
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
        tokens: 250,
      },
    ];

    expect(condenser.shouldPreserve(messages[0])).toBe(true);
    expect(condenser.shouldPreserve(messages[1])).toBe(false);
  });

  it('should preserve high-priority messages', () => {
    const message: ContextMessage = {
      id: '1',
      role: 'user',
      content: 'Important message',
      timestamp: new Date(),
      tokens: 50,
      priority: 10,
    };

    expect(condenser.shouldPreserve(message)).toBe(true);
  });

  it('should update configuration', () => {
    condenser.updateConfig({ strategy: 'priority' });
    expect(condenser.getConfig().strategy).toBe('priority');
  });
});

describe('Session Manager', () => {
  let sessionManager: SessionManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = `/tmp/test-sessions-${Date.now()}`;
    sessionManager = createSessionManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      const { promises: fs } = await import('node:fs');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    expect(session).toBeDefined();
    expect(session.agent).toBe('test-session');
    expect(session.id).toBeDefined();
  });

  it('should get session', async () => {
    await sessionManager.initialize();
    const created = await sessionManager.createSession('test-session');
    const retrieved = await sessionManager.getSession(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('should list sessions', async () => {
    await sessionManager.initialize();
    await sessionManager.createSession('session-1');
    await sessionManager.createSession('session-2');
    const sessions = sessionManager.listSessions();
    expect(sessions.length).toBe(2);
  });

  it('should update session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    session.model = 'new-model';
    await sessionManager.updateSession(session);
    const updated = await sessionManager.getSession(session.id);
    expect(updated?.model).toBe('new-model');
  });

  it('should delete session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.deleteSession(session.id);
    const retrieved = await sessionManager.getSession(session.id);
    expect(retrieved).toBeUndefined();
  });

  it('should clear all sessions', async () => {
    await sessionManager.initialize();
    await sessionManager.createSession('session-1');
    await sessionManager.createSession('session-2');
    await sessionManager.deleteSession((await sessionManager.createSession('session-3')).id);
    const sessions = sessionManager.listSessions();
    expect(sessions.length).toBeLessThan(3);
  });

  it('should set active session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.setActiveSession(session.id);
    const active = sessionManager.getActiveSession();
    expect(active?.id).toBe(session.id);
  });

  it('should clear active session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.setActiveSession(session.id);
    sessionManager.clearActiveSession();
    const active = sessionManager.getActiveSession();
    expect(active).toBeUndefined();
  });

  it('should add message to session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.addMessage(session.id, {
      role: 'user',
      content: 'Hello',
    });
    const updated = await sessionManager.getSession(session.id);
    expect(updated?.messages.length).toBe(1);
  });

  it('should remove message from session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.addMessage(session.id, {
      role: 'user',
      content: 'Hello',
    });
    await sessionManager.removeMessage(session.id, 0);
    const updated = await sessionManager.getSession(session.id);
    expect(updated?.messages.length).toBe(0);
  });

  it('should clear messages from session', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.addMessage(session.id, {
      role: 'user',
      content: 'Hello',
    });
    await sessionManager.clearMessages(session.id);
    const updated = await sessionManager.getSession(session.id);
    expect(updated?.messages.length).toBe(0);
  });

  it('should update token count', async () => {
    await sessionManager.initialize();
    const session = await sessionManager.createSession('test-session');
    await sessionManager.updateTokenCount(session.id, 100);
    const updated = await sessionManager.getSession(session.id);
    expect(updated?.totalTokens).toBe(100);
  });
});

describe('Memory File Handler', () => {
  let handler: MemoryFileHandler;
  let tempFile: string;

  beforeEach(() => {
    tempFile = `/tmp/test-memory-${Date.now()}.md`;
    handler = createMemoryFileHandler(tempFile);
  });

  afterEach(async () => {
    // Clean up temp file
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create memory file', async () => {
    await handler.load();
    handler.addSection('test', 'Test content');
    await handler.save();
    expect(handler.isDirty()).toBe(false);
  });

  it('should read memory file', async () => {
    await handler.load();
    handler.addSection('test', 'Test content');
    await handler.save();

    const newHandler = createMemoryFileHandler(tempFile);
    await newHandler.load();
    const section = newHandler.getSection('test');
    expect(section).toBeDefined();
    expect(section?.content).toBe('Test content');
  });

  it('should list memory files', async () => {
    await handler.load();
    handler.addSection('section1', 'Content 1');
    handler.addSection('section2', 'Content 2');
    const sections = handler.getAllSections();
    expect(sections.length).toBe(2);
  });

  it('should update memory file', async () => {
    await handler.load();
    handler.addSection('test', 'Original content');
    await handler.save();

    handler.updateSection('test', 'Updated content');
    await handler.save();

    const newHandler = createMemoryFileHandler(tempFile);
    await newHandler.load();
    const section = newHandler.getSection('test');
    expect(section?.content).toBe('Updated content');
  });

  it('should delete memory file', async () => {
    await handler.load();
    handler.addSection('test', 'Test content');
    await handler.save();

    handler.removeSection('test');
    await handler.save();

    const newHandler = createMemoryFileHandler(tempFile);
    await newHandler.load();
    const section = newHandler.getSection('test');
    expect(section).toBeUndefined();
  });

  it('should clear all memories', async () => {
    await handler.load();
    handler.addSection('section1', 'Content 1');
    handler.addSection('section2', 'Content 2');
    await handler.save();

    handler.clearSections();
    await handler.save();

    const newHandler = createMemoryFileHandler(tempFile);
    await newHandler.load();
    const sections = newHandler.getAllSections();
    expect(sections.length).toBe(0);
  });

  it('should get sections by priority', async () => {
    await handler.load();
    handler.addSection('low', 'Low priority', 1);
    handler.addSection('high', 'High priority', 10);
    handler.addSection('medium', 'Medium priority', 5);

    const byPriority = handler.getSectionsByPriority();
    expect(byPriority[0].name).toBe('high');
    expect(byPriority[1].name).toBe('medium');
    expect(byPriority[2].name).toBe('low');
  });

  it('should search sections', async () => {
    await handler.load();
    handler.addSection('test1', 'This is a test');
    handler.addSection('test2', 'Another test');
    handler.addSection('other', 'Different content');

    const results = handler.searchSections('test');
    expect(results.length).toBe(2);
  });

  it('should manage tags', async () => {
    await handler.load();
    handler.setTags(['tag1', 'tag2']);
    expect(handler.getTags()).toEqual(['tag1', 'tag2']);

    handler.addTag('tag3');
    expect(handler.getTags()).toContain('tag3');

    handler.removeTag('tag1');
    expect(handler.getTags()).not.toContain('tag1');
  });

  it('should manage project', async () => {
    await handler.load();
    handler.setProject('test-project');
    expect(handler.getProject()).toBe('test-project');
  });

  it('should get memory', async () => {
    await handler.load();
    handler.addSection('test', 'Test content');
    handler.setTags(['tag1']);
    handler.setProject('test-project');

    const memory = handler.getMemory();
    expect(memory.sections.length).toBe(1);
    expect(memory.frontmatter.tags).toEqual(['tag1']);
    expect(memory.frontmatter.project).toBe('test-project');
  });

  it('should update config', async () => {
    handler.updateConfig({ autoSave: false });
    const config = handler.getConfig();
    expect(config.autoSave).toBe(false);
  });
});
