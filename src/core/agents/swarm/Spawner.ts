/**
 * Agent Spawner for Swarm Orchestration
 * Source: /auto hooks/swarm-orchestrator.sh
 *
 * Spawns multiple agents via Task tool for parallel execution
 */

import type { SubTask } from './Decomposer';

export interface AgentConfig {
  agentId: number;
  subtask: string;
  phase: string;
  dependencies: number[];
  agentType: string;
  prompt: string;
}

export interface SpawnInstructions {
  swarmId: string;
  task: string;
  agentCount: number;
  workDir: string;
  parallelAgents: AgentConfig[];
  sequentialAgents: AgentConfig[];
  mcpAvailable: {
    github: boolean;
    chrome: boolean;
  };
}

/**
 * Agent spawner for distributed execution
 */
export class AgentSpawner {
  private maxAgents: number;

  constructor(maxAgents: number = 10) {
    this.maxAgents = maxAgents;
  }

  /**
   * Generate spawn instructions for agents
   */
  generateSpawnInstructions(
    swarmId: string,
    task: string,
    subtasks: SubTask[],
    workDir: string,
    mcpAvailable = { github: false, chrome: false }
  ): SpawnInstructions {
    const agentConfigs = subtasks.map(subtask => this.createAgentConfig(subtask, workDir));

    // Separate parallel and sequential agents based on dependencies
    const parallelAgents = agentConfigs.filter(
      agent => agent.dependencies.length === 0
    );
    const sequentialAgents = agentConfigs.filter(
      agent => agent.dependencies.length > 0
    );

    return {
      swarmId,
      task,
      agentCount: subtasks.length,
      workDir,
      parallelAgents,
      sequentialAgents,
      mcpAvailable
    };
  }

  /**
   * Create agent configuration from subtask
   */
  private createAgentConfig(subtask: SubTask, workDir: string): AgentConfig {
    const agentType = this.mapPhaseToAgentType(subtask.phase);
    const prompt = this.generateAgentPrompt(subtask, workDir);

    return {
      agentId: subtask.agentId,
      subtask: subtask.subtask,
      phase: subtask.phase,
      dependencies: subtask.dependencies,
      agentType,
      prompt
    };
  }

  /**
   * Map phase to appropriate agent type
   */
  private mapPhaseToAgentType(phase: string): string {
    switch (phase) {
      case 'design':
      case 'research':
        return 'Explore';
      case 'test':
        return 'qa-explorer';
      case 'implement':
      case 'implement_backend':
      case 'implement_frontend':
      case 'refactor':
        return 'general-purpose';
      case 'integrate':
        return 'validator';
      default:
        return 'general-purpose';
    }
  }

  /**
   * Generate prompt for agent
   */
  private generateAgentPrompt(subtask: SubTask, workDir: string): string {
    return `You are Swarm Agent ${subtask.agentId}.

## Your Task
${subtask.subtask}

## Working Directory
${workDir}

## Output Requirements
When complete, write your results to: result-agent-${subtask.agentId}.json

Format:
{
  "agent_id": ${subtask.agentId},
  "status": "success" or "failed",
  "summary": "Brief summary",
  "details": "Detailed results",
  "files_modified": []
}

Focus ONLY on your assigned task. Be thorough and efficient.`;
  }

  /**
   * Validate spawn request
   */
  validate(agentCount: number): { valid: boolean; error?: string } {
    if (agentCount > this.maxAgents) {
      return {
        valid: false,
        error: `Max ${this.maxAgents} agents allowed, requested ${agentCount}`
      };
    }

    if (agentCount < 2) {
      return {
        valid: false,
        error: 'Swarm requires at least 2 agents'
      };
    }

    return { valid: true };
  }
}
