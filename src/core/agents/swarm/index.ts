/**
 * Swarm Orchestration System
 * Source: /auto hooks/swarm-orchestrator.sh
 *
 * Implements distributed agent swarms for parallel task execution
 * Based on: ax-llm dependency analysis, kubernetes conflict detection
 */

import { TaskDecomposer, type DecomposedTask } from './Decomposer';
import { AgentSpawner, type SpawnInstructions } from './Spawner';
import {
  SwarmCoordinator,
  type SwarmState,
  type AgentResult
} from './Coordinator';
import { ResultMerger, type MergedResult } from './Merger';
import { GitIntegration, type IntegrationSummary } from './GitIntegration';

export { DecomposedTask, SpawnInstructions, SwarmState, AgentResult, MergedResult, IntegrationSummary };

/**
 * Main Swarm Orchestrator
 */
export class SwarmOrchestrator {
  private decomposer: TaskDecomposer;
  private spawner: AgentSpawner;
  private coordinator: SwarmCoordinator;
  private merger: ResultMerger;
  private gitIntegration: GitIntegration;

  constructor(maxAgents: number = 10) {
    this.decomposer = new TaskDecomposer();
    this.spawner = new AgentSpawner(maxAgents);
    this.coordinator = new SwarmCoordinator();
    this.merger = new ResultMerger();
    this.gitIntegration = new GitIntegration();
  }

  /**
   * Spawn swarm for parallel task execution
   */
  async spawnSwarm(
    task: string,
    agentCount: number,
    workDir: string,
    mcpAvailable = { github: false, chrome: false }
  ): Promise<{ swarmId: string; instructions: SpawnInstructions; state: SwarmState }> {
    // Validate request
    const validation = this.spawner.validate(agentCount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate swarm ID
    const swarmId = `swarm_${Date.now()}`;

    // Decompose task
    const decomposed = this.decomposer.decompose(task, agentCount);

    // Generate spawn instructions
    const instructions = this.spawner.generateSpawnInstructions(
      swarmId,
      task,
      decomposed.subtasks,
      workDir,
      mcpAvailable
    );

    // Initialize swarm state
    const state = this.coordinator.initializeSwarm(
      swarmId,
      task,
      agentCount,
      workDir
    );

    return {
      swarmId,
      instructions,
      state
    };
  }

  /**
   * Update agent status
   */
  updateAgentStatus(
    swarmId: string,
    agentId: number,
    status: 'pending' | 'running' | 'success' | 'failed',
    taskId?: string
  ): void {
    this.coordinator.updateAgentStatus(swarmId, agentId, status, taskId);
  }

  /**
   * Add agent result
   */
  addAgentResult(swarmId: string, result: AgentResult): void {
    this.coordinator.addAgentResult(swarmId, result);
  }

  /**
   * Collect results from all agents
   */
  async collectResults(swarmId: string): Promise<{
    merged: MergedResult;
    integration?: IntegrationSummary;
    report: string;
  }> {
    const state = this.coordinator.getSwarmState(swarmId);
    if (!state) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    if (!this.coordinator.isComplete(swarmId)) {
      throw new Error(`Swarm ${swarmId} is not complete yet`);
    }

    // Merge agent results
    const merged = this.merger.mergeResults(swarmId, state.task, state.results);

    // Integrate code changes (if applicable)
    let integration: IntegrationSummary | undefined;
    try {
      integration = await this.gitIntegration.integrateChanges(
        swarmId,
        state.agentCount,
        state.workDir
      );
    } catch (error) {
      console.warn('Git integration failed:', error);
    }

    // Generate comprehensive report
    const report = this.generateComprehensiveReport(merged, integration);

    return {
      merged,
      integration,
      report
    };
  }

  /**
   * Get swarm state
   */
  getSwarmState(swarmId: string): SwarmState | undefined {
    return this.coordinator.getSwarmState(swarmId);
  }

  /**
   * Check if swarm is complete
   */
  isComplete(swarmId: string): boolean {
    return this.coordinator.isComplete(swarmId);
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
    return this.coordinator.getCompletionStatus(swarmId);
  }

  /**
   * Clear swarm state
   */
  clearSwarm(swarmId: string): void {
    this.coordinator.clearSwarm(swarmId);
  }

  /**
   * Generate comprehensive report
   */
  private generateComprehensiveReport(
    merged: MergedResult,
    integration?: IntegrationSummary
  ): string {
    let report = this.merger.generateReport(merged);

    if (integration) {
      report += '\n---\n\n';
      report += '# Code Integration\n\n';
      report += integration.report;
    }

    return report;
  }
}
