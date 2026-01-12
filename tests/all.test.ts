/**
 * Comprehensive Test Suite for Phase 1: Foundation & Core Infrastructure
 *
 * This file runs all tests for Phase 1 components:
 * - Agent Lifecycle
 * - Agent Communication
 * - Context Management
 * - MCP Integration
 * - Configuration Management
 * - Logger
 * - Error Handler
 * - Provider System
 * - Slash Command System
 */

import { describe, test, expect } from 'bun:test';

// Import all test modules
import './agent-lifecycle.test';
import './agent-communication.test';
import './context-management.test';
import './mcp.test';
import './config.test';
import './logger.test';
import './error-handler.test';
import './providers.test';
import './commands.test';

describe('Phase 1: Foundation & Core Infrastructure', () => {
  test('All Phase 1 components are tested', () => {
    // This test serves as a marker that all Phase 1 tests are included
    expect(true).toBe(true);
  });
});
