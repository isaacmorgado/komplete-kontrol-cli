/**
 * Swarm Coordinator
 * Source: /auto hooks/swarm-orchestrator.sh
 *
 * Coordinates multiple agents executing tasks in parallel
 */

import type { AgentConfig } from './Spawner';

export interface SwarmState {
  swarmId: string;
  task: string;
  agentCount: number;
  status: 'pending' | 'active' | 'complete' | 'failed';
  startedAt: string;
  completedAt?: string;
  workDir: string;
  agents: AgentState[];
  results: AgentResult[];
}

export interface AgentState {
  agentId: number;
  status: 'pending' | 'running' | 'success' | 'failed';
  taskId?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentResult {
  agentId: number;
  status: 'success' | 'failed';
  summary: string;
  details: string;
  filesModified: string[];
  errors?: string[];
}

/**
 * Coordinator for swarm execution
 */
export class SwarmCoordinator {
  private swarms: Map<string, SwarmState> = new Map();

  /**
   * Initialize swarm execution
   */
  initializeSwarm(
    swarmId: string,
    task: string,
    agentCount: number,
    workDir: string
  ): SwarmState {
    const agents: AgentState[] = Array.from({ length: agentCount }, (_, i) => ({
      agentId: i + 1,
      status: 'pending'
    }));

    const state: SwarmState = {
      swarmId,
      task,
      agentCount,
      status: 'active',
      startedAt: new Date().toISOString(),
      workDir,
      agents,
      results: []
    };

    this.swarms.set(swarmId, state);
    return state;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(
    swarmId: string,
    agentId: number,
    status: AgentState['status'],
    taskId?: string
  ): void {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return;

    const agent = swarm.agents.find(a => a.agentId === agentId);
    if (!agent) return;

    agent.status = status;
    if (taskId) agent.taskId = taskId;

    if (status === 'running' && !agent.startedAt) {
      agent.startedAt = new Date().toISOString();
    } else if ((status === 'success' || status === 'failed') && !agent.completedAt) {
      agent.completedAt = new Date().toISOString();
    }

    // Update swarm status
    this.updateSwarmStatus(swarmId);
  }

  /**
   * Add agent result
   */
  addAgentResult(swarmId: string, result: AgentResult): void {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return;

    swarm.results.push(result);
    this.updateAgentStatus(swarmId, result.agentId, result.status);
  }

  /**
   * Update overall swarm status
   */
  private updateSwarmStatus(swarmId: string): void {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return;

    const allComplete = swarm.agents.every(
      a => a.status === 'success' || a.status === 'failed'
    );

    const anyFailed = swarm.agents.some(a => a.status === 'failed');

    if (allComplete) {
      swarm.status = anyFailed ? 'failed' : 'complete';
      swarm.completedAt = new Date().toISOString();
    }
  }

  /**
   * Get swarm state
   */
  getSwarmState(swarmId: string): SwarmState | undefined {
    return this.swarms.get(swarmId);
  }

  /**
   * Check if swarm is complete
   */
  isComplete(swarmId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    return swarm?.status === 'complete' || swarm?.status === 'failed';
  }

  /**
   * Get completion status
   */
  getCompletionStatus(swarmId: string): {
    complete: boolean;
    success: number;
    failed: number;
    pending: number;
  } {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      return { complete: false, success: 0, failed: 0, pending: 0 };
    }

    const success = swarm.agents.filter(a => a.status === 'success').length;
    const failed = swarm.agents.filter(a => a.status === 'failed').length;
    const pending = swarm.agents.filter(a => a.status === 'pending' || a.status === 'running')
      .length;

    return {
      complete: pending === 0,
      success,
      failed,
      pending
    };
  }

  /**
   * Clear swarm state
   */
  clearSwarm(swarmId: string): void {
    this.swarms.delete(swarmId);
  }
}
