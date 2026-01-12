/**
 * Agent Communication Tests
 *
 * Tests for message passing and communication between agents.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Logger } from '../src/utils/logger';
import {
  AgentCommunicationManager,
  initAgentCommunicationManager,
  MessageType,
  MessagePriority,
} from '../src/core/agents/communication';
import type { AgentMessage, MessageHandler } from '../src/core/agents/communication';

describe('Agent Communication', () => {
  let manager: AgentCommunicationManager;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    manager = initAgentCommunicationManager({ name: 'test-channel' }, logger);
  });

  afterEach(() => {
    manager.clear();
  });

  it('should send notification', async () => {
    let receivedMessage: AgentMessage | null = null;

    const handler: MessageHandler = (message) => {
      receivedMessage = message;
    };

    manager.registerHandler('agent2', handler);

    await manager.notify('agent1', 'agent2', 'test', { data: 'test' });

    expect(receivedMessage).toBeDefined();
    expect(receivedMessage?.type).toBe(MessageType.NOTIFICATION);
    expect(receivedMessage?.subject).toBe('test');
    expect(receivedMessage?.from).toBe('agent1');
    expect(receivedMessage?.to).toBe('agent2');
  });

  it('should broadcast message', async () => {
    const receivedMessages: AgentMessage[] = [];

    const handler1: MessageHandler = (message) => {
      receivedMessages.push(message);
    };

    const handler2: MessageHandler = (message) => {
      receivedMessages.push(message);
    };

    manager.registerHandler('agent2', handler1);
    manager.registerHandler('agent3', handler2);

    await manager.broadcast('agent1', 'test', { data: 'test' });

    // Both agents should receive the broadcast
    expect(receivedMessages.length).toBe(2);
    receivedMessages.forEach(msg => {
      expect(msg.type).toBe(MessageType.BROADCAST);
      expect(msg.subject).toBe('test');
      expect(msg.from).toBe('agent1');
    });
  });

  it('should send request and get response', async () => {
    const receivedRequests: AgentMessage[] = [];

    const handler: MessageHandler = async (message) => {
      receivedRequests.push(message);

      // Respond to the request
      if (message.type === MessageType.REQUEST && message.correlationId) {
        await manager.respond(
          'agent2',
          'agent1',
          'response',
          { result: 'success' },
          message.correlationId
        );
      }
    };

    manager.registerHandler('agent2', handler);

    // Send request with shorter timeout
    const response = await manager.request(
      'agent1',
      'agent2',
      'test',
      { data: 'test' },
      1000 // 1 second timeout
    );

    expect(response).toBeDefined();
    expect(response.type).toBe(MessageType.RESPONSE);
    expect(response.subject).toBe('response');
    expect(response.from).toBe('agent2');
    expect(response.to).toBe('agent1');
    expect(response.correlationId).toBeDefined();
    expect(receivedRequests.length).toBe(1);
  });

  it('should handle message with priority', async () => {
    let receivedMessage: AgentMessage | null = null;

    const handler: MessageHandler = (message) => {
      receivedMessage = message;
    };

    manager.registerHandler('agent2', handler);

    await manager.notify(
      'agent1',
      'agent2',
      'test',
      { data: 'test' },
      MessagePriority.HIGH
    );

    expect(receivedMessage?.priority).toBe(MessagePriority.HIGH);
  });

  it('should register and unregister handler', async () => {
    let callCount = 0;

    const handler: MessageHandler = () => {
      callCount++;
    };

    manager.registerHandler('agent2', handler);
    await manager.notify('agent1', 'agent2', 'test', {});
    expect(callCount).toBe(1);

    manager.unregisterHandler('agent2', handler);
    await manager.notify('agent1', 'agent2', 'test', {});
    expect(callCount).toBe(1); // Should not increment again
  });

  it('should apply message filters', async () => {
    let receivedCount = 0;

    const filter = (message: AgentMessage) => {
      // Only accept messages with subject 'allowed'
      return message.subject === 'allowed';
    };

    const handler: MessageHandler = () => {
      receivedCount++;
    };

    manager.registerFilter('agent2', filter);
    manager.registerHandler('agent2', handler);

    // Send filtered message
    await manager.notify('agent1', 'agent2', 'blocked', {});
    expect(receivedCount).toBe(0);

    // Send allowed message
    await manager.notify('agent1', 'agent2', 'allowed', {});
    expect(receivedCount).toBe(1);
  });

  it('should get message history', async () => {
    await manager.notify('agent1', 'agent2', 'test1', {});
    await manager.notify('agent1', 'agent2', 'test2', {});

    const history = manager.getHistory('agent1');
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('should get message history with limit', async () => {
    await manager.notify('agent1', 'agent2', 'test1', {});
    await manager.notify('agent1', 'agent2', 'test2', {});
    await manager.notify('agent1', 'agent2', 'test3', {});

    const history = manager.getHistory('agent1', 2);
    expect(history.length).toBe(2);
  });

  it('should clear message history', async () => {
    await manager.notify('agent1', 'agent2', 'test', {});
    expect(manager.getHistory().length).toBeGreaterThan(0);

    manager.clearHistory();
    expect(manager.getHistory().length).toBe(0);
  });

  it('should handle request timeout', async () => {
    const handler: MessageHandler = () => {
      // Don't respond, let it timeout
    };

    manager.registerHandler('agent2', handler);

    await expect(
      manager.request(
        'agent1',
        'agent2',
        'test',
        { data: 'test' },
        100 // Short timeout
      )
    ).rejects.toThrow();
  });

  it('should handle multiple handlers per agent', async () => {
    const receivedMessages: AgentMessage[] = [];

    const handler1: MessageHandler = (message) => {
      receivedMessages.push(message);
    };

    const handler2: MessageHandler = (message) => {
      receivedMessages.push(message);
    };

    manager.registerHandler('agent2', handler1);
    manager.registerHandler('agent2', handler2);

    await manager.notify('agent1', 'agent2', 'test', {});

    // Both handlers should be called
    expect(receivedMessages.length).toBe(2);
  });

  it('should validate message', async () => {
    const handler: MessageHandler = () => {};

    manager.registerHandler('agent2', handler);

    // Missing ID
    await expect(
      manager.send({
        id: '',
        type: MessageType.NOTIFICATION,
        from: 'agent1',
        to: 'agent2',
        subject: 'test',
        payload: {},
        priority: MessagePriority.NORMAL,
        timestamp: new Date(),
      })
    ).rejects.toThrow();

    // Missing sender
    await expect(
      manager.send({
        id: 'test-id',
        type: MessageType.NOTIFICATION,
        from: '',
        to: 'agent2',
        subject: 'test',
        payload: {},
        priority: MessagePriority.NORMAL,
        timestamp: new Date(),
      })
    ).rejects.toThrow();

    // Missing subject
    await expect(
      manager.send({
        id: 'test-id',
        type: MessageType.NOTIFICATION,
        from: 'agent1',
        to: 'agent2',
        subject: '',
        payload: {},
        priority: MessagePriority.NORMAL,
        timestamp: new Date(),
      })
    ).rejects.toThrow();
  });

  it('should clear all state', async () => {
    const handler: MessageHandler = () => {};

    manager.registerHandler('agent2', handler);
    manager.registerFilter('agent2', () => true);
    await manager.notify('agent1', 'agent2', 'test', {});

    expect(manager.getHistory().length).toBeGreaterThan(0);

    manager.clear();

    // After clear, history should be empty
    expect(manager.getHistory().length).toBe(0);
  });
});
