/**
 * Approval Tracking
 * Source: /auto hooks/bounded-autonomy.sh
 *
 * Tracks approved actions and their contexts
 */

export interface ApprovalRecord {
  action: string;
  approvedAt: string;
  expiresAt?: string;
  context: string;
  decision: 'approve' | 'modify' | 'reject';
  modifiedAction?: string;
}

/**
 * Approval tracker for bounded autonomy
 */
export class ApprovalTracker {
  private approvals: Map<string, ApprovalRecord> = new Map();
  private readonly defaultTTL = 3600000; // 1 hour in milliseconds

  /**
   * Record an approval
   */
  recordApproval(
    action: string,
    decision: 'approve' | 'modify' | 'reject',
    context: string,
    ttl?: number
  ): void {
    const now = new Date();
    const expiresAt = ttl ? new Date(now.getTime() + ttl) : undefined;

    this.approvals.set(action, {
      action,
      approvedAt: now.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      context,
      decision
    });
  }

  /**
   * Record a modified action approval
   */
  recordModifiedApproval(
    originalAction: string,
    modifiedAction: string,
    context: string,
    ttl?: number
  ): void {
    const now = new Date();
    const expiresAt = ttl ? new Date(now.getTime() + ttl) : undefined;

    this.approvals.set(originalAction, {
      action: originalAction,
      approvedAt: now.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      context,
      decision: 'modify',
      modifiedAction
    });
  }

  /**
   * Check if action was previously approved
   */
  isApproved(action: string): boolean {
    const approval = this.approvals.get(action);
    if (!approval) {
      return false;
    }

    // Check if expired
    if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
      this.approvals.delete(action);
      return false;
    }

    return approval.decision === 'approve' || approval.decision === 'modify';
  }

  /**
   * Get approval record
   */
  getApproval(action: string): ApprovalRecord | undefined {
    const approval = this.approvals.get(action);
    if (!approval) {
      return undefined;
    }

    // Check if expired
    if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
      this.approvals.delete(action);
      return undefined;
    }

    return approval;
  }

  /**
   * Get modified action if one was approved
   */
  getModifiedAction(originalAction: string): string | undefined {
    const approval = this.getApproval(originalAction);
    return approval?.modifiedAction;
  }

  /**
   * Clear expired approvals
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [action, approval] of this.approvals.entries()) {
      if (approval.expiresAt && new Date(approval.expiresAt) < now) {
        this.approvals.delete(action);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all approvals
   */
  clearAll(): void {
    this.approvals.clear();
  }

  /**
   * Get all active approvals
   */
  getAllApprovals(): ApprovalRecord[] {
    this.clearExpired();
    return Array.from(this.approvals.values());
  }

  /**
   * Get approval statistics
   */
  getStats(): {
    total: number;
    approved: number;
    modified: number;
    rejected: number;
  } {
    this.clearExpired();
    const approvals = Array.from(this.approvals.values());

    return {
      total: approvals.length,
      approved: approvals.filter(a => a.decision === 'approve').length,
      modified: approvals.filter(a => a.decision === 'modify').length,
      rejected: approvals.filter(a => a.decision === 'reject').length
    };
  }
}
