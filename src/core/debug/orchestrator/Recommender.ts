/**
 * Fix Recommender - Generate recommendations based on context
 * Source: /auto hooks/debug-orchestrator.sh (lines 311-373)
 *
 * Provides intelligent recommendations for fixes and next steps
 * Suggests revert when regressions detected
 */

import type { VerificationResult } from './Verifier';
import type { BugFixRecord, SearchResult } from './Memory';
import type { SearchContext } from './Searcher';

export interface FixRecommendation {
  status: 'success' | 'regression_detected' | 'failed' | 'needs_alternative';
  message: string;
  regressionsDetected: boolean;
  recommendation: string;
  actions: string[];
  confidence?: number;
  alternativeApproaches?: string[];
}

export interface SmartDebugContext {
  bug: string;
  beforeSnapshot: string;
  similarFixesCount: number;
  similarFixes: SearchResult;
  githubSolutions: any;
  fixPrompt: any;
  nextSteps: string[];
}

/**
 * Generate intelligent recommendations for debugging
 */
export class Recommender {
  /**
   * Generate recommendation after fix verification
   */
  generateVerificationRecommendation(
    verification: VerificationResult,
    _fixDescription: string
  ): FixRecommendation {
    if (verification.regression.regressionDetected) {
      // Regression detected - recommend revert
      return {
        status: 'regression_detected',
        message: 'Fix introduced a regression - tests passing before, failing after',
        regressionsDetected: true,
        recommendation: 'REVERT THE FIX',
        actions: [
          '1. Git revert the changes',
          '2. Analyze test failures',
          '3. Try alternative approach using similar_fixes from memory'
        ],
        confidence: 95
      };
    } else if (verification.success) {
      // Success - no regression
      return {
        status: 'success',
        message: 'Fix verified - no regressions detected',
        regressionsDetected: false,
        recommendation: 'Fix successful - continue with next task',
        actions: ['1. Record successful fix to memory', '2. Continue with next task'],
        confidence: 90
      };
    } else if (!verification.fixEffective) {
      // Fix didn't work
      return {
        status: 'failed',
        message: 'Fix did not resolve the issue',
        regressionsDetected: false,
        recommendation: 'Try alternative approach',
        actions: [
          '1. Review similar fixes from memory',
          '2. Search GitHub for solutions',
          '3. Try different approach'
        ],
        confidence: 70
      };
    }

    // Default case
    return {
      status: 'needs_alternative',
      message: 'Fix partially effective but needs refinement',
      regressionsDetected: false,
      recommendation: 'Refine the fix',
      actions: ['1. Analyze test output', '2. Adjust fix incrementally'],
      confidence: 60
    };
  }

  /**
   * Generate smart debug context with recommendations
   */
  generateSmartDebugContext(
    bugDescription: string,
    beforeSnapshotId: string,
    similarFixes: SearchResult,
    githubSolutions: any
  ): SmartDebugContext {
    // Build fix prompt with context
    const fixPrompt = {
      task: 'Fix bug with regression awareness',
      bugDescription,
      bugType: 'general',
      context: '',
      similarFixesFromMemory: similarFixes,
      githubSolutions,
      instructions: [
        '1. Review similar fixes from memory to avoid repeating failed approaches',
        '2. Consider GitHub solutions if available',
        '3. Make the fix incrementally',
        '4. Think about potential side effects on other components',
        '5. Run tests after fix to detect regressions'
      ]
    };

    return {
      bug: bugDescription,
      beforeSnapshot: beforeSnapshotId,
      similarFixesCount: similarFixes.count,
      similarFixes,
      githubSolutions,
      fixPrompt,
      nextSteps: [
        '1. Review similar fixes and GitHub solutions',
        '2. Apply fix incrementally',
        '3. Run: verify-fix <snapshot_id> <test_command>',
        '4. If regression detected, will auto-recommend revert'
      ]
    };
  }

  /**
   * Generate alternative approaches based on failures
   */
  generateAlternativeApproaches(
    bugDescription: string,
    failedApproaches: string[],
    similarFixes: BugFixRecord[]
  ): string[] {
    const alternatives: string[] = [];

    // Analyze successful similar fixes
    for (const fix of similarFixes) {
      if (fix.success && !failedApproaches.includes(fix.fixDescription)) {
        alternatives.push(fix.fixDescription);
      }
    }

    // Add generic alternatives based on bug patterns
    if (bugDescription.toLowerCase().includes('test fail')) {
      alternatives.push('Check test setup/teardown');
      alternatives.push('Verify test data fixtures');
      alternatives.push('Review async test timing');
    }

    if (bugDescription.toLowerCase().includes('type error')) {
      alternatives.push('Add explicit type annotations');
      alternatives.push('Check interface definitions');
      alternatives.push('Review generic type constraints');
    }

    if (bugDescription.toLowerCase().includes('undefined')) {
      alternatives.push('Add null checks');
      alternatives.push('Initialize variables explicitly');
      alternatives.push('Review optional chaining usage');
    }

    return alternatives.slice(0, 5); // Limit to top 5
  }

  /**
   * Generate incremental fix steps
   */
  generateIncrementalSteps(bugDescription: string, context: SearchContext): string[] {
    const steps: string[] = [
      'Create test snapshot before changes',
      'Identify minimal change needed',
      'Apply single change',
      'Run tests and check for regression',
      'If passing, continue; if failing, revert and try alternative'
    ];

    // Add context-specific steps
    if (context.similarFixesFromMemory.count > 0) {
      steps.unshift('Review similar successful fixes from memory');
    }

    if (context.githubSolutions.available) {
      steps.unshift('Check GitHub solutions for patterns');
    }

    return steps;
  }

  /**
   * Assess confidence level for fix
   */
  assessConfidence(context: {
    similarFixesCount: number;
    hasGitHubSolutions: boolean;
    testsPassed: boolean;
    attemptCount: number;
  }): number {
    let confidence = 50; // Base confidence

    // Increase with similar fixes
    confidence += Math.min(context.similarFixesCount * 10, 30);

    // Increase if GitHub solutions available
    if (context.hasGitHubSolutions) {
      confidence += 15;
    }

    // Increase if tests passing
    if (context.testsPassed) {
      confidence += 20;
    }

    // Decrease with multiple attempts
    confidence -= Math.min(context.attemptCount * 5, 20);

    return Math.max(0, Math.min(100, confidence));
  }
}
