/**
 * Fix Verifier - Verify fixes and detect regressions
 * Source: /auto hooks/debug-orchestrator.sh (lines 170-215)
 *
 * Compares before/after snapshots to detect regressions
 * Determines if fix introduced new problems
 */

import type { TestSnapshot } from './Snapshotter';

export interface RegressionResult {
  regressionDetected: boolean;
  regressionType: 'none' | 'test_failure' | 'new_errors' | 'performance_degradation';
  details: string;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  recommendation?: string;
}

export interface VerificationResult {
  success: boolean;
  regression: RegressionResult;
  fixEffective: boolean;
  testsPassed: boolean;
  recommendation: string;
}

/**
 * Verify fixes and detect regressions
 */
export class Verifier {
  private regressionLog: string;

  constructor(regressionLog: string) {
    this.regressionLog = regressionLog;
  }

  /**
   * Detect regression by comparing snapshots
   */
  async detectRegression(
    beforeSnapshot: TestSnapshot,
    afterSnapshot: TestSnapshot
  ): Promise<RegressionResult> {
    const beforePassed = beforeSnapshot.testsPassed;
    const afterPassed = afterSnapshot.testsPassed;

    let regressionDetected = false;
    let regressionType: RegressionResult['regressionType'] = 'none';
    let details = '';
    let recommendation = '';

    // Check for test failure regression
    if (beforePassed && !afterPassed) {
      regressionDetected = true;
      regressionType = 'test_failure';
      details = 'Tests passed before fix, but fail after fix';
      recommendation = 'Revert fix and try alternative approach';

      // Record regression
      await this.recordRegression({
        regressionDetected: true,
        regressionType,
        details,
        beforeSnapshot: beforeSnapshot.snapshotId,
        afterSnapshot: afterSnapshot.snapshotId
      });
    }

    // Check for new errors in output
    else if (this.hasNewErrors(beforeSnapshot.output, afterSnapshot.output)) {
      regressionDetected = true;
      regressionType = 'new_errors';
      details = 'New errors appeared in test output after fix';
      recommendation = 'Review error messages and adjust fix';
    }

    // Check for test count mismatch
    else if (beforeSnapshot.testCount > afterSnapshot.testCount) {
      regressionDetected = true;
      regressionType = 'test_failure';
      details = `Test count decreased from ${beforeSnapshot.testCount} to ${afterSnapshot.testCount}`;
      recommendation = 'Some tests may have been skipped or removed';
    }

    return {
      regressionDetected,
      regressionType,
      details,
      beforeSnapshot: beforeSnapshot.snapshotId,
      afterSnapshot: afterSnapshot.snapshotId,
      recommendation
    };
  }

  /**
   * Verify fix effectiveness
   */
  async verifyFix(
    beforeSnapshot: TestSnapshot,
    afterSnapshot: TestSnapshot,
    _fixDescription: string
  ): Promise<VerificationResult> {
    // Detect regression
    const regression = await this.detectRegression(beforeSnapshot, afterSnapshot);

    // Determine if fix was effective
    const beforePassed = beforeSnapshot.testsPassed;
    const afterPassed = afterSnapshot.testsPassed;
    const fixEffective = !beforePassed && afterPassed; // Tests failed before, pass after

    // Determine overall success
    const success = fixEffective && !regression.regressionDetected;

    // Generate recommendation
    let recommendation: string;
    if (regression.regressionDetected) {
      recommendation = `Regression detected: ${regression.details}. ${regression.recommendation}`;
    } else if (fixEffective) {
      recommendation = 'Fix successful - tests now passing';
    } else if (beforePassed && afterPassed) {
      recommendation = 'Tests passing before and after - verify fix addressed root cause';
    } else {
      recommendation = 'Fix did not resolve test failures - try alternative approach';
    }

    return {
      success,
      regression,
      fixEffective,
      testsPassed: afterPassed,
      recommendation
    };
  }

  /**
   * Check if new errors appeared in output
   */
  private hasNewErrors(beforeOutput: string, afterOutput: string): boolean {
    // Extract error patterns
    const errorPatterns = [/ERROR:/gi, /Exception:/gi, /Fatal:/gi, /\bFAILED\b/gi];

    const beforeErrors = this.countErrors(beforeOutput, errorPatterns);
    const afterErrors = this.countErrors(afterOutput, errorPatterns);

    return afterErrors > beforeErrors;
  }

  /**
   * Count errors in output
   */
  private countErrors(output: string, patterns: RegExp[]): number {
    let count = 0;
    for (const pattern of patterns) {
      const matches = output.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  /**
   * Record regression to log
   */
  private async recordRegression(_regression: RegressionResult): Promise<void> {
    // Placeholder - LLM integration will append to regression log
  }

  /**
   * Get recent regressions
   */
  async getRecentRegressions(_limit: number = 10): Promise<RegressionResult[]> {
    // Placeholder - LLM integration will read regression log
    return [];
  }

  /**
   * Check if similar regression occurred before
   */
  async checkSimilarRegressions(_details: string): Promise<RegressionResult[]> {
    // Placeholder - LLM integration will search regression log
    return [];
  }
}
