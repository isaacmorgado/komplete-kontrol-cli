/**
 * Bounded Autonomy System
 * Source: /auto hooks/bounded-autonomy.sh
 *
 * Implements safety guardrails and escalation paths for autonomous operation
 * Based on: Deloitte bounded autonomy patterns, enterprise AI governance
 */

import { BoundaryChecker, ActionCheckResult, ActionStatus } from './Checker';
import { Escalator, EscalationRequest, EscalationDecision } from './Escalator';
import { ApprovalTracker, ApprovalRecord } from './Approvals';
import { getAutonomyRules, type AutonomyRules } from './Prohibitions';

export { ActionStatus, EscalationDecision };
export type { ActionCheckResult, EscalationRequest, ApprovalRecord, AutonomyRules };

/**
 * Main Bounded Autonomy coordinator
 */
export class BoundedAutonomy {
  private checker: BoundaryChecker;
  private escalator: Escalator;
  private approvals: ApprovalTracker;

  constructor() {
    this.checker = new BoundaryChecker();
    this.escalator = new Escalator();
    this.approvals = new ApprovalTracker();
  }

  /**
   * Check if action is allowed
   */
  async checkAction(action: string, context?: string): Promise<ActionCheckResult> {
    // Check if previously approved
    if (this.approvals.isApproved(action)) {
      return {
        allowed: true,
        status: ActionStatus.Allowed,
        reason: 'previously_approved',
        requiresEscalation: false
      };
    }

    // Check against boundaries
    return this.checker.check(action, context);
  }

  /**
   * Request escalation for action requiring approval
   */
  async requestApproval(
    action: string,
    reason: string,
    context: string
  ): Promise<EscalationRequest> {
    return this.escalator.generateEscalation(action, reason, context);
  }

  /**
   * Process user decision on escalation
   */
  async processDecision(
    action: string,
    decision: EscalationDecision,
    context: string,
    modifiedAction?: string
  ): Promise<{ approved: boolean; action: string }> {
    switch (decision) {
      case EscalationDecision.Approve:
        this.approvals.recordApproval(action, 'approve', context);
        return { approved: true, action };

      case EscalationDecision.Modify:
        if (modifiedAction) {
          this.approvals.recordModifiedApproval(action, modifiedAction, context);
          return { approved: true, action: modifiedAction };
        }
        return { approved: false, action };

      case EscalationDecision.Reject:
        this.approvals.recordApproval(action, 'reject', context);
        return { approved: false, action };

      default:
        return { approved: false, action };
    }
  }

  /**
   * Validate action against limits
   */
  async validateLimits(changes: {
    fileChanges?: number;
    linesPerFile?: number;
    newFiles?: number;
    deletions?: number;
  }): Promise<{ valid: boolean; violations: string[]; escalation?: EscalationRequest }> {
    const result = this.checker.validateLimits(changes);

    if (!result.valid) {
      const escalation = this.escalator.generateLimitEscalation(result.violations);
      return {
        ...result,
        escalation
      };
    }

    return result;
  }

  /**
   * Check if escalation should occur based on context
   */
  async shouldEscalate(context: {
    confidence?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    failureCount?: number;
    hasAmbiguity?: boolean;
    hasSecurityImplications?: boolean;
  }): Promise<{ shouldEscalate: boolean; triggers: string[]; escalation?: EscalationRequest }> {
    const result = this.checker.shouldEscalate(context);

    if (result.shouldEscalate) {
      const action = 'Current operation';
      const reason = result.triggers.join(', ');
      const contextStr = JSON.stringify(context, null, 2);
      const escalation = this.escalator.generateEscalation(action, reason, contextStr);

      return {
        ...result,
        escalation
      };
    }

    return result;
  }

  /**
   * Get autonomy rules
   */
  getRules(): AutonomyRules {
    return getAutonomyRules();
  }

  /**
   * Get approval statistics
   */
  getApprovalStats(): {
    total: number;
    approved: number;
    modified: number;
    rejected: number;
  } {
    return this.approvals.getStats();
  }

  /**
   * Clear all approvals (useful for session reset)
   */
  clearApprovals(): void {
    this.approvals.clearAll();
  }

  /**
   * Clear expired approvals
   */
  clearExpiredApprovals(): number {
    return this.approvals.clearExpired();
  }

  /**
   * Get all active approvals
   */
  getActiveApprovals(): ApprovalRecord[] {
    return this.approvals.getAllApprovals();
  }
}
