/**
 * Agent Orchestration Bridge
 *
 * Integrates Phase 3 features with multi-agent orchestration:
 * - Connects TypeScript SwarmOrchestrator with bash multi-agent-orchestrator.sh
 * - Provides intelligent agent routing based on task analysis
 * - Integrates Phase 3 capabilities: vision, debug orchestrator, quality judge, safety
 * - Coordinates specialist agents (code_writer, test_engineer, security_auditor, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { SwarmOrchestrator } from './swarm';
import { DebugOrchestrator } from '../debug/orchestrator';
import { QualityJudge } from '../quality/judge';
import { ConstitutionalAI } from '../safety/constitutional';
import { BoundedAutonomy } from '../safety/bounded-autonomy';
import { ZeroDriftCapture } from '../vision/ZeroDriftCapture';

const execAsync = promisify(exec);

/**
 * Specialist agent types from multi-agent-orchestrator.sh
 */
export type SpecialistAgent =
  | 'code_writer'
  | 'test_engineer'
  | 'security_auditor'
  | 'performance_optimizer'
  | 'documentation_writer'
  | 'debugger';

/**
 * Agent routing decision
 */
export interface AgentRoutingDecision {
  selectedAgent: SpecialistAgent;
  agentInfo: {
    expertise: string[];
    description: string;
    priorityFor: string[];
  };
  routingConfidence: number;
  reasoning: string;
}

/**
 * Multi-agent orchestration workflow phase
 */
export interface OrchestrationPhase {
  phase: string;
  agents: SpecialistAgent[];
  action: string;
  parallel?: boolean;
  conditional?: string;
}

/**
 * Task analysis for agent selection
 */
export interface TaskAnalysis {
  taskType: string;
  complexity: 'low' | 'medium' | 'high';
  requiresVision: boolean;
  requiresDebug: boolean;
  requiresSecurity: boolean;
  requiresQuality: boolean;
  suggestedAgents: SpecialistAgent[];
  parallelizable: boolean;
}

/**
 * Agent orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  routing?: AgentRoutingDecision;
  workflow?: OrchestrationPhase[];
  swarmResult?: {
    merged: any;
    integration?: any;
    report: string;
  };
  errors: string[];
}

/**
 * Agent Orchestration Bridge
 *
 * Central coordinator for multi-agent systems with Phase 3 feature integration
 */
export class AgentOrchestrationBridge {
  private swarmOrchestrator: SwarmOrchestrator;
  private debugOrchestrator: DebugOrchestrator;
  private qualityJudge: QualityJudge;
  private constitutionalAI: ConstitutionalAI;
  private boundedAutonomy: BoundedAutonomy;
  private visionCapture?: ZeroDriftCapture;

  constructor(
    maxSwarmAgents: number = 10,
    options: {
      enableVision?: boolean;
      visionOptions?: any;
      debugConfig?: any;
    } = {}
  ) {
    this.swarmOrchestrator = new SwarmOrchestrator(maxSwarmAgents);
    this.debugOrchestrator = new DebugOrchestrator(options.debugConfig || {
      testSnapshotsDir: '.debug-snapshots',
      maxSnapshots: 10
    });
    this.qualityJudge = new QualityJudge();
    this.constitutionalAI = new ConstitutionalAI();
    this.boundedAutonomy = new BoundedAutonomy();

    if (options.enableVision) {
      this.visionCapture = new ZeroDriftCapture();
    }
  }

  /**
   * Analyze task and determine orchestration strategy
   */
  async analyzeTask(task: string, context: string = ''): Promise<TaskAnalysis> {
    const taskLower = task.toLowerCase();
    const contextLower = context.toLowerCase();

    // Detect task type
    let taskType = 'general';
    if (/screenshot.*code|ui.*code|design.*code|convert.*screenshot/.test(taskLower)) taskType = 'screenshot-to-code';
    else if (/implement|build|create|add/.test(taskLower)) taskType = 'implementation';
    else if (/test|validate|check/.test(taskLower)) taskType = 'testing';
    else if (/refactor|reorganize|restructure/.test(taskLower)) taskType = 'refactoring';
    else if (/fix|debug|bug|error/.test(taskLower)) taskType = 'debugging';
    else if (/security|audit|vulnerability/.test(taskLower)) taskType = 'security';
    else if (/optimize|performance|speed/.test(taskLower)) taskType = 'optimization';
    else if (/document|explain|guide/.test(taskLower)) taskType = 'documentation';

    // Determine complexity (check low first to avoid false positives)
    const complexityIndicators = {
      high: /comprehensive|entire|all.*module|multiple.*system|across.*service|system-wide/,
      medium: /moderate|some|several|few/,
      low: /simple|basic|quick|small|single/
    };

    let complexity: 'low' | 'medium' | 'high' = 'medium';
    if (complexityIndicators.low.test(taskLower + contextLower)) complexity = 'low';
    else if (complexityIndicators.high.test(taskLower + contextLower)) complexity = 'high';

    // Check Phase 3 capability requirements
    const requiresVision = /ui|interface|visual|screenshot|page|browser/.test(taskLower);
    const requiresDebug = /fix|bug|error|failing|broken/.test(taskLower);
    const requiresSecurity = /security|vulnerability|exploit|audit/.test(taskLower);
    const requiresQuality = /quality|test|validate|verify/.test(taskLower);

    // Suggest agents based on task type
    const agentMap: Record<string, SpecialistAgent[]> = {
      'screenshot-to-code': ['code_writer'], // ScreenshotToCodeOrchestrator handles internally
      implementation: ['code_writer'],
      testing: ['test_engineer'],
      refactoring: ['code_writer', 'performance_optimizer'],
      debugging: ['debugger', 'test_engineer'],
      security: ['security_auditor'],
      optimization: ['performance_optimizer'],
      documentation: ['documentation_writer'],
      general: ['code_writer']
    };

    const suggestedAgents = agentMap[taskType] || ['code_writer'];

    // Check if task is parallelizable (3+ independent subtasks)
    const parallelizable = complexity === 'high' &&
      (taskType === 'implementation' || taskType === 'testing');

    return {
      taskType,
      complexity,
      requiresVision,
      requiresDebug,
      requiresSecurity,
      requiresQuality,
      suggestedAgents,
      parallelizable
    };
  }

  /**
   * Route task to appropriate specialist agent (bash hook integration)
   */
  async routeTask(task: string): Promise<AgentRoutingDecision> {
    try {
      const { stdout } = await execAsync(
        `~/.claude/hooks/multi-agent-orchestrator.sh route "${task.replace(/"/g, '\\"')}"`
      );

      const result = JSON.parse(stdout);

      return {
        selectedAgent: result.selected_agent,
        agentInfo: result.agent_info,
        routingConfidence: result.routing_confidence,
        reasoning: `Routed to ${result.selected_agent} based on expertise match`
      };
    } catch (error) {
      // Fallback to local routing
      const analysis = await this.analyzeTask(task);
      return {
        selectedAgent: analysis.suggestedAgents[0],
        agentInfo: {
          expertise: [analysis.taskType],
          description: `Fallback routing to ${analysis.suggestedAgents[0]}`,
          priorityFor: [analysis.taskType]
        },
        routingConfidence: 50,
        reasoning: 'Bash hook unavailable, using local analysis'
      };
    }
  }

  /**
   * Orchestrate multi-agent workflow (bash hook integration)
   */
  async orchestrateWorkflow(
    task: string,
    requireAll: boolean = false
  ): Promise<OrchestrationPhase[]> {
    try {
      const { stdout } = await execAsync(
        `~/.claude/hooks/multi-agent-orchestrator.sh orchestrate "${task.replace(/"/g, '\\"')}" "${requireAll}"`
      );

      const result = JSON.parse(stdout);
      return result.workflow || [];
    } catch (error) {
      // Fallback to standard workflow
      return [
        {
          phase: 'planning',
          agents: ['code_writer'],
          action: 'Break down task into subtasks'
        },
        {
          phase: 'implementation',
          agents: ['code_writer', 'debugger'],
          action: 'Implement solution with error handling'
        },
        {
          phase: 'validation',
          agents: ['test_engineer', 'security_auditor'],
          action: 'Run tests and security checks in parallel',
          parallel: true
        },
        {
          phase: 'documentation',
          agents: ['documentation_writer'],
          action: 'Document completed feature'
        }
      ];
    }
  }

  /**
   * Execute task with full orchestration and Phase 3 integration
   */
  async executeWithOrchestration(
    task: string,
    workDir: string,
    options: {
      context?: string;
      useSwarm?: boolean;
      agentCount?: number;
      enableDebug?: boolean;
      enableQuality?: boolean;
      enableSafety?: boolean;
    } = {}
  ): Promise<OrchestrationResult> {
    const errors: string[] = [];

    try {
      // Step 1: Analyze task
      const analysis = await this.analyzeTask(task, options.context || '');

      // Step 2: Safety check (bounded autonomy)
      if (options.enableSafety !== false) {
        const safetyCheck = await this.boundedAutonomy.checkAction(task, options.context || '');
        if (!safetyCheck.allowed) {
          return {
            success: false,
            errors: [`Safety check failed: ${safetyCheck.reason}`]
          };
        }
      }

      // Step 3: Route to specialist or spawn swarm
      if (options.useSwarm || (analysis.parallelizable && options.useSwarm !== false)) {
        // Use swarm orchestration for parallel execution
        const agentCount = options.agentCount || Math.min(analysis.suggestedAgents.length + 2, 10);

        const swarmResult = await this.swarmOrchestrator.spawnSwarm(
          task,
          agentCount,
          workDir,
          { github: true, chrome: analysis.requiresVision }
        );

        // Wait for completion (in practice, this would be async polling)
        // For now, return the spawn result
        return {
          success: true,
          swarmResult: {
            merged: swarmResult.state,
            report: `Swarm ${swarmResult.swarmId} spawned with ${agentCount} agents`
          },
          errors: []
        };
      } else {
        // Use specialist routing
        const routing = await this.routeTask(task);
        const workflow = await this.orchestrateWorkflow(task);

        return {
          success: true,
          routing,
          workflow,
          errors: []
        };
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        errors
      };
    }
  }

  /**
   * Integrate Phase 3 capabilities into agent execution
   */
  async enhanceAgentWithPhase3(
    agentType: SpecialistAgent,
    task: string,
    _context: string
  ): Promise<{
    debugSupport?: any;
    qualityChecks?: any;
    safetyValidation?: any;
    visionData?: any;
  }> {
    const enhancements: any = {};

    // Add debug orchestrator support for debugger agent
    if (agentType === 'debugger') {
      enhancements.debugSupport = {
        smartDebug: await this.debugOrchestrator.smartDebug.bind(this.debugOrchestrator),
        verifyFix: await this.debugOrchestrator.verifyFix.bind(this.debugOrchestrator)
      };
    }

    // Add quality judge for test engineer
    if (agentType === 'test_engineer') {
      enhancements.qualityChecks = {
        evaluate: await this.qualityJudge.evaluate.bind(this.qualityJudge)
      };
    }

    // Add constitutional AI for security auditor
    if (agentType === 'security_auditor') {
      enhancements.safetyValidation = {
        critique: await this.constitutionalAI.critique.bind(this.constitutionalAI),
        revise: await this.constitutionalAI.revise.bind(this.constitutionalAI)
      };
    }

    // Add vision capture for UI-related tasks
    if (this.visionCapture && /ui|interface|visual/.test(task.toLowerCase())) {
      enhancements.visionData = {
        capture: await this.visionCapture.capture.bind(this.visionCapture)
      };
    }

    return enhancements;
  }

  /**
   * Get orchestrator instances for direct access
   */
  getOrchestrators() {
    return {
      swarm: this.swarmOrchestrator,
      debug: this.debugOrchestrator,
      quality: this.qualityJudge,
      constitutional: this.constitutionalAI,
      boundedAutonomy: this.boundedAutonomy,
      vision: this.visionCapture
    };
  }
}

/**
 * Create default agent orchestration bridge
 */
export function createAgentOrchestrationBridge(
  maxSwarmAgents: number = 10,
  options: {
    enableVision?: boolean;
    visionOptions?: any;
  } = {}
): AgentOrchestrationBridge {
  return new AgentOrchestrationBridge(maxSwarmAgents, options);
}
