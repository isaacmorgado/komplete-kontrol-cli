/**
 * Error handler tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  ErrorHandler,
  ErrorSeverity,
  RecoveryStrategy,
} from '../src/utils/error-handler';
import {
  KompleteError,
  ProviderError,
  AgentError,
  ContextError,
  ConfigError,
} from '../src/types';
import { Logger, LogLevel } from '../src/utils/logger';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ level: LogLevel.ERROR, colorize: false });
    errorHandler = new ErrorHandler({ logger, verbose: true, exitOnCritical: false });
  });

  describe('Error Severity', () => {
    it('should classify ProviderError as HIGH severity', () => {
      const error = new ProviderError('Provider failed');
      const severity = errorHandler['getSeverity'](error);
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should classify AgentError as MEDIUM severity', () => {
      const error = new AgentError('Agent failed');
      const severity = errorHandler['getSeverity'](error);
      expect(severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should classify ContextError as MEDIUM severity', () => {
      const error = new ContextError('Context failed');
      const severity = errorHandler['getSeverity'](error);
      expect(severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should classify ConfigError as HIGH severity', () => {
      const error = new ConfigError('Config failed');
      const severity = errorHandler['getSeverity'](error);
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should classify generic Error as LOW severity', () => {
      const error = new Error('Generic error');
      const severity = errorHandler['getSeverity'](error);
      expect(severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('Recovery Strategy', () => {
    it('should determine RETRY strategy for ProviderError', async () => {
      const error = new ProviderError('Provider failed');
      const strategy = errorHandler['determineRecovery'](error);
      expect(strategy).toBe(RecoveryStrategy.RETRY);
    });

    it('should determine CONTINUE strategy for AgentError', async () => {
      const error = new AgentError('Agent failed');
      const strategy = errorHandler['determineRecovery'](error);
      expect(strategy).toBe(RecoveryStrategy.CONTINUE);
    });

    it('should determine ABORT strategy for ContextError', async () => {
      const error = new ContextError('Context failed');
      const strategy = errorHandler['determineRecovery'](error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
    });

    it('should determine ABORT strategy for ConfigError', async () => {
      const error = new ConfigError('Config failed');
      const strategy = errorHandler['determineRecovery'](error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
    });

    it('should determine ABORT strategy for generic Error', async () => {
      const error = new Error('Generic error');
      const strategy = errorHandler['determineRecovery'](error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
    });
  });

  describe('Error Handling', () => {
    it('should handle ProviderError and return RETRY strategy', async () => {
      const error = new ProviderError('Provider failed');
      const strategy = await errorHandler.handle(error);
      expect(strategy).toBe(RecoveryStrategy.RETRY);
    });

    it('should handle AgentError and return CONTINUE strategy', async () => {
      const error = new AgentError('Agent failed');
      const strategy = await errorHandler.handle(error);
      expect(strategy).toBe(RecoveryStrategy.CONTINUE);
    });

    it('should handle ContextError and return ABORT strategy', async () => {
      const error = new ContextError('Context failed');
      const strategy = await errorHandler.handle(error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
    });

    it('should handle ConfigError and return ABORT strategy', async () => {
      const error = new ConfigError('Config failed');
      const strategy = await errorHandler.handle(error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
    });

    it('should handle generic Error and return ABORT strategy', async () => {
      const error = new Error('Generic error');
      const strategy = await errorHandler.handle(error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
    });

    it('should track error occurrences', async () => {
      const error1 = new ProviderError('Provider failed');
      const error2 = new ProviderError('Provider failed again');
      await errorHandler.handle(error1);
      await errorHandler.handle(error2);
      const stats = errorHandler.getErrorStats();
      expect(stats['ProviderError']).toBe(2);
    });
  });

  describe('Retry Logic', () => {
    it('should retry operation on failure and eventually succeed', async () => {
      let attempts = 0;
      const operation = async (): Promise<string> => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await errorHandler.retry(operation);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should retry operation with exponential backoff', async () => {
      let attempts = 0;
      const timestamps: number[] = [];
      const operation = async (): Promise<string> => {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await errorHandler.retry(operation);
      expect(result).toBe('success');
      expect(attempts).toBe(3);

      // Check exponential backoff (approximately)
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should fail after max retries', async () => {
      const operation = async (): Promise<string> => {
        throw new Error('Persistent failure');
      };

      await expect(errorHandler.retry(operation, undefined, 2)).rejects.toThrow('Persistent failure');
    });

    it('should use custom max retries', async () => {
      let attempts = 0;
      const operation = async (): Promise<string> => {
        attempts++;
        throw new Error('Always fails');
      };

      await expect(errorHandler.retry(operation, undefined, 2)).rejects.toThrow('Always fails');
      expect(attempts).toBe(3); // 2 retries + initial attempt
    });
  });

  describe('Wrap Function', () => {
    it('should wrap async function with error handling', async () => {
      const fn = async (x: number): Promise<number> => x * 2;
      const wrapped = errorHandler.wrap(fn);

      const result = await wrapped(5);
      expect(result).toBe(10);
    });

    it('should handle errors in wrapped function', async () => {
      const fn = async (): Promise<void> => {
        throw new Error('Wrapped function failed');
      };
      const wrapped = errorHandler.wrap(fn);

      await expect(wrapped()).rejects.toThrow('Wrapped function failed');
    });

    it('should pass arguments correctly to wrapped function', async () => {
      const fn = async (a: number, b: string, c: boolean): Promise<string> => {
        return `${a}-${b}-${c}`;
      };
      const wrapped = errorHandler.wrap(fn);

      const result = await wrapped(42, 'test', true);
      expect(result).toBe('42-test-true');
    });
  });

  describe('Error Statistics', () => {
    it('should track error counts', async () => {
      await errorHandler.handle(new ProviderError('Error 1'));
      await errorHandler.handle(new AgentError('Error 2'));
      await errorHandler.handle(new ProviderError('Error 3'));

      const stats = errorHandler.getErrorStats();
      expect(stats['ProviderError']).toBe(2);
      expect(stats['AgentError']).toBe(1);
    });

    it('should clear error statistics', async () => {
      await errorHandler.handle(new ProviderError('Error 1'));
      await errorHandler.handle(new AgentError('Error 2'));

      let stats = errorHandler.getErrorStats();
      expect(stats['ProviderError']).toBe(1);
      expect(stats['AgentError']).toBe(1);

      errorHandler.clearStats();
      stats = errorHandler.getErrorStats();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe('Error Context', () => {
    it('should handle error with context', async () => {
      const error = new ProviderError('Provider failed');
      const context = {
        operation: 'test-operation',
        component: 'test-component',
        metadata: { key: 'value' },
      };

      const strategy = await errorHandler.handle(error, context);
      expect(strategy).toBe(RecoveryStrategy.RETRY);
    });
  });

  describe('KompleteError Details', () => {
    it('should handle KompleteError with code and details', async () => {
      const error = new KompleteError('Custom error', 'CUSTOM_CODE', { detail: 'value' });
      const strategy = await errorHandler.handle(error);
      expect(strategy).toBe(RecoveryStrategy.ABORT);
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ detail: 'value' });
    });
  });
});
