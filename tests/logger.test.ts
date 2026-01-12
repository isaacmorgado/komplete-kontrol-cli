/**
 * Logger tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Logger, LogLevel, ContextLogger } from '../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ level: LogLevel.DEBUG, timestamp: true, colorize: false });
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Test debug message');
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Test info message');
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].message).toBe('Test warn message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Test error message');
    });

    it('should respect log level filtering', () => {
      const warnLogger = new Logger({ level: LogLevel.WARN });
      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      warnLogger.error('Error message');
      const logs = warnLogger.getLogs();
      expect(logs.length).toBe(2);
      expect(logs.every((log) => log.level >= LogLevel.WARN)).toBe(true);
    });
  });

  describe('Context Logging', () => {
    it('should log with context', () => {
      logger.debug('Test message', 'TestContext');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].context).toBe('TestContext');
    });

    it('should create child logger with context', () => {
      const childLogger = logger.child('ChildContext');
      expect(childLogger).toBeInstanceOf(ContextLogger);
      childLogger.info('Child message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].context).toBe('ChildContext');
    });

    it('should log data with context', () => {
      const testData = { key: 'value', number: 42 };
      logger.info('Test message', 'TestContext', testData);
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].context).toBe('TestContext');
      expect(logs[0].data).toEqual(testData);
    });

    it('should log without context when not provided', () => {
      logger.info('Test message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].context).toBeUndefined();
    });
  });

  describe('Data Logging', () => {
    it('should log data with messages', () => {
      const testData = { key: 'value', nested: { prop: 123 } };
      logger.info('Test message', undefined, testData);
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].data).toEqual(testData);
    });

    it('should log null data', () => {
      logger.info('Test message', undefined, null);
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].data).toBeNull();
    });

    it('should log undefined data as undefined', () => {
      logger.info('Test message', undefined, undefined);
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].data).toBeUndefined();
    });
  });

  describe('Log Management', () => {
    it('should get all logs', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('Debug message');
      expect(logs[1].message).toBe('Info message');
      expect(logs[2].message).toBe('Warn message');
    });

    it('should clear logs', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      expect(logger.getLogs().length).toBe(2);
      logger.clearLogs();
      expect(logger.getLogs().length).toBe(0);
    });

    it('should return a copy of logs', () => {
      logger.debug('Debug message');
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('Timestamp', () => {
    it('should include timestamp in log entries', () => {
      logger.info('Test message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should create unique timestamps for each log', async () => {
      logger.info('Message 1');
      await new Promise(resolve => setTimeout(resolve, 1)); // Small delay to ensure different timestamps
      logger.info('Message 2');
      const logs = logger.getLogs();
      expect(logs[0].timestamp.getTime()).not.toBe(logs[1].timestamp.getTime());
    });
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger.config.level).toBe(LogLevel.INFO);
      expect(defaultLogger.config.colorize).toBe(true);
      expect(defaultLogger.config.timestamp).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customLogger = new Logger({
        level: LogLevel.DEBUG,
        colorize: false,
        timestamp: false,
      });
      expect(customLogger.config.level).toBe(LogLevel.DEBUG);
      expect(customLogger.config.colorize).toBe(false);
      expect(customLogger.config.timestamp).toBe(false);
    });
  });
});

describe('ContextLogger', () => {
  let logger: Logger;
  let contextLogger: ContextLogger;

  beforeEach(() => {
    logger = new Logger({ level: LogLevel.DEBUG, timestamp: true, colorize: false });
    contextLogger = logger.child('TestContext');
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe('Logging with Pre-set Context', () => {
    it('should log debug message with context', () => {
      contextLogger.debug('Debug message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].context).toBe('TestContext');
      expect(logs[0].message).toBe('Debug message');
    });

    it('should log info message with context', () => {
      contextLogger.info('Info message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].context).toBe('TestContext');
    });

    it('should log warn message with context', () => {
      contextLogger.warn('Warn message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].context).toBe('TestContext');
    });

    it('should log error message with context', () => {
      contextLogger.error('Error message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].context).toBe('TestContext');
    });

    it('should log data with context', () => {
      const testData = { key: 'value' };
      contextLogger.info('Message', testData);
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].context).toBe('TestContext');
      expect(logs[0].data).toEqual(testData);
    });
  });
});
