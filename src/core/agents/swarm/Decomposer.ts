/**
 * Task Decomposition for Swarm Orchestration
 * Source: /auto hooks/swarm-orchestrator.sh
 *
 * Implements 5 intelligent decomposition strategies based on task patterns
 */

export enum DecompositionStrategy {
  Feature = 'feature',
  Testing = 'testing',
  Refactor = 'refactor',
  Research = 'research',
  Generic = 'generic'
}

export interface SubTask {
  agentId: number;
  subtask: string;
  priority: number;
  phase: string;
  dependencies: number[];
}

export interface DecomposedTask {
  task: string;
  agentCount: number;
  decompositionStrategy: DecompositionStrategy;
  subtasks: SubTask[];
}

/**
 * Task decomposer with intelligent strategy selection
 */
export class TaskDecomposer {
  /**
   * Decompose task into subtasks for N agents
   */
  decompose(task: string, agentCount: number): DecomposedTask {
    const strategy = this.detectStrategy(task);
    const subtasks = this.generateSubtasks(task, agentCount, strategy);

    return {
      task,
      agentCount,
      decompositionStrategy: strategy,
      subtasks
    };
  }

  /**
   * Detect decomposition strategy from task description
   */
  private detectStrategy(task: string): DecompositionStrategy {
    const taskLower = task.toLowerCase();

    // Pattern 1: Feature Implementation
    if (/implement|build|create|add.*feature/i.test(taskLower)) {
      return DecompositionStrategy.Feature;
    }

    // Pattern 2: Testing/Validation
    if (/test|validate|check/i.test(taskLower)) {
      return DecompositionStrategy.Testing;
    }

    // Pattern 3: Refactoring
    if (/refactor|reorganize|restructure/i.test(taskLower)) {
      return DecompositionStrategy.Refactor;
    }

    // Pattern 4: Research/Analysis
    if (/research|analyze|investigate|explore/i.test(taskLower)) {
      return DecompositionStrategy.Research;
    }

    // Pattern 5: Generic Parallel
    return DecompositionStrategy.Generic;
  }

  /**
   * Generate subtasks based on strategy
   */
  private generateSubtasks(
    task: string,
    agentCount: number,
    strategy: DecompositionStrategy
  ): SubTask[] {
    switch (strategy) {
      case DecompositionStrategy.Feature:
        return this.decomposeFeature(task, agentCount);
      case DecompositionStrategy.Testing:
        return this.decomposeTesting(task, agentCount);
      case DecompositionStrategy.Refactor:
        return this.decomposeRefactor(task, agentCount);
      case DecompositionStrategy.Research:
        return this.decomposeResearch(task, agentCount);
      case DecompositionStrategy.Generic:
      default:
        return this.decomposeGeneric(task, agentCount);
    }
  }

  /**
   * Decompose feature implementation: Design → Implement → Test → Integrate
   */
  private decomposeFeature(task: string, agentCount: number): SubTask[] {
    if (agentCount === 3) {
      return [
        {
          agentId: 1,
          subtask: `Research and design: ${task}`,
          priority: 1,
          phase: 'design',
          dependencies: []
        },
        {
          agentId: 2,
          subtask: `Implement core logic: ${task}`,
          priority: 2,
          phase: 'implement',
          dependencies: [1]
        },
        {
          agentId: 3,
          subtask: `Write tests and validate: ${task}`,
          priority: 3,
          phase: 'test',
          dependencies: [2]
        }
      ];
    } else if (agentCount === 4) {
      return [
        {
          agentId: 1,
          subtask: `Research and design: ${task}`,
          priority: 1,
          phase: 'design',
          dependencies: []
        },
        {
          agentId: 2,
          subtask: `Implement core logic: ${task}`,
          priority: 2,
          phase: 'implement',
          dependencies: [1]
        },
        {
          agentId: 3,
          subtask: `Write tests: ${task}`,
          priority: 3,
          phase: 'test',
          dependencies: [2]
        },
        {
          agentId: 4,
          subtask: `Integration and validation: ${task}`,
          priority: 4,
          phase: 'integrate',
          dependencies: [2, 3]
        }
      ];
    } else {
      // 5+ agents (default feature decomposition)
      return [
        {
          agentId: 1,
          subtask: `Research and design architecture: ${task}`,
          priority: 1,
          phase: 'design',
          dependencies: []
        },
        {
          agentId: 2,
          subtask: `Implement backend/logic: ${task}`,
          priority: 2,
          phase: 'implement_backend',
          dependencies: [1]
        },
        {
          agentId: 3,
          subtask: `Implement frontend/interface: ${task}`,
          priority: 2,
          phase: 'implement_frontend',
          dependencies: [1]
        },
        {
          agentId: 4,
          subtask: `Write comprehensive tests: ${task}`,
          priority: 3,
          phase: 'test',
          dependencies: [2, 3]
        },
        {
          agentId: 5,
          subtask: `Integration, validation, documentation: ${task}`,
          priority: 4,
          phase: 'integrate',
          dependencies: [2, 3, 4]
        }
      ];
    }
  }

  /**
   * Decompose testing: Parallel independent tests
   */
  private decomposeTesting(task: string, agentCount: number): SubTask[] {
    const testTypes = [
      'unit tests',
      'integration tests',
      'e2e tests',
      'performance tests',
      'security tests'
    ];

    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const testType = i < testTypes.length ? testTypes[i] : `test suite part ${agentId}`;

      return {
        agentId,
        subtask: `Run ${testType}: ${task}`,
        priority: 1,
        phase: 'test',
        dependencies: []
      };
    });
  }

  /**
   * Decompose refactoring: Sequential modules with dependencies
   */
  private decomposeRefactor(task: string, agentCount: number): SubTask[] {
    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const dependencies = i > 0 ? [i] : [];

      return {
        agentId,
        subtask: `Refactor module/component ${agentId}: ${task}`,
        priority: agentId,
        phase: 'refactor',
        dependencies
      };
    });
  }

  /**
   * Decompose research: Parallel independent investigation
   */
  private decomposeResearch(task: string, agentCount: number): SubTask[] {
    const aspects = [
      'codebase patterns',
      'external solutions',
      'architecture analysis',
      'dependency mapping',
      'performance analysis'
    ];

    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const aspect = i < aspects.length ? aspects[i] : `investigation area ${agentId}`;

      return {
        agentId,
        subtask: `Research ${aspect}: ${task}`,
        priority: 1,
        phase: 'research',
        dependencies: []
      };
    });
  }

  /**
   * Generic parallel decomposition: Equal distribution
   */
  private decomposeGeneric(task: string, agentCount: number): SubTask[] {
    return Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;

      return {
        agentId,
        subtask: `Execute part ${agentId} of ${agentCount}: ${task}`,
        priority: 1,
        phase: 'execute',
        dependencies: []
      };
    });
  }
}
