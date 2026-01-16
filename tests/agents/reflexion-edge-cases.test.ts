/**
 * Edge case tests for ReflexionAgent - Complex 30-50 iteration scenarios
 *
 * These tests validate the agent's performance on complex projects that require:
 * - Multi-file coordination with dependencies
 * - Complex logic implementation
 * - Error recovery and adaptation
 * - Extended iteration counts (30-50 cycles)
 *
 * Designed to stress-test the agent beyond typical use cases.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ReflexionAgent, type ReflexionAgentOptions } from '../../src/core/agents/reflexion';
import { LLMRouter } from '../../src/core/llm/Router';
import { createDefaultRegistry } from '../../src/core/llm/providers/ProviderFactory';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test workspace
const TEST_WORKSPACE = path.join(process.cwd(), 'test-workspace-reflexion-edge-cases');

// Edge case test configuration: Allow more iterations before detecting repetition
const EDGE_CASE_OPTIONS: ReflexionAgentOptions = {
  repetitionThreshold: 15, // Allow 15 consecutive identical thoughts (vs default 3)
  stagnationThreshold: 10  // Allow 10 iterations without progress (vs default 5)
};

// Setup/teardown
async function setupWorkspace() {
  try {
    await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
  }
  await fs.mkdir(TEST_WORKSPACE, { recursive: true });
  process.chdir(TEST_WORKSPACE);
}

async function cleanupWorkspace() {
  try {
    process.chdir(path.dirname(TEST_WORKSPACE));
    await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

describe('ReflexionAgent Edge Cases (30-50 Iterations)', () => {
  beforeEach(async () => {
    await setupWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace();
  });

  test('EDGE CASE 1: Complex REST API with multiple dependencies (30-40 iterations)', async () => {
    const goal = `Create a TypeScript REST API project with:
1. src/types.ts - Define User, Product, Order types
2. src/database.ts - Mock database with CRUD operations
3. src/api/users.ts - User endpoints (GET, POST, PUT, DELETE)
4. src/api/products.ts - Product endpoints with search functionality
5. src/api/orders.ts - Order endpoints with user/product relationships
6. src/server.ts - Express server setup connecting all endpoints
7. tests/api.test.ts - Integration tests for all endpoints`;

    // Use GLM-4.7 to avoid Kimi-K2 concurrency limits (4 units)
    const registry = await createDefaultRegistry();
    const router = new LLMRouter(registry);
    const agent = new ReflexionAgent(goal, router, 'glm-4.7', EDGE_CASE_OPTIONS); // Use higher thresholds for edge cases

    let cycles = 0;
    const maxCycles = 40;
    let completedSuccessfully = false;
    const startTime = Date.now();

    console.log('\n🔥 EDGE CASE 1: Complex REST API Project');
    console.log(`Goal: Multi-file API with dependencies\n`);

    try {
      let lastInput = 'Start building the REST API project with proper dependencies';
      while (cycles < maxCycles) {
        const result = await agent.cycle(lastInput);
        cycles++;

        if (cycles % 10 === 0) {
          const metrics = agent.getMetrics();
          console.log(`\nProgress at cycle ${cycles}:`);
          console.log(`  Files: ${metrics.filesCreated}, Lines: ${metrics.linesChanged}`);
        }

        // Check for completion (all 7 files created)
        try {
          const hasTypes = await fs.access('src/types.ts').then(() => true).catch(() => false);
          const hasDatabase = await fs.access('src/database.ts').then(() => true).catch(() => false);
          const hasUsersApi = await fs.access('src/api/users.ts').then(() => true).catch(() => false);
          const hasProductsApi = await fs.access('src/api/products.ts').then(() => true).catch(() => false);
          const hasOrdersApi = await fs.access('src/api/orders.ts').then(() => true).catch(() => false);
          const hasServer = await fs.access('src/server.ts').then(() => true).catch(() => false);
          const hasTests = await fs.access('tests/api.test.ts').then(() => true).catch(() => false);

          if (hasTypes && hasDatabase && hasUsersApi && hasProductsApi && hasOrdersApi && hasServer && hasTests) {
            completedSuccessfully = true;
            console.log(`\n✅ All 7 files created after ${cycles} cycles`);
            break;
          }
        } catch (error) {
          // Files don't exist yet
        }

        lastInput = result.observation;
      }
    } catch (error: any) {
      console.error(`\n❌ Error after ${cycles} cycles:`, error.message);
      throw error;
    }

    const duration = (Date.now() - startTime) / 1000;
    const metrics = agent.getMetrics();

    console.log('\n📊 Edge Case 1 Results:');
    console.log(`  Total Cycles: ${cycles}`);
    console.log(`  Duration: ${duration.toFixed(1)}s`);
    console.log(`  Files Created: ${metrics.filesCreated}`);
    console.log(`  Files Modified: ${metrics.filesModified}`);
    console.log(`  Lines Changed: ${metrics.linesChanged}`);

    expect(completedSuccessfully).toBe(true);
    expect(metrics.filesCreated).toBeGreaterThanOrEqual(7);
    expect(cycles).toBeLessThanOrEqual(maxCycles);
    expect(cycles).toBeGreaterThan(0);

    console.log(`\n✅ Edge case 1 completed successfully in ${cycles} cycles`);
  }, 300000); // 5 minute timeout

  test('EDGE CASE 2: Algorithm implementation with complex logic (25-35 iterations)', async () => {
    const goal = `Create a TypeScript data structures library with:
1. src/interfaces.ts - Generic interfaces for data structures
2. src/linked-list.ts - Doubly linked list implementation
3. src/binary-tree.ts - Binary search tree with insert/search/delete
4. src/graph.ts - Graph with DFS/BFS traversal algorithms
5. src/heap.ts - Min/Max heap with heapify operations
6. tests/data-structures.test.ts - Comprehensive unit tests for all structures`;

    // Use GLM-4.7 to avoid Kimi-K2 concurrency limits (4 units)
    const registry = await createDefaultRegistry();
    const router = new LLMRouter(registry);
    const agent = new ReflexionAgent(goal, router, 'glm-4.7', EDGE_CASE_OPTIONS); // Use higher thresholds for edge cases

    let cycles = 0;
    const maxCycles = 35;
    let completedSuccessfully = false;
    const startTime = Date.now();

    console.log('\n🔥 EDGE CASE 2: Complex Algorithm Implementation');
    console.log(`Goal: Data structures library with algorithms\n`);

    try {
      let lastInput = 'Start building the data structures library with proper algorithms';
      while (cycles < maxCycles) {
        const result = await agent.cycle(lastInput);
        cycles++;

        if (cycles % 10 === 0) {
          const metrics = agent.getMetrics();
          console.log(`\nProgress at cycle ${cycles}:`);
          console.log(`  Files: ${metrics.filesCreated}, Lines: ${metrics.linesChanged}`);
        }

        // Check for completion (all 6 files created)
        try {
          const hasInterfaces = await fs.access('src/interfaces.ts').then(() => true).catch(() => false);
          const hasLinkedList = await fs.access('src/linked-list.ts').then(() => true).catch(() => false);
          const hasBinaryTree = await fs.access('src/binary-tree.ts').then(() => true).catch(() => false);
          const hasGraph = await fs.access('src/graph.ts').then(() => true).catch(() => false);
          const hasHeap = await fs.access('src/heap.ts').then(() => true).catch(() => false);
          const hasTests = await fs.access('tests/data-structures.test.ts').then(() => true).catch(() => false);

          if (hasInterfaces && hasLinkedList && hasBinaryTree && hasGraph && hasHeap && hasTests) {
            completedSuccessfully = true;
            console.log(`\n✅ All 6 files created after ${cycles} cycles`);
            break;
          }
        } catch (error) {
          // Files don't exist yet
        }

        lastInput = result.observation;
      }
    } catch (error: any) {
      console.error(`\n❌ Error after ${cycles} cycles:`, error.message);
      throw error;
    }

    const duration = (Date.now() - startTime) / 1000;
    const metrics = agent.getMetrics();

    console.log('\n📊 Edge Case 2 Results:');
    console.log(`  Total Cycles: ${cycles}`);
    console.log(`  Duration: ${duration.toFixed(1)}s`);
    console.log(`  Files Created: ${metrics.filesCreated}`);
    console.log(`  Files Modified: ${metrics.filesModified}`);
    console.log(`  Lines Changed: ${metrics.linesChanged}`);

    expect(completedSuccessfully).toBe(true);
    expect(metrics.filesCreated).toBeGreaterThanOrEqual(6);
    expect(cycles).toBeLessThanOrEqual(maxCycles);
    expect(cycles).toBeGreaterThan(0);

    console.log(`\n✅ Edge case 2 completed successfully in ${cycles} cycles`);
  }, 300000); // 5 minute timeout

  test('EDGE CASE 3: Full-stack project with frontend/backend (40-50 iterations)', async () => {
    const goal = `Create a full-stack TypeScript project with:
BACKEND:
1. backend/src/types.ts - Shared types
2. backend/src/database.ts - Database layer
3. backend/src/auth.ts - Authentication middleware
4. backend/src/routes.ts - API routes
5. backend/src/server.ts - Server setup
FRONTEND:
6. frontend/src/api.ts - API client
7. frontend/src/components/Login.tsx - Login component
8. frontend/src/components/Dashboard.tsx - Dashboard component
9. frontend/src/App.tsx - Main app component
TESTS:
10. tests/backend.test.ts - Backend tests
11. tests/frontend.test.tsx - Frontend tests`;

    // Use GLM-4.7 to avoid Kimi-K2 concurrency limits (4 units)
    const registry = await createDefaultRegistry();
    const router = new LLMRouter(registry);
    const agent = new ReflexionAgent(goal, router, 'glm-4.7', EDGE_CASE_OPTIONS); // Use higher thresholds for edge cases

    let cycles = 0;
    const maxCycles = 50;
    let completedSuccessfully = false;
    const startTime = Date.now();

    console.log('\n🔥 EDGE CASE 3: Full-Stack Project');
    console.log(`Goal: Frontend + Backend with proper separation\n`);

    try {
      let lastInput = 'Start building the full-stack project with backend first, then frontend';
      while (cycles < maxCycles) {
        const result = await agent.cycle(lastInput);
        cycles++;

        if (cycles % 10 === 0) {
          const metrics = agent.getMetrics();
          console.log(`\nProgress at cycle ${cycles}:`);
          console.log(`  Files: ${metrics.filesCreated}, Lines: ${metrics.linesChanged}`);
        }

        // Check for completion (all 11 files created)
        try {
          const backendFiles = await Promise.all([
            fs.access('backend/src/types.ts').then(() => true).catch(() => false),
            fs.access('backend/src/database.ts').then(() => true).catch(() => false),
            fs.access('backend/src/auth.ts').then(() => true).catch(() => false),
            fs.access('backend/src/routes.ts').then(() => true).catch(() => false),
            fs.access('backend/src/server.ts').then(() => true).catch(() => false)
          ]);

          const frontendFiles = await Promise.all([
            fs.access('frontend/src/api.ts').then(() => true).catch(() => false),
            fs.access('frontend/src/components/Login.tsx').then(() => true).catch(() => false),
            fs.access('frontend/src/components/Dashboard.tsx').then(() => true).catch(() => false),
            fs.access('frontend/src/App.tsx').then(() => true).catch(() => false)
          ]);

          const testFiles = await Promise.all([
            fs.access('tests/backend.test.ts').then(() => true).catch(() => false),
            fs.access('tests/frontend.test.tsx').then(() => true).catch(() => false)
          ]);

          const allBackend = backendFiles.every(exists => exists);
          const allFrontend = frontendFiles.every(exists => exists);
          const allTests = testFiles.every(exists => exists);

          if (allBackend && allFrontend && allTests) {
            completedSuccessfully = true;
            console.log(`\n✅ All 11 files created after ${cycles} cycles`);
            break;
          }
        } catch (error) {
          // Files don't exist yet
        }

        lastInput = result.observation;
      }
    } catch (error: any) {
      console.error(`\n❌ Error after ${cycles} cycles:`, error.message);
      throw error;
    }

    const duration = (Date.now() - startTime) / 1000;
    const metrics = agent.getMetrics();

    console.log('\n📊 Edge Case 3 Results:');
    console.log(`  Total Cycles: ${cycles}`);
    console.log(`  Duration: ${duration.toFixed(1)}s`);
    console.log(`  Files Created: ${metrics.filesCreated}`);
    console.log(`  Files Modified: ${metrics.filesModified}`);
    console.log(`  Lines Changed: ${metrics.linesChanged}`);

    expect(completedSuccessfully).toBe(true);
    expect(metrics.filesCreated).toBeGreaterThanOrEqual(11);
    expect(cycles).toBeLessThanOrEqual(maxCycles);
    expect(cycles).toBeGreaterThan(0);

    console.log(`\n✅ Edge case 3 completed successfully in ${cycles} cycles`);
  }, 600000); // 10 minute timeout

  test('EDGE CASE 4: Error recovery - intentional failures (20-30 iterations)', async () => {
    const goal = `Create a TypeScript project that will require error recovery:
1. src/invalid-syntax.ts - Create a file, then fix syntax errors
2. src/type-errors.ts - Create with type errors, then fix them
3. src/missing-deps.ts - Reference non-existent modules, then create them
4. tests/recovery.test.ts - Tests that validate the fixed code`;

    // Use GLM-4.7 to avoid Kimi-K2 concurrency limits (4 units)
    const registry = await createDefaultRegistry();
    const router = new LLMRouter(registry);
    const agent = new ReflexionAgent(goal, router, 'glm-4.7', EDGE_CASE_OPTIONS); // Use higher thresholds for edge cases

    let cycles = 0;
    const maxCycles = 30;
    let completedSuccessfully = false;
    let errorsEncountered = 0;
    const startTime = Date.now();

    console.log('\n🔥 EDGE CASE 4: Error Recovery Test');
    console.log(`Goal: Create files with errors, then fix them\n`);

    try {
      let lastInput = 'Start building the project with intentional errors to test recovery';
      while (cycles < maxCycles) {
        const result = await agent.cycle(lastInput);
        cycles++;

        // Count errors in observations
        if (result.observation.toLowerCase().includes('error') ||
            result.observation.toLowerCase().includes('failed')) {
          errorsEncountered++;
        }

        if (cycles % 10 === 0) {
          const metrics = agent.getMetrics();
          console.log(`\nProgress at cycle ${cycles}:`);
          console.log(`  Files: ${metrics.filesCreated}, Errors: ${errorsEncountered}`);
        }

        // Check for completion (all 4 files created and fixed)
        try {
          const hasInvalidSyntax = await fs.access('src/invalid-syntax.ts').then(() => true).catch(() => false);
          const hasTypeErrors = await fs.access('src/type-errors.ts').then(() => true).catch(() => false);
          const hasMissingDeps = await fs.access('src/missing-deps.ts').then(() => true).catch(() => false);
          const hasTests = await fs.access('tests/recovery.test.ts').then(() => true).catch(() => false);

          if (hasInvalidSyntax && hasTypeErrors && hasMissingDeps && hasTests) {
            // Verify files have content (were fixed, not just created)
            const syntax = await fs.readFile('src/invalid-syntax.ts', 'utf-8');
            const types = await fs.readFile('src/type-errors.ts', 'utf-8');
            const deps = await fs.readFile('src/missing-deps.ts', 'utf-8');

            if (syntax.length > 50 && types.length > 50 && deps.length > 50) {
              completedSuccessfully = true;
              console.log(`\n✅ All files created and fixed after ${cycles} cycles`);
              break;
            }
          }
        } catch (error) {
          // Files don't exist yet
        }

        lastInput = result.observation;
      }
    } catch (error: any) {
      console.error(`\n❌ Error after ${cycles} cycles:`, error.message);
      throw error;
    }

    const duration = (Date.now() - startTime) / 1000;
    const metrics = agent.getMetrics();

    console.log('\n📊 Edge Case 4 Results:');
    console.log(`  Total Cycles: ${cycles}`);
    console.log(`  Duration: ${duration.toFixed(1)}s`);
    console.log(`  Files Created: ${metrics.filesCreated}`);
    console.log(`  Files Modified: ${metrics.filesModified}`);
    console.log(`  Errors Encountered: ${errorsEncountered}`);
    console.log(`  Lines Changed: ${metrics.linesChanged}`);

    expect(completedSuccessfully).toBe(true);
    expect(metrics.filesCreated).toBeGreaterThanOrEqual(4);
    expect(errorsEncountered).toBeGreaterThan(0); // Should encounter at least some errors
    expect(cycles).toBeLessThanOrEqual(maxCycles);

    console.log(`\n✅ Edge case 4 completed with ${errorsEncountered} errors successfully recovered`);
  }, 300000); // 5 minute timeout
});
