/**
 * Debug Orchestrator - Intelligent debugging with regression detection
 * Source: /auto hooks/debug-orchestrator.sh
 *
 * Main coordinator for debug operations
 * Integrates all debug modules for comprehensive debugging
 */

import { Snapshotter, type TestSnapshot, type SnapshotResult } from './Snapshotter';
import { Memory, type BugFixRecord, type SearchResult } from './Memory';
import { Searcher, type SearchContext, type GitHubSearchResult } from './Searcher';
import { Verifier, type RegressionResult, type VerificationResult } from './Verifier';
import {
  Recommender,
  type FixRecommendation,
  type SmartDebugContext
} from './Recommender';

export type {
  TestSnapshot,
  SnapshotResult,
  BugFixRecord,
  SearchResult,
  SearchContext,
  GitHubSearchResult,
  RegressionResult,
  VerificationResult,
  FixRecommendation,
  SmartDebugContext
};

export interface DebugConfig {
  debugDir: string;
  bugFixMemoryFile: string;
  regressionLogFile: string;
  testSnapshotsDir: string;
  githubMcpAvailable?: boolean;
}

export interface SmartDebugInput {
  bugDescription: string;
  bugType?: string;
  testCommand?: string;
  context?: string;
}

export interface VerifyFixInput {
  beforeSnapshotId: string;
  testCommand: string;
  fixDescription?: string;
}

/**
 * Main Debug Orchestrator
 * Coordinates all debug operations with regression detection
 */
export class DebugOrchestrator {
  private snapshotter: Snapshotter;
  private memory: Memory;
  private searcher: Searcher;
  private verifier: Verifier;
  private recommender: Recommender;

  constructor(config: DebugConfig) {
    this.snapshotter = new Snapshotter(config.testSnapshotsDir);
    this.memory = new Memory(config.bugFixMemoryFile);
    this.searcher = new Searcher(config.githubMcpAvailable);
    this.verifier = new Verifier(config.regressionLogFile);
    this.recommender = new Recommender();
  }

  /**
   * Smart debug workflow - comprehensive debugging with memory
   *
   * Workflow:
   * 1. Create BEFORE snapshot
   * 2. Search similar bugs in memory
   * 3. Search GitHub for solutions
   * 4. Generate intelligent fix prompt
   */
  async smartDebug(input: SmartDebugInput): Promise<SmartDebugContext> {
    const {
      bugDescription,
      testCommand = 'echo "No tests configured"'
    } = input;

    // Step 1: Create BEFORE snapshot
    const beforeSnapshotId = this.snapshotter.generateBeforeId();
    await this.snapshotter.createSnapshot(
      beforeSnapshotId,
      testCommand,
      `Before fix: ${bugDescription}`
    );

    // Step 2: Search similar bugs in memory
    const similarFixes = await this.memory.searchSimilarBugs(bugDescription, 5);

    // Step 3: Search GitHub for solutions
    const githubSolutions = await this.searcher.searchGitHub(bugDescription);

    // Step 4: Generate smart debug context
    const debugContext = this.recommender.generateSmartDebugContext(
      bugDescription,
      beforeSnapshotId,
      similarFixes,
      githubSolutions
    );

    return debugContext;
  }

  /**
   * Verify fix workflow - detect regressions after fix
   *
   * Workflow:
   * 1. Create AFTER snapshot
   * 2. Compare with BEFORE snapshot
   * 3. Detect regressions
   * 4. Generate recommendations
   * 5. Record to memory if successful
   */
  async verifyFix(input: VerifyFixInput): Promise<FixRecommendation> {
    const { beforeSnapshotId, testCommand, fixDescription = 'Fix applied' } = input;

    // Step 1: Create AFTER snapshot
    const afterSnapshotId = this.snapshotter.generateAfterId();
    await this.snapshotter.createSnapshot(afterSnapshotId, testCommand, 'After fix');

    // Step 2: Load snapshots
    const beforeSnapshot = await this.snapshotter.loadSnapshot(beforeSnapshotId);
    const afterSnapshot = await this.snapshotter.loadSnapshot(afterSnapshotId);

    if (!beforeSnapshot || !afterSnapshot) {
      return {
        status: 'failed',
        message: 'Snapshots not found',
        regressionsDetected: false,
        recommendation: 'Ensure snapshots were created successfully',
        actions: ['Create snapshots before verification']
      };
    }

    // Step 3: Verify fix
    const verification = await this.verifier.verifyFix(
      beforeSnapshot,
      afterSnapshot,
      fixDescription
    );

    // Step 4: Generate recommendation
    const recommendation = this.recommender.generateVerificationRecommendation(
      verification,
      fixDescription
    );

    // Step 5: Record to memory if successful
    if (verification.success) {
      await this.memory.recordBugFix(
        'Bug fix verified',
        'general',
        fixDescription,
        'unknown',
        true,
        'passed'
      );
    }

    return recommendation;
  }

  /**
   * Record a bug fix to memory
   */
  async recordBugFix(
    bugDescription: string,
    bugType: string,
    fixDescription: string,
    filesChanged: string,
    success: boolean,
    testsPassed: string = 'unknown'
  ): Promise<BugFixRecord> {
    return this.memory.recordBugFix(
      bugDescription,
      bugType,
      fixDescription,
      filesChanged,
      success,
      testsPassed
    );
  }

  /**
   * Search similar bugs in memory
   */
  async searchSimilarBugs(query: string, limit: number = 5): Promise<SearchResult> {
    return this.memory.searchSimilarBugs(query, limit);
  }

  /**
   * Search GitHub for solutions
   */
  async searchGitHub(bugDescription: string, limit: number = 3): Promise<GitHubSearchResult> {
    return this.searcher.searchGitHub(bugDescription, limit);
  }

  /**
   * Create test snapshot
   */
  async createSnapshot(
    snapshotId: string,
    testCommand: string,
    description: string
  ): Promise<SnapshotResult> {
    return this.snapshotter.createSnapshot(snapshotId, testCommand, description);
  }

  /**
   * Detect regression between snapshots
   */
  async detectRegression(
    beforeSnapshot: TestSnapshot,
    afterSnapshot: TestSnapshot
  ): Promise<RegressionResult> {
    return this.verifier.detectRegression(beforeSnapshot, afterSnapshot);
  }

  /**
   * Generate alternative approaches
   */
  generateAlternatives(
    bugDescription: string,
    failedApproaches: string[],
    similarFixes: BugFixRecord[]
  ): string[] {
    return this.recommender.generateAlternativeApproaches(
      bugDescription,
      failedApproaches,
      similarFixes
    );
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    return this.memory.getStats();
  }

  /**
   * Get recent regressions
   */
  async getRecentRegressions(limit: number = 10) {
    return this.verifier.getRecentRegressions(limit);
  }
}

/**
 * Create default debug orchestrator
 */
export function createDebugOrchestrator(
  debugDir: string = '~/.claude/.debug',
  githubMcpAvailable: boolean = false
): DebugOrchestrator {
  const config: DebugConfig = {
    debugDir,
    bugFixMemoryFile: `${debugDir}/bug-fixes.jsonl`,
    regressionLogFile: `${debugDir}/regressions.jsonl`,
    testSnapshotsDir: `${debugDir}/test-snapshots`,
    githubMcpAvailable
  };

  return new DebugOrchestrator(config);
}
