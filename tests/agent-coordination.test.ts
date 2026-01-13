/**
 * Tests for Agent Coordination & Orchestration (Week 23-24)
 *
 * Tests for:
 * - Advanced Coordination Patterns
 * - Multi-Agent Workflows
 * - Agent Team Formation
 * - Hierarchical Agent Structures
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  CoordinationPatterns,
  AgentRole,
  CoordinationPattern,
  Workflows,
  WorkflowStepType,
  WorkflowState,
  Teams,
  Hierarchy,
  HierarchyTaskStatus,
  HierarchyTaskPriority,
  DelegationStrategy,
  type PatternConfig,
  type TeamConfig,
  type SwarmConfig,
  type HierarchicalConfig,
  type PipelineConfig,
  type WorkflowConfig,
  type WorkflowStep,
  type WorkflowExecutionContext,
  type AgentProfile,
  type AgentCapability,
  type TeamFormationRequest,
  type HierarchyConfig,
  type Task,
  type TaskDelegationRequest,
  initCoordinationPatterns,
  initWorkflows,
  initTeams,
  initHierarchy,
} from '../src/core/agents';

describe('CoordinationPatterns', () => {
  let patterns: CoordinationPatterns;

  beforeEach(() => {
    patterns = initCoordinationPatterns();
  });

  afterEach(() => {
    patterns.clearPatterns();
    patterns.clearExecutions();
  });

  describe('Team Pattern', () => {
    it('should register a team pattern', () => {
      const teamConfig: TeamConfig = {
        teamId: 'team-1',
        name: 'Test Team',
        roles: new Map([
          ['agent-1', AgentRole.PRIMARY],
          ['agent-2', AgentRole.SUPPORT],
        ]),
        channels: ['channel-1'],
        pattern: CoordinationPattern.TEAM,
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.TEAM,
        team: teamConfig,
      };

      patterns.registerPattern(config);

      const retrieved = patterns.getPattern('team-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.pattern).toBe(CoordinationPattern.TEAM);
    });

    it('should execute team pattern successfully', async () => {
      const teamConfig: TeamConfig = {
        teamId: 'team-1',
        name: 'Test Team',
        roles: new Map([
          ['agent-1', AgentRole.PRIMARY],
          ['agent-2', AgentRole.SUPPORT],
        ]),
        channels: ['channel-1'],
        pattern: CoordinationPattern.TEAM,
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.TEAM,
        team: teamConfig,
      };

      patterns.registerPattern(config);

      const result = await patterns.executeTeamPattern('team-1', async () => {
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(result.agentCount).toBe(2);
      expect(result.pattern).toBe(CoordinationPattern.TEAM);
    });

    it('should handle team pattern execution failure', async () => {
      const teamConfig: TeamConfig = {
        teamId: 'team-1',
        name: 'Test Team',
        roles: new Map([
          ['agent-1', AgentRole.PRIMARY],
        ]),
        channels: ['channel-1'],
        pattern: CoordinationPattern.TEAM,
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.TEAM,
        team: teamConfig,
      };

      patterns.registerPattern(config);

      const result = await patterns.executeTeamPattern('team-1', async () => {
        throw new Error('Test error');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
    });
  });

  describe('Swarm Pattern', () => {
    it('should register a swarm pattern', () => {
      const swarmConfig: SwarmConfig = {
        swarmId: 'swarm-1',
        agentCount: 5,
        distributionStrategy: 'round_robin',
        aggregationStrategy: 'majority',
        maxConcurrent: 3,
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.SWARM,
        swarm: swarmConfig,
      };

      patterns.registerPattern(config);

      const retrieved = patterns.getPattern('swarm-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.pattern).toBe(CoordinationPattern.SWARM);
    });

    it('should execute swarm pattern successfully', async () => {
      const swarmConfig: SwarmConfig = {
        swarmId: 'swarm-1',
        agentCount: 5,
        distributionStrategy: 'round_robin',
        aggregationStrategy: 'majority',
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.SWARM,
        swarm: swarmConfig,
      };

      patterns.registerPattern(config);

      const result = await patterns.executeSwarmPattern('swarm-1', async () => {
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(result.agentCount).toBe(5);
      expect(result.pattern).toBe(CoordinationPattern.SWARM);
    });
  });

  describe('Hierarchical Pattern', () => {
    it('should register a hierarchical pattern', () => {
      const hierarchicalConfig: HierarchicalConfig = {
        hierarchyId: 'hierarchy-1',
        supervisorId: 'supervisor-1',
        hierarchy: new Map([
          ['supervisor-1', ['agent-1', 'agent-2']],
          ['agent-1', ['agent-3', 'agent-4']],
        ]),
        delegationStrategy: 'direct',
        reportFrequencyMs: 5000,
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.HIERARCHICAL,
        hierarchy: hierarchicalConfig,
      };

      patterns.registerPattern(config);

      const retrieved = patterns.getPattern('hierarchy-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.pattern).toBe(CoordinationPattern.HIERARCHICAL);
    });

    it('should execute hierarchical pattern successfully', async () => {
      const hierarchicalConfig: HierarchicalConfig = {
        hierarchyId: 'hierarchy-1',
        supervisorId: 'supervisor-1',
        hierarchy: new Map([
          ['supervisor-1', ['agent-1', 'agent-2']],
        ]),
        delegationStrategy: 'direct',
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.HIERARCHICAL,
        hierarchy: hierarchicalConfig,
      };

      patterns.registerPattern(config);

      const result = await patterns.executeHierarchicalPattern('hierarchy-1', async () => {
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(result.pattern).toBe(CoordinationPattern.HIERARCHICAL);
    });
  });

  describe('Pipeline Pattern', () => {
    it('should register a pipeline pattern', () => {
      const pipelineConfig: PipelineConfig = {
        pipelineId: 'pipeline-1',
        stages: ['agent-1', 'agent-2', 'agent-3'],
        parallel: false,
        dataStrategy: 'pass_all',
        errorStrategy: 'stop',
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.PIPELINE,
        pipeline: pipelineConfig,
      };

      patterns.registerPattern(config);

      const retrieved = patterns.getPattern('pipeline-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.pattern).toBe(CoordinationPattern.PIPELINE);
    });

    it('should execute pipeline pattern successfully', async () => {
      const pipelineConfig: PipelineConfig = {
        pipelineId: 'pipeline-1',
        stages: ['agent-1', 'agent-2', 'agent-3'],
        dataStrategy: 'pass_all',
        errorStrategy: 'stop',
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.PIPELINE,
        pipeline: pipelineConfig,
      };

      patterns.registerPattern(config);

      const result = await patterns.executePipelinePattern('pipeline-1', async () => {
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(result.agentCount).toBe(3);
      expect(result.pattern).toBe(CoordinationPattern.PIPELINE);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const teamConfig: TeamConfig = {
        teamId: 'team-1',
        name: 'Test Team',
        roles: new Map([['agent-1', AgentRole.PRIMARY]]),
        channels: ['channel-1'],
        pattern: CoordinationPattern.TEAM,
      };

      const config: PatternConfig = {
        pattern: CoordinationPattern.TEAM,
        team: teamConfig,
      };

      patterns.registerPattern(config);

      await patterns.executeTeamPattern('team-1', async () => ({ success: true }));
      await patterns.executeTeamPattern('team-1', async () => ({ success: true }));

      const stats = patterns.getStatistics();

      expect(stats.totalPatterns).toBe(1);
      expect(stats.totalExecutions).toBe(2);
      expect(stats.successRate).toBe(1.0);
      expect(stats.patternsByType[CoordinationPattern.TEAM]).toBe(1);
    });
  });
});

describe('Workflows', () => {
  let workflows: Workflows;

  beforeEach(() => {
    workflows = initWorkflows(async (agentId, task, context) => {
      return { agentId, task, result: 'success' };
    });
  });

  afterEach(() => {
    workflows.clearWorkflows();
    workflows.clearExecutions();
  });

  describe('Workflow Registration', () => {
    it('should register a workflow', () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Test task',
          nextStep: 'step-2',
        },
        {
          stepId: 'step-2',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-2',
          task: 'Test task 2',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'sequential',
      };

      workflows.registerWorkflow(config);

      const retrieved = workflows.getWorkflow('workflow-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Workflow');
      expect(retrieved?.steps).toHaveLength(2);
    });
  });

  describe('Sequential Workflow Execution', () => {
    it('should execute sequential workflow successfully', async () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Task 1',
          nextStep: 'step-2',
        },
        {
          stepId: 'step-2',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-2',
          task: 'Task 2',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Sequential Workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'sequential',
      };

      workflows.registerWorkflow(config);

      const result = await workflows.executeWorkflow('workflow-1');

      expect(result.success).toBe(true);
      expect(result.state).toBe(WorkflowState.COMPLETED);
      expect(result.stepsExecuted).toBe(2);
    });
  });

  describe('Parallel Workflow Execution', () => {
    it('should execute parallel workflow successfully', async () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.PARALLEL,
          parallelSteps: ['step-2', 'step-3'],
          mergeStrategy: 'concat',
          nextStep: 'step-4',
        },
        {
          stepId: 'step-2',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Task 1',
        },
        {
          stepId: 'step-3',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-2',
          task: 'Task 2',
        },
        {
          stepId: 'step-4',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-3',
          task: 'Task 3',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Parallel Workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'parallel',
      };

      workflows.registerWorkflow(config);

      const result = await workflows.executeWorkflow('workflow-1');

      expect(result.success).toBe(true);
      expect(result.state).toBe(WorkflowState.COMPLETED);
    });
  });

  describe('Workflow State Management', () => {
    it('should pause a running workflow', async () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.WAIT,
          waitCondition: 'var:ready',
          nextStep: 'step-2',
        },
        {
          stepId: 'step-2',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Task',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Pause Workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'sequential',
      };

      workflows.registerWorkflow(config);

      // Start workflow (it will wait)
      const executionPromise = workflows.executeWorkflow('workflow-1');

      // Pause after a short delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get the actual execution ID from the executions map
      const executions = (workflows as any).executions as Map<string, WorkflowExecutionContext>;
      const executionId = Array.from(executions.keys())[0];
      
      const paused = workflows.pauseWorkflow(executionId);
      expect(paused).toBe(true);

      // Cancel the execution
      await executionPromise;
    });

    it('should resume a paused workflow', async () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.WAIT,
          waitCondition: 'var:ready',
          nextStep: 'step-2',
        },
        {
          stepId: 'step-2',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Task',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Resume Workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'sequential',
      };

      workflows.registerWorkflow(config);

      // Start workflow
      const executionPromise = workflows.executeWorkflow('workflow-1');

      // Wait a bit for execution to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get actual execution ID
      const executions = (workflows as any).executions as Map<string, WorkflowExecutionContext>;
      const executionId = Array.from(executions.keys())[0];

      // Pause the workflow
      const paused = workflows.pauseWorkflow(executionId);
      expect(paused).toBe(true);

      // Resume the workflow
      const resumed = workflows.resumeWorkflow(executionId);
      expect(resumed).toBe(true);

      // Cancel execution
      await executionPromise;
    });
  });

  describe('Workflow Error Handling', () => {
    it('should handle workflow execution failure', async () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Task',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Error Workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'sequential',
        retryOnFailure: true,
        maxRetries: 1,
      };

      // Create a separate workflows instance with failing executor
      const testWorkflows = new Workflows(async (agentId, task, context) => {
        if (task === 'Task') {
          throw new Error('Test error');
        }
        return { success: true };
      });
      testWorkflows.registerWorkflow(config);

      const result = await testWorkflows.executeWorkflow('workflow-1');

      expect(result.success).toBe(false);
      expect(result.state).toBe(WorkflowState.FAILED);
      expect(result.error).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'step-1',
          type: WorkflowStepType.EXECUTE,
          agentId: 'agent-1',
          task: 'Task',
        },
      ];

      const config: WorkflowConfig = {
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        steps,
        startStepId: 'step-1',
        executionMode: 'sequential',
      };

      workflows.registerWorkflow(config);

      await workflows.executeWorkflow('workflow-1');

      const stats = workflows.getStatistics();

      expect(stats.totalWorkflows).toBe(1);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.activeExecutions).toBe(0);
    });
  });
});

describe('Teams', () => {
  let teams: Teams;

  beforeEach(() => {
    teams = initTeams();
  });

  afterEach(() => {
    teams.clear();
  });

  describe('Agent Registration', () => {
    it('should register an agent', () => {
      const capabilities: AgentCapability[] = [
        {
          name: 'coding',
          description: 'Can write code',
          score: 0.9,
          tags: ['development'],
        },
        {
          name: 'testing',
          description: 'Can write tests',
          score: 0.8,
          tags: ['testing'],
        },
      ];

      const profile: AgentProfile = {
        agentId: 'agent-1',
        name: 'Test Agent',
        capabilities,
        rolePreferences: [AgentRole.PRIMARY, AgentRole.SUPPORT],
        available: true,
        load: 0.5,
        metadata: {},
      };

      teams.registerAgent(profile);

      const retrieved = teams.getAgent('agent-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
      expect(retrieved?.capabilities).toHaveLength(2);
    });

    it('should unregister an agent', () => {
      const profile: AgentProfile = {
        agentId: 'agent-1',
        name: 'Test Agent',
        capabilities: [],
        rolePreferences: [AgentRole.PRIMARY],
        available: true,
        load: 0,
        metadata: {},
      };

      teams.registerAgent(profile);

      const removed = teams.unregisterAgent('agent-1');
      expect(removed).toBe(true);

      const retrieved = teams.getAgent('agent-1');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Team Formation', () => {
    beforeEach(() => {
      // Register test agents
      const agents: AgentProfile[] = [
        {
          agentId: 'agent-1',
          name: 'Agent 1',
          capabilities: [
            { name: 'coding', description: 'Coding', score: 0.9, tags: [] },
          ],
          rolePreferences: [AgentRole.PRIMARY],
          available: true,
          load: 0.2,
          metadata: {},
        },
        {
          agentId: 'agent-2',
          name: 'Agent 2',
          capabilities: [
            { name: 'testing', description: 'Testing', score: 0.8, tags: [] },
          ],
          rolePreferences: [AgentRole.SUPPORT],
          available: true,
          load: 0.3,
          metadata: {},
        },
        {
          agentId: 'agent-3',
          name: 'Agent 3',
          capabilities: [
            { name: 'review', description: 'Review', score: 0.7, tags: [] },
          ],
          rolePreferences: [AgentRole.REVIEWER],
          available: true,
          load: 0.1,
          metadata: {},
        },
      ];

      for (const agent of agents) {
        teams.registerAgent(agent);
      }
    });

    it('should form a team with capability-based strategy', async () => {
      const request: TeamFormationRequest = {
        name: 'Test Team',
        requiredCapabilities: ['coding', 'testing'],
        requiredRoles: [AgentRole.PRIMARY, AgentRole.SUPPORT],
        teamSize: 2,
        strategy: 'capability_based',
        channels: ['main'],
      };

      const result = await teams.formTeam(request);

      expect(result.success).toBe(true);
      expect(result.team.name).toBe('Test Team');
      expect(result.team.roles.size).toBe(2);
      // Channels contain channel IDs, not names - check that channels were created
      expect(result.team.channels).toHaveLength(1);
      // Verify the channel exists and has the correct name
      const channelId = result.team.channels[0];
      const channel = teams.getChannel(channelId);
      expect(channel?.name).toBe('main');
    });

    it('should form a team with role-based strategy', async () => {
      const request: TeamFormationRequest = {
        name: 'Role Team',
        requiredCapabilities: [],
        requiredRoles: [AgentRole.PRIMARY, AgentRole.REVIEWER],
        teamSize: 2,
        strategy: 'role_based',
      };

      const result = await teams.formTeam(request);

      expect(result.success).toBe(true);
      expect(result.team.roles.size).toBe(2);
    });

    it('should form a team with load-balanced strategy', async () => {
      const request: TeamFormationRequest = {
        name: 'Load Balanced Team',
        requiredCapabilities: [],
        requiredRoles: [],
        teamSize: 2,
        strategy: 'load_balanced',
      };

      const result = await teams.formTeam(request);

      expect(result.success).toBe(true);
      expect(result.team.roles.size).toBe(2);
    });

    it('should fail to form team with insufficient agents', async () => {
      const request: TeamFormationRequest = {
        name: 'Big Team',
        requiredCapabilities: [],
        requiredRoles: [],
        teamSize: 10,
        strategy: 'random',
      };

      const result = await teams.formTeam(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('insufficient agents');
    });
  });

  describe('Communication Channels', () => {
    it('should create a channel', () => {
      const members = new Set(['agent-1', 'agent-2']);
      const channelId = teams.createChannel('test-channel', 'broadcast', members);

      const channel = teams.getChannel(channelId);
      expect(channel).toBeDefined();
      expect(channel?.name).toBe('test-channel');
      expect(channel?.type).toBe('broadcast');
      expect(channel?.members.size).toBe(2);
    });

    it('should send and receive messages', () => {
      const members = new Set(['agent-1', 'agent-2']);
      const channelId = teams.createChannel('test-channel', 'broadcast', members);

      teams.sendMessage(channelId, {
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        type: 'request',
        content: 'Hello',
        timestamp: new Date(),
        priority: 'normal',
      });

      const messages = teams.getChannelMessages(channelId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello');
    });
  });

  describe('Agent Availability and Load', () => {
    it('should update agent availability', () => {
      const profile: AgentProfile = {
        agentId: 'agent-1',
        name: 'Test Agent',
        capabilities: [],
        rolePreferences: [AgentRole.PRIMARY],
        available: true,
        load: 0,
        metadata: {},
      };

      teams.registerAgent(profile);

      teams.updateAgentAvailability('agent-1', false);

      const agent = teams.getAgent('agent-1');
      expect(agent?.available).toBe(false);
    });

    it('should update agent load', () => {
      const profile: AgentProfile = {
        agentId: 'agent-1',
        name: 'Test Agent',
        capabilities: [],
        rolePreferences: [AgentRole.PRIMARY],
        available: true,
        load: 0.2,
        metadata: {},
      };

      teams.registerAgent(profile);

      teams.updateAgentLoad('agent-1', 0.8);

      const agent = teams.getAgent('agent-1');
      expect(agent?.load).toBe(0.8);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const profile: AgentProfile = {
        agentId: 'agent-1',
        name: 'Test Agent',
        capabilities: [],
        rolePreferences: [AgentRole.PRIMARY],
        available: true,
        load: 0.5,
        metadata: {},
      };

      teams.registerAgent(profile);

      const stats = teams.getStatistics();

      expect(stats.totalAgents).toBe(1);
      expect(stats.availableAgents).toBe(1);
      expect(stats.avgAgentLoad).toBe(0.5);
    });
  });
});

describe('Hierarchy', () => {
  let hierarchy: Hierarchy;

  beforeEach(() => {
    hierarchy = initHierarchy();
  });

  afterEach(() => {
    hierarchy.clear();
  });

  describe('Hierarchy Registration', () => {
    it('should register a hierarchy', () => {
      const config: HierarchyConfig = {
        hierarchyId: 'hierarchy-1',
        supervisorId: 'supervisor-1',
        hierarchy: new Map([
          ['supervisor-1', ['agent-1', 'agent-2']],
          ['agent-1', ['agent-3', 'agent-4']],
        ]),
        delegationStrategy: DelegationStrategy.CAPABILITY_BASED,
        reportFrequencyMs: 5000,
        autoAssign: true,
        maxTasksPerAgent: 5,
      };

      hierarchy.registerHierarchy(config);

      const retrieved = hierarchy.getHierarchy('hierarchy-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.supervisorId).toBe('supervisor-1');
      expect(retrieved?.delegationStrategy).toBe(DelegationStrategy.CAPABILITY_BASED);
    });
  });

  describe('Task Delegation', () => {
    beforeEach(() => {
      const config: HierarchyConfig = {
        hierarchyId: 'hierarchy-1',
        supervisorId: 'supervisor-1',
        hierarchy: new Map([
          ['supervisor-1', ['agent-1', 'agent-2']],
        ]),
        delegationStrategy: DelegationStrategy.DIRECT,
        maxTasksPerAgent: 5,
      };

      hierarchy.registerHierarchy(config);

      // Register agent capabilities
      hierarchy.registerAgentCapabilities('agent-1', [
        { name: 'coding', score: 0.9 },
        { name: 'testing', score: 0.8 },
      ]);

      hierarchy.registerAgentCapabilities('agent-2', [
        { name: 'review', score: 0.9 },
        { name: 'documentation', score: 0.7 },
      ]);
    });

    it('should delegate task with direct strategy', async () => {
      const task: Task = {
        taskId: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: HierarchyTaskStatus.PENDING,
        priority: HierarchyTaskPriority.MEDIUM,
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      const request: TaskDelegationRequest = {
        task,
        targetAgentId: 'agent-1',
        strategy: DelegationStrategy.DIRECT,
      };

      const delegated = await hierarchy.delegateTask('hierarchy-1', request);

      expect(delegated.assignee).toBe('agent-1');
      expect(delegated.status).toBe(HierarchyTaskStatus.ASSIGNED);
      expect(delegated.assignedAt).toBeDefined();
    });

    it('should delegate task with capability-based strategy', async () => {
      const task: Task = {
        taskId: 'task-1',
        title: 'Coding Task',
        description: 'A coding task',
        status: HierarchyTaskStatus.PENDING,
        priority: HierarchyTaskPriority.HIGH,
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      const request: TaskDelegationRequest = {
        task,
        requiredCapabilities: ['coding'],
        strategy: DelegationStrategy.CAPABILITY_BASED,
      };

      const delegated = await hierarchy.delegateTask('hierarchy-1', request);

      expect(delegated.assignee).toBe('agent-1');
      expect(delegated.status).toBe(HierarchyTaskStatus.ASSIGNED);
    });

    it('should delegate task with load-based strategy', async () => {
      const task: Task = {
        taskId: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: HierarchyTaskStatus.PENDING,
        priority: HierarchyTaskPriority.MEDIUM,
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      const request: TaskDelegationRequest = {
        task,
        strategy: DelegationStrategy.LOAD_BASED,
      };

      const delegated = await hierarchy.delegateTask('hierarchy-1', request);

      expect(delegated.assignee).toBeDefined();
      expect(delegated.status).toBe(HierarchyTaskStatus.ASSIGNED);
    });

    it('should delegate task with round-robin strategy', async () => {
      const task1: Task = {
        taskId: 'task-1',
        title: 'Test Task 1',
        description: 'A test task',
        status: HierarchyTaskStatus.PENDING,
        priority: HierarchyTaskPriority.MEDIUM,
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      const task2: Task = {
        taskId: 'task-2',
        title: 'Test Task 2',
        description: 'A test task',
        status: HierarchyTaskStatus.PENDING,
        priority: HierarchyTaskPriority.MEDIUM,
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      const request1: TaskDelegationRequest = {
        task: task1,
        strategy: DelegationStrategy.ROUND_ROBIN,
      };

      const request2: TaskDelegationRequest = {
        task: task2,
        strategy: DelegationStrategy.ROUND_ROBIN,
      };

      const delegated1 = await hierarchy.delegateTask('hierarchy-1', request1);
      const delegated2 = await hierarchy.delegateTask('hierarchy-1', request2);

      expect(delegated1.assignee).toBeDefined();
      expect(delegated2.assignee).toBeDefined();
      expect(delegated1.assignee).not.toBe(delegated2.assignee);
    });
  });

  describe('Task Status Updates', () => {
    it('should update task to in progress', () => {
      const task: Task = {
        taskId: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: HierarchyTaskStatus.ASSIGNED,
        priority: HierarchyTaskPriority.MEDIUM,
        assignee: 'agent-1',
        assignedAt: new Date(),
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      hierarchy.tasks.set('task-1', task);

      hierarchy.updateTaskStatus('task-1', HierarchyTaskStatus.IN_PROGRESS);

      const updated = hierarchy.getTask('task-1');
      expect(updated?.status).toBe(HierarchyTaskStatus.IN_PROGRESS);
      expect(updated?.startedAt).toBeDefined();
    });

    it('should update task to completed', () => {
      const task: Task = {
        taskId: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: HierarchyTaskStatus.IN_PROGRESS,
        priority: HierarchyTaskPriority.MEDIUM,
        assignee: 'agent-1',
        assignedAt: new Date(),
        startedAt: new Date(),
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      hierarchy.tasks.set('task-1', task);

      hierarchy.updateTaskStatus('task-1', HierarchyTaskStatus.COMPLETED, { result: 'success' });

      const updated = hierarchy.getTask('task-1');
      expect(updated?.status).toBe(HierarchyTaskStatus.COMPLETED);
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.result).toEqual({ result: 'success' });
    });

    it('should update task to failed', () => {
      const task: Task = {
        taskId: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: HierarchyTaskStatus.IN_PROGRESS,
        priority: HierarchyTaskPriority.MEDIUM,
        assignee: 'agent-1',
        assignedAt: new Date(),
        startedAt: new Date(),
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      hierarchy.tasks.set('task-1', task);

      const error = new Error('Task failed');
      hierarchy.updateTaskStatus('task-1', HierarchyTaskStatus.FAILED, undefined, error);

      const updated = hierarchy.getTask('task-1');
      expect(updated?.status).toBe(HierarchyTaskStatus.FAILED);
      expect(updated?.error).toBe(error);
    });
  });

  describe('Hierarchy Navigation', () => {
    beforeEach(() => {
      const config: HierarchyConfig = {
        hierarchyId: 'hierarchy-1',
        supervisorId: 'supervisor-1',
        hierarchy: new Map([
          ['supervisor-1', ['agent-1', 'agent-2']],
          ['agent-1', ['agent-3', 'agent-4']],
          ['agent-2', ['agent-5']],
        ]),
        delegationStrategy: DelegationStrategy.DIRECT,
      };

      hierarchy.registerHierarchy(config);
    });

    it('should get children of an agent', () => {
      const children = hierarchy.getChildren('hierarchy-1', 'supervisor-1');
      expect(children).toEqual(['agent-1', 'agent-2']);
    });

    it('should get parent of an agent', () => {
      const parent = hierarchy.getParent('hierarchy-1', 'agent-1');
      expect(parent).toBe('supervisor-1');
    });

    it('should get subtree of an agent', () => {
      const subtree = hierarchy.getSubtree('hierarchy-1', 'agent-1');
      expect(subtree).toEqual(['agent-3', 'agent-4']);
    });
  });

  describe('Reports', () => {
    it('should submit and retrieve reports', () => {
      const report = {
        reportId: 'report-1',
        reporterId: 'agent-1',
        recipientId: 'supervisor-1',
        type: 'status' as const,
        content: { status: 'working' },
        taskId: 'task-1',
        timestamp: new Date(),
        metadata: {},
      };

      hierarchy.submitReport(report);

      const reports = hierarchy.getReports('supervisor-1');
      expect(reports).toHaveLength(1);
      expect(reports[0].reportId).toBe('report-1');
    });

    it('should filter reports by type', () => {
      const report1 = {
        reportId: 'report-1',
        reporterId: 'agent-1',
        recipientId: 'supervisor-1',
        type: 'status' as const,
        content: { status: 'working' },
        timestamp: new Date(),
        metadata: {},
      };

      const report2 = {
        reportId: 'report-2',
        reporterId: 'agent-2',
        recipientId: 'supervisor-1',
        type: 'error' as const,
        content: { error: 'failed' },
        timestamp: new Date(),
        metadata: {},
      };

      hierarchy.submitReport(report1);
      hierarchy.submitReport(report2);

      const errorReports = hierarchy.getReports('supervisor-1', { type: 'error' });
      expect(errorReports).toHaveLength(1);
      expect(errorReports[0].type).toBe('error');
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const config: HierarchyConfig = {
        hierarchyId: 'hierarchy-1',
        supervisorId: 'supervisor-1',
        hierarchy: new Map([['supervisor-1', ['agent-1']]]),
        delegationStrategy: DelegationStrategy.DIRECT,
      };

      hierarchy.registerHierarchy(config);

      const task: Task = {
        taskId: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: HierarchyTaskStatus.COMPLETED,
        priority: HierarchyTaskPriority.MEDIUM,
        assignee: 'agent-1',
        assignedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        dependencies: [],
        metadata: {},
      };

      hierarchy.tasks.set('task-1', task);

      const stats = hierarchy.getStatistics();

      expect(stats.totalHierarchies).toBe(1);
      expect(stats.totalTasks).toBe(1);
      expect(stats.tasksByStatus[HierarchyTaskStatus.COMPLETED]).toBe(1);
    });
  });
});
