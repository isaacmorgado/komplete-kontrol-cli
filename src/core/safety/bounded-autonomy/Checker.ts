/**
 * Autonomy Boundary Checker
 * Source: /auto hooks/bounded-autonomy.sh
 *
 * Validates actions against autonomy boundaries
 */

import {
  getAutonomyRules,
  isProhibited,
  requiresApproval,
  isAutoAllowed,
  type ActionLimits
} from './Prohibitions';

export enum ActionStatus {
  Allowed = 'allowed',
  RequiresApproval = 'requires_approval',
  Prohibited = 'prohibited'
}

export interface ActionCheckResult {
  allowed: boolean;
  status: ActionStatus;
  reason: string;
  requiresEscalation: boolean;
  limits?: ActionLimits;
}

/**
 * Checker for action boundaries
 */
export class BoundaryChecker {
  private rules = getAutonomyRules();

  /**
   * Check if an action is within autonomy boundaries
   */
  check(action: string, _context?: string): ActionCheckResult {
    // Check if prohibited
    if (isProhibited(action)) {
      return {
        allowed: false,
        status: ActionStatus.Prohibited,
        reason: 'prohibited_action',
        requiresEscalation: false // Prohibited means never allowed
      };
    }

    // Check if requires approval
    if (requiresApproval(action)) {
      return {
        allowed: false,
        status: ActionStatus.RequiresApproval,
        reason: 'requires_approval',
        requiresEscalation: true
      };
    }

    // Check if auto-allowed
    if (isAutoAllowed(action)) {
      return {
        allowed: true,
        status: ActionStatus.Allowed,
        reason: 'auto_allowed',
        requiresEscalation: false,
        limits: this.rules.autoAllowed.limits
      };
    }

    // Default: require approval for unknown actions
    return {
      allowed: false,
      status: ActionStatus.RequiresApproval,
      reason: 'unknown_action_requires_approval',
      requiresEscalation: true
    };
  }

  /**
   * Check if escalation trigger is met
   */
  shouldEscalate(context: {
    confidence?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    failureCount?: number;
    hasAmbiguity?: boolean;
    hasSecurityImplications?: boolean;
  }): { shouldEscalate: boolean; triggers: string[] } {
    const triggers: string[] = [];

    // Check confidence
    if (context.confidence !== undefined && context.confidence < 0.7) {
      triggers.push('Confidence < 70%');
    }

    // Check risk level
    if (context.riskLevel === 'high') {
      triggers.push('High risk operation');
    }

    // Check failure count
    if (context.failureCount !== undefined && context.failureCount > 2) {
      triggers.push('Multiple failures (> 2)');
    }

    // Check ambiguity
    if (context.hasAmbiguity) {
      triggers.push('Ambiguous requirements');
    }

    // Check security
    if (context.hasSecurityImplications) {
      triggers.push('Security implications');
    }

    return {
      shouldEscalate: triggers.length > 0,
      triggers
    };
  }

  /**
   * Validate action against limits
   */
  validateLimits(changes: {
    fileChanges?: number;
    linesPerFile?: number;
    newFiles?: number;
    deletions?: number;
  }): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    const limits = this.rules.autoAllowed.limits;

    if (changes.fileChanges && changes.fileChanges > limits.maxFileChanges) {
      violations.push(
        `File changes (${changes.fileChanges}) exceeds limit (${limits.maxFileChanges})`
      );
    }

    if (changes.linesPerFile && changes.linesPerFile > limits.maxLinesPerFile) {
      violations.push(
        `Lines per file (${changes.linesPerFile}) exceeds limit (${limits.maxLinesPerFile})`
      );
    }

    if (changes.newFiles && changes.newFiles > limits.maxNewFiles) {
      violations.push(`New files (${changes.newFiles}) exceeds limit (${limits.maxNewFiles})`);
    }

    if (changes.deletions && changes.deletions > limits.maxDeletions) {
      violations.push(
        `Deletions (${changes.deletions}) exceeds limit (${limits.maxDeletions})`
      );
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}
