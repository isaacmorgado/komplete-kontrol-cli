/**
 * Autonomy Escalation Handler
 * Source: /auto hooks/bounded-autonomy.sh
 *
 * Generates escalation messages for actions requiring approval
 */

export interface EscalationRequest {
  action: string;
  reason: string;
  context: string;
  message: string;
  timestamp: string;
  options: EscalationOption[];
}

export interface EscalationOption {
  id: string;
  label: string;
  description: string;
}

export enum EscalationDecision {
  Approve = 'approve',
  Modify = 'modify',
  Reject = 'reject'
}

/**
 * Escalation generator for bounded autonomy
 */
export class Escalator {
  /**
   * Generate escalation request for user approval
   */
  generateEscalation(action: string, reason: string, context: string): EscalationRequest {
    return {
      action,
      reason,
      context,
      message: this.formatEscalationMessage(action, reason, context),
      timestamp: new Date().toISOString(),
      options: this.getEscalationOptions()
    };
  }

  /**
   * Format escalation message for display
   */
  private formatEscalationMessage(action: string, reason: string, context: string): string {
    return `🛑 ESCALATION REQUIRED

**Action:** ${action}
**Reason:** ${reason}
**Context:** ${context}

This action requires your approval before I can proceed.

**Options:**
1. Approve - I'll proceed with this action
2. Modify - Suggest changes to the approach
3. Reject - I'll try a different approach

Please respond with your decision.`;
  }

  /**
   * Get standard escalation options
   */
  private getEscalationOptions(): EscalationOption[] {
    return [
      {
        id: EscalationDecision.Approve,
        label: 'Approve',
        description: "Proceed with the action as described"
      },
      {
        id: EscalationDecision.Modify,
        label: 'Modify',
        description: 'Suggest changes to the approach'
      },
      {
        id: EscalationDecision.Reject,
        label: 'Reject',
        description: 'Try a different approach'
      }
    ];
  }

  /**
   * Generate escalation for limit violations
   */
  generateLimitEscalation(violations: string[]): EscalationRequest {
    const action = 'Exceeding autonomy limits';
    const reason = 'Action would exceed configured safety limits';
    const context = violations.join('\n');

    return this.generateEscalation(action, reason, context);
  }

  /**
   * Generate escalation for confidence issues
   */
  generateConfidenceEscalation(
    action: string,
    confidence: number,
    minRequired: number = 0.7
  ): EscalationRequest {
    const reason = `Low confidence: ${(confidence * 100).toFixed(1)}% (required: ${(minRequired * 100).toFixed(0)}%)`;
    const context = 'The proposed action has low confidence and requires your review';

    return this.generateEscalation(action, reason, context);
  }

  /**
   * Generate escalation for high-risk operations
   */
  generateRiskEscalation(action: string, riskFactors: string[]): EscalationRequest {
    const reason = 'High-risk operation detected';
    const context = `Risk factors:\n${riskFactors.map(f => `- ${f}`).join('\n')}`;

    return this.generateEscalation(action, reason, context);
  }

  /**
   * Parse user decision from response
   */
  parseDecision(response: string): EscalationDecision | null {
    const normalized = response.toLowerCase().trim();

    if (
      normalized.includes('approve') ||
      normalized.includes('yes') ||
      normalized.includes('proceed')
    ) {
      return EscalationDecision.Approve;
    }

    if (normalized.includes('modify') || normalized.includes('change')) {
      return EscalationDecision.Modify;
    }

    if (
      normalized.includes('reject') ||
      normalized.includes('no') ||
      normalized.includes('cancel')
    ) {
      return EscalationDecision.Reject;
    }

    return null;
  }
}
