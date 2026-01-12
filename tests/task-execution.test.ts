/**
 * Task Execution Module Tests
 *
 * Tests for:
 * - TaskPlanner: Task planning and decomposition
 * - TaskExecutor: Task execution framework
 * - TaskResultAggregator: Result aggregation
 * - TaskDependencyResolver: Dependency resolution
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TaskPlanner, TaskExecutor, TaskResultAggregator, TaskDependencyResolver } from '../src/core/tasks';
import type { Task, TaskPriority } from '../src/types';
import type { TaskPlan } from '../src/core/tasks/planner';

describe('Task Execution Module', () => {
  describe('TaskPlanner', () => {
    let planner: TaskPlanner;

    beforeEach(() => {
      planner = new TaskPlanner();
    });

    it('should create a task planner instance', () => {
      expect(planner).toBeDefined();
    });

    it('should plan a simple task', async () => {
      const task: Task = {
        id: 'task-1',
        description: 'Simple task',
        complexity: 'simple',
        priority: 'medium',
        status: 'pending',
      };

      const plan = await planner.planTask(task);

      expect(plan).toBeDefined();
      expect(plan.task.id).toBe(task.id);
      expect(plan.subtasks).toBeDefined();
    });

    it('should decompose a complex task into subtasks', async () => {
      const task: Task = {
        id: 'task-2',
        description: 'Complex task that needs decomposition',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
      };

      const plan = await planner.planTask(task, {
        maxDepth: 3,
        strategy: 'hierarchical',
      });

      expect(plan.subtasks.length).toBeGreaterThan(0);
      expect(plan.executionOrder.length).toBeGreaterThan(0);
    });

    it('should analyze task dependencies', async () => {
      const task: Task = {
        id: 'task-3',
        description: 'Task with dependencies',
        complexity: 'medium',
        priority: 'high',
        status: 'pending',
      };

      const plan = await planner.planTask(task, {
        maxDepth: 2,
      });

      expect(plan.dependencies).toBeDefined();
      expect(plan.dependencies.length).toBeGreaterThanOrEqual(0);
    });

    it('should use cached plans', async () => {
      const task: Task = {
        id: 'task-4',
        description: 'Task for caching test',
        complexity: 'simple',
        priority: 'low',
        status: 'pending',
      };

      const plan1 = await planner.planTask(task);
      const plan2 = await planner.planTask(task);

      expect(plan1).toEqual(plan2);
    });

    it('should clear plan cache', async () => {
      const task: Task = {
        id: 'task-5',
        description: 'Task for cache clear test',
        complexity: 'simple',
        priority: 'low',
        status: 'pending',
      };

      await planner.planTask(task);
      planner.clearCache();

      const cached = planner.getCachedPlan(task.id);
      expect(cached).toBeNull();
    });
  });

  describe('TaskExecutor', () => {
    let executor: TaskExecutor;

    beforeEach(() => {
      executor = new TaskExecutor({
        maxConcurrent: 3,
        defaultTimeout: 5000,
        enableRetry: true,
        maxRetries: 2,
        retryDelay: 100,
      });
    });

    afterEach(() => {
      executor.clearHistory();
    });

    it('should create a task executor instance', () => {
      expect(executor).toBeDefined();
    });

    it('should execute a simple task', async () => {
      const task: Task = {
        id: 'exec-1',
        description: 'Simple execution task',
        complexity: 'simple',
        priority: 'medium',
        status: 'pending',
      };

      const result = await executor.executeTask(task);

      expect(result).toBeDefined();
      expect(result.taskId).toBe(task.id);
      expect(result.status).toBe('completed');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should execute a task plan with subtasks', async () => {
      const task: Task = {
        id: 'exec-2',
        description: 'Task with subtasks',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
        estimatedDuration: 10000,
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, {
        maxDepth: 2,
        maxSubtasks: 3,
      });

      const result = await executor.executePlan(plan, {
        timeout: 30000,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.subtaskResults).toBeDefined();
      expect(result.subtaskResults!.size).toBeGreaterThan(0);
    });

    it('should execute tasks in parallel', async () => {
      const tasks: Task[] = [
        {
          id: 'exec-3a',
          description: 'Parallel task 1',
          complexity: 'simple',
          priority: 'medium',
          status: 'pending',
        },
        {
          id: 'exec-3b',
          description: 'Parallel task 2',
          complexity: 'simple',
          priority: 'medium',
          status: 'pending',
        },
        {
          id: 'exec-3c',
          description: 'Parallel task 3',
          complexity: 'simple',
          priority: 'medium',
          status: 'pending',
        },
      ];

      const results = await executor.executeParallel(tasks);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'completed')).toBe(true);
    });

    it('should handle task timeout', async () => {
      const task: Task = {
        id: 'exec-4',
        description: 'Timeout task',
        complexity: 'complex',
        priority: 'medium',
        status: 'pending',
      };

      const result = await executor.executeTask(task, {
        timeout: 100,
      });

      expect(result.status).toBe('timeout');
    });

    it('should track active executions', async () => {
      const task: Task = {
        id: 'exec-5',
        description: 'Active tracking task',
        complexity: 'simple',
        priority: 'low',
        status: 'pending',
      };

      const activeBefore = executor.getActiveExecutions();
      expect(activeBefore.length).toBe(0);

      const executionPromise = executor.executeTask(task);
      const activeDuring = executor.getActiveExecutions();
      expect(activeDuring.length).toBeGreaterThan(0);

      await executionPromise;
    });

    it('should provide execution statistics', async () => {
      const task: Task = {
        id: 'exec-6',
        description: 'Statistics task',
        complexity: 'simple',
        priority: 'medium',
        status: 'pending',
      };

      await executor.executeTask(task);
      await executor.executeTask(task);

      const stats = executor.getStatistics();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(2);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('TaskResultAggregator', () => {
    let aggregator: TaskResultAggregator;

    beforeEach(() => {
      aggregator = new TaskResultAggregator();
    });

    it('should create an aggregator instance', () => {
      expect(aggregator).toBeDefined();
    });

    it('should aggregate results with merge strategy', () => {
      const results = [
        {
          taskId: 'agg-1',
          executionId: 'exec-1',
          status: 'completed' as const,
          result: { key1: 'value1' },
          duration: 100,
        },
        {
          taskId: 'agg-2',
          executionId: 'exec-2',
          status: 'completed' as const,
          result: { key2: 'value2' },
          duration: 150,
        },
      ];

      const aggregated = aggregator.aggregate(results, {
        strategy: 'merge',
      });

      expect(aggregated).toBeDefined();
      expect(aggregated.strategy).toBe('merge');
      expect(aggregated.count).toBe(2);
      expect(aggregated.successCount).toBe(2);
      expect(aggregated.data).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should aggregate results with concat strategy', () => {
      const results = [
        {
          taskId: 'agg-3',
          executionId: 'exec-3',
          status: 'completed' as const,
          result: [1, 2, 3],
          duration: 100,
        },
        {
          taskId: 'agg-4',
          executionId: 'exec-4',
          status: 'completed' as const,
          result: [4, 5, 6],
          duration: 150,
        },
      ];

      const aggregated = aggregator.aggregate(results, {
        strategy: 'concat',
      });

      expect(aggregated.data).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should aggregate results with sum strategy', () => {
      const results = [
        {
          taskId: 'agg-5',
          executionId: 'exec-5',
          status: 'completed' as const,
          result: 10,
          duration: 100,
        },
        {
          taskId: 'agg-6',
          executionId: 'exec-6',
          status: 'completed' as const,
          result: 20,
          duration: 150,
        },
      ];

      const aggregated = aggregator.aggregate(results, {
        strategy: 'sum',
      });

      expect(aggregated.data).toBe(30);
    });

    it('should aggregate results with average strategy', () => {
      const results = [
        {
          taskId: 'agg-7',
          executionId: 'exec-7',
          status: 'completed' as const,
          result: 10,
          duration: 100,
        },
        {
          taskId: 'agg-8',
          executionId: 'exec-8',
          status: 'completed' as const,
          result: 20,
          duration: 150,
        },
      ];

      const aggregated = aggregator.aggregate(results, {
        strategy: 'average',
      });

      expect(aggregated.data).toBe(15);
    });

    it('should filter failed results by default', () => {
      const results = [
        {
          taskId: 'agg-9',
          executionId: 'exec-9',
          status: 'completed' as const,
          result: { data: 'success' },
          duration: 100,
        },
        {
          taskId: 'agg-10',
          executionId: 'exec-10',
          status: 'failed' as const,
          error: new Error('Failed'),
          duration: 150,
        },
      ];

      const aggregated = aggregator.aggregate(results);

      expect(aggregated.successCount).toBe(1);
      expect(aggregated.failureCount).toBe(0);
    });

    it('should include failed results when requested', () => {
      const results = [
        {
          taskId: 'agg-11',
          executionId: 'exec-11',
          status: 'completed' as const,
          result: { data: 'success' },
          duration: 100,
        },
        {
          taskId: 'agg-12',
          executionId: 'exec-12',
          status: 'failed' as const,
          error: new Error('Failed'),
          duration: 150,
        },
      ];

      const aggregated = aggregator.aggregate(results, {
        includeFailed: true,
      });

      expect(aggregated.successCount).toBe(1);
      expect(aggregated.failureCount).toBe(1);
    });

    it('should validate aggregated results', () => {
      const results = [
        {
          taskId: 'agg-13',
          executionId: 'exec-13',
          status: 'completed' as const,
          result: { data: 'success' },
          duration: 100,
        },
      ];

      const aggregated = aggregator.aggregate(results);
      const isValid = aggregator.validateResult(aggregated);

      expect(isValid).toBe(true);
    });

    it('should provide aggregation statistics', () => {
      const results = [
        {
          taskId: 'agg-14',
          executionId: 'exec-14',
          status: 'completed' as const,
          result: { data: 'success' },
          duration: 100,
        },
        {
          taskId: 'agg-15',
          executionId: 'exec-15',
          status: 'completed' as const,
          result: { data: 'success' },
          duration: 150,
        },
      ];

      const aggregated1 = aggregator.aggregate(results);
      const aggregated2 = aggregator.aggregate(results);

      const stats = aggregator.getStatistics([aggregated1, aggregated2]);

      expect(stats.totalAggregations).toBe(2);
      expect(stats.totalResults).toBe(4);
      expect(stats.averageSuccessRate).toBe(100);
    });
  });

  describe('TaskDependencyResolver', () => {
    let resolver: TaskDependencyResolver;

    beforeEach(() => {
      resolver = new TaskDependencyResolver();
    });

    it('should create a resolver instance', () => {
      expect(resolver).toBeDefined();
    });

    it('should resolve simple dependencies', async () => {
      const task: Task = {
        id: 'dep-1',
        description: 'Task with simple dependencies',
        complexity: 'medium',
        priority: 'high',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, { maxDepth: 2 });

      const result = resolver.resolve(plan);

      expect(result.success).toBe(true);
      expect(result.executionOrder).toBeDefined();
      expect(result.executionOrder.length).toBeGreaterThan(0);
    });

    it('should detect circular dependencies', async () => {
      const task: Task = {
        id: 'dep-2',
        description: 'Task with circular dependencies',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, { maxDepth: 3 });

      // Manually create circular dependency for testing
      if (plan.subtasks.length >= 2) {
        plan.dependencies.push({
          taskId: plan.subtasks[0].id,
          dependsOn: [plan.subtasks[1].id],
        });
        plan.dependencies.push({
          taskId: plan.subtasks[1].id,
          dependsOn: [plan.subtasks[0].id],
        });
      }

      const result = resolver.resolve(plan, {
        allowCircular: false,
      });

      expect(result.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should allow circular dependencies when configured', async () => {
      const task: Task = {
        id: 'dep-3',
        description: 'Task with circular dependencies',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, { maxDepth: 3 });

      // Manually create circular dependency for testing
      if (plan.subtasks.length >= 2) {
        plan.dependencies.push({
          taskId: plan.subtasks[0].id,
          dependsOn: [plan.subtasks[1].id],
        });
        plan.dependencies.push({
          taskId: plan.subtasks[1].id,
          dependsOn: [plan.subtasks[0].id],
        });
      }

      const result = resolver.resolve(plan, {
        allowCircular: true,
      });

      expect(result.success).toBe(true);
    });

    it('should provide execution levels', async () => {
      const task: Task = {
        id: 'dep-4',
        description: 'Task for execution levels',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, { maxDepth: 3 });

      const levels = resolver.getExecutionLevels(plan);

      expect(levels).toBeDefined();
      expect(levels.length).toBeGreaterThan(0);
    });

    it('should determine if tasks can be parallelized', async () => {
      const task: Task = {
        id: 'dep-5',
        description: 'Task for parallelization test',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, { maxDepth: 2 });

      if (plan.subtasks.length >= 2) {
        const canParallel = resolver.canParallelize(
          plan.subtasks[0].id,
          plan.subtasks[1].id,
          plan
        );

        expect(typeof canParallel).toBe('boolean');
      }
    });

    it('should find critical path', async () => {
      const task: Task = {
        id: 'dep-6',
        description: 'Task for critical path',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, { maxDepth: 3 });

      const criticalPath = resolver.getCriticalPath(plan);

      expect(criticalPath).toBeDefined();
      expect(Array.isArray(criticalPath)).toBe(true);
    });

    it('should cache resolution results', async () => {
      const task: Task = {
        id: 'dep-7',
        description: 'Task for caching test',
        complexity: 'simple',
        priority: 'medium',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task);

      const result1 = resolver.resolve(plan);
      const result2 = resolver.resolve(plan);

      expect(result1).toEqual(result2);
    });

    it('should clear resolution cache', async () => {
      const task: Task = {
        id: 'dep-8',
        description: 'Task for cache clear test',
        complexity: 'simple',
        priority: 'low',
        status: 'pending',
      };

      const planner = new TaskPlanner();
      const plan = await planner.planTask(task);

      resolver.resolve(plan);
      resolver.clearCache();

      const cached = resolver.getCachedResult(task.id);
      expect(cached).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should plan and execute a complete workflow', async () => {
      const task: Task = {
        id: 'integration-1',
        description: 'Complete workflow task',
        complexity: 'complex',
        priority: 'high',
        status: 'pending',
        estimatedDuration: 10000,
      };

      // Plan the task
      const planner = new TaskPlanner();
      const plan = await planner.planTask(task, {
        maxDepth: 2,
        maxSubtasks: 3,
      });

      // Resolve dependencies
      const resolver = new TaskDependencyResolver();
      const resolution = resolver.resolve(plan);

      expect(resolution.success).toBe(true);

      // Execute the plan
      const executor = new TaskExecutor();
      const result = await executor.executePlan(plan, {
        timeout: 30000,
      });

      expect(result.status).toBe('completed');
      expect(result.subtaskResults).toBeDefined();
    });

    it('should handle parallel task execution with aggregation', async () => {
      const tasks: Task[] = [
        {
          id: 'integration-2a',
          description: 'Parallel task A',
          complexity: 'simple',
          priority: 'medium',
          status: 'pending',
        },
        {
          id: 'integration-2b',
          description: 'Parallel task B',
          complexity: 'simple',
          priority: 'medium',
          status: 'pending',
        },
        {
          id: 'integration-2c',
          description: 'Parallel task C',
          complexity: 'simple',
          priority: 'medium',
          status: 'pending',
        },
      ];

      // Execute in parallel
      const executor = new TaskExecutor();
      const results = await executor.executeParallel(tasks);

      // Aggregate results
      const aggregator = new TaskResultAggregator();
      const aggregated = aggregator.aggregate(results);

      expect(aggregated.successCount).toBe(3);
      expect(aggregated.count).toBe(3);
    });
  });
});
