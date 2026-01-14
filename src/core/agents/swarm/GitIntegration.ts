/**
 * Git Integration for Swarm Code Merging
 * Source: /auto hooks/swarm-orchestrator.sh
 *
 * Handles per-agent branches, conflict detection, and auto-resolution
 * Based on: kubernetes conflict detection, lean prover auto-resolution
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execAsync = promisify(exec);

export interface ConflictResolution {
  file: string;
  resolved: boolean;
  method: 'auto_package_lock' | 'auto_small_conflict' | 'manual_required';
  details: string;
}

export interface IntegrationResult {
  success: boolean;
  agentId: number;
  branch: string;
  conflictsDetected: boolean;
  autoResolved: ConflictResolution[];
  unresolved: ConflictResolution[];
  report: string;
}

export interface IntegrationSummary {
  totalAgents: number;
  successfulMerges: number;
  totalConflicts: number;
  autoResolved: number;
  unresolved: number;
  report: string;
}

/**
 * Git integration for swarm code merging
 */
export class GitIntegration {
  /**
   * Execute a git command
   */
  private async execGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const command = `git ${args.join(' ')}`;
      const { stdout, stderr } = await execAsync(command, { cwd });

      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0
      };
    } catch (error: any) {
      // exec throws on non-zero exit codes
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || '',
        exitCode: error.code || 1
      };
    }
  }
  /**
   * Integrate changes from multiple agents
   */
  async integrateChanges(
    swarmId: string,
    agentCount: number,
    workDir: string
  ): Promise<IntegrationSummary> {
    const results: IntegrationResult[] = [];
    const autoResolved: ConflictResolution[] = [];
    const unresolved: ConflictResolution[] = [];

    for (let i = 1; i <= agentCount; i++) {
      const result = await this.integrateAgent(swarmId, i, workDir);
      results.push(result);

      if (result.autoResolved.length > 0) {
        autoResolved.push(...result.autoResolved);
      }
      if (result.unresolved.length > 0) {
        unresolved.push(...result.unresolved);
      }
    }

    const successfulMerges = results.filter(r => r.success).length;
    const totalConflicts = autoResolved.length + unresolved.length;

    return {
      totalAgents: agentCount,
      successfulMerges,
      totalConflicts,
      autoResolved: autoResolved.length,
      unresolved: unresolved.length,
      report: this.generateSummaryReport(results, autoResolved, unresolved)
    };
  }

  /**
   * Integrate single agent's changes
   */
  private async integrateAgent(
    swarmId: string,
    agentId: number,
    workDir: string
  ): Promise<IntegrationResult> {
    const branch = `swarm-${swarmId}-agent-${agentId}`;
    const autoResolved: ConflictResolution[] = [];
    const unresolved: ConflictResolution[] = [];

    try {
      // Check if branch exists
      const branchCheck = await this.execGit(['rev-parse', '--verify', branch], workDir);
      if (branchCheck.exitCode !== 0) {
        // Branch doesn't exist
        return {
          success: false,
          agentId,
          branch,
          conflictsDetected: false,
          autoResolved,
          unresolved,
          report: `Agent ${agentId}: Branch ${branch} not found`
        };
      }

      // Attempt to merge the branch
      await this.execGit(['merge', branch, '--no-commit', '--no-ff'], workDir);

      // Check for conflicts
      const conflictedFiles = await this.detectConflicts(workDir);
      const conflictsDetected = conflictedFiles.length > 0;

      if (conflictsDetected) {
        // Auto-resolve known safe conflicts
        const resolution = await this.autoResolveConflicts(conflictedFiles, workDir);
        autoResolved.push(...resolution.resolved);
        unresolved.push(...resolution.unresolved);

        // Stage auto-resolved files
        for (const resolved of resolution.resolved) {
          if (this.isPackageLock(resolved.file)) {
            await this.execGit(['checkout', '--ours', resolved.file], workDir);
          } else {
            await this.execGit(['checkout', '--theirs', resolved.file], workDir);
          }
          await this.execGit(['add', resolved.file], workDir);
        }

        // If all conflicts resolved, complete the merge
        if (resolution.unresolved.length === 0) {
          await this.execGit(['commit', '-m', `Merged ${branch} (auto-resolved)`], workDir);
        } else {
          // Abort merge if unresolved conflicts remain
          await this.execGit(['merge', '--abort'], workDir);
        }
      } else {
        // No conflicts, complete the merge
        await this.execGit(['commit', '-m', `Merged ${branch}`], workDir);
      }

      return {
        success: unresolved.length === 0,
        agentId,
        branch,
        conflictsDetected,
        autoResolved,
        unresolved,
        report: unresolved.length === 0
          ? `Agent ${agentId}: Integration successful (${autoResolved.length} auto-resolved)`
          : `Agent ${agentId}: Integration aborted (${unresolved.length} unresolved conflicts)`
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        agentId,
        branch,
        conflictsDetected: false,
        autoResolved,
        unresolved,
        report: `Agent ${agentId}: Error - ${err.message}`
      };
    }
  }

  /**
   * Detect conflicts in a merge
   */
  private async detectConflicts(workDir: string): Promise<string[]> {
    // Use git diff to find unmerged (conflicted) files
    // Kubernetes pattern for conflict detection
    const result = await this.execGit(['diff', '--name-only', '--diff-filter=U'], workDir);

    if (result.exitCode !== 0) {
      return [];
    }

    // Split by newlines and filter empty lines
    return result.stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Auto-resolve known safe conflicts
   */
  private async autoResolveConflicts(conflictedFiles: string[], workDir: string): Promise<{
    resolved: ConflictResolution[];
    unresolved: ConflictResolution[];
  }> {
    const resolved: ConflictResolution[] = [];
    const unresolved: ConflictResolution[] = [];

    for (const file of conflictedFiles) {
      // Auto-resolve: Package lock files (always take ours)
      if (this.isPackageLock(file)) {
        resolved.push({
          file,
          resolved: true,
          method: 'auto_package_lock',
          details: 'Kept current lockfile'
        });
        continue;
      }

      // Auto-resolve: Small formatting conflicts
      const conflictCount = await this.countConflictMarkers(file, workDir);
      if (conflictCount > 0 && conflictCount <= 3) {
        // Single conflict region has 3 markers (<<<<<<, ======, >>>>>>)
        resolved.push({
          file,
          resolved: true,
          method: 'auto_small_conflict',
          details: 'Small conflict (1 region), kept agent changes'
        });
        continue;
      }

      // Otherwise, requires manual resolution
      unresolved.push({
        file,
        resolved: false,
        method: 'manual_required',
        details: 'Requires manual review'
      });
    }

    return { resolved, unresolved };
  }

  /**
   * Check if file is a package lock file
   */
  private isPackageLock(file: string): boolean {
    return /package-lock\.json|yarn\.lock|Gemfile\.lock|Cargo\.lock|bun\.lockb/.test(file);
  }

  /**
   * Count conflict markers in file
   */
  private async countConflictMarkers(file: string, workDir: string): Promise<number> {
    try {
      const filePath = path.join(workDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Count lines that start with conflict markers
      // <<<<<<< (start of conflict)
      // ======= (separator)
      // >>>>>>> (end of conflict)
      let count = 0;
      for (const line of lines) {
        if (/^(<{7}|={7}|>{7})/.test(line)) {
          count++;
        }
      }

      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate summary report
   */
  private generateSummaryReport(
    results: IntegrationResult[],
    autoResolved: ConflictResolution[],
    unresolved: ConflictResolution[]
  ): string {
    let report = '# Code Integration Report\n\n';

    report += `**Total Agents**: ${results.length}\n`;
    report += `**Successful Merges**: ${results.filter(r => r.success).length}\n`;
    report += `**Total Conflicts**: ${autoResolved.length + unresolved.length}\n`;
    report += `**Auto-Resolved**: ${autoResolved.length}\n`;
    report += `**Unresolved**: ${unresolved.length}\n\n`;

    if (autoResolved.length > 0) {
      report += '## Auto-Resolved Conflicts\n\n';
      for (const resolution of autoResolved) {
        report += `- ${resolution.file}: ${resolution.details}\n`;
      }
      report += '\n';
    }

    if (unresolved.length > 0) {
      report += '## ⚠️ Unresolved Conflicts (Require Manual Review)\n\n';
      for (const resolution of unresolved) {
        report += `- ${resolution.file}: ${resolution.details}\n`;
      }
      report += '\n';
    }

    report += '## Per-Agent Results\n\n';
    for (const result of results) {
      report += `### Agent ${result.agentId}\n`;
      report += `- Branch: ${result.branch}\n`;
      report += `- Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
      report += `- Conflicts: ${result.conflictsDetected ? 'Yes' : 'No'}\n\n`;
    }

    return report;
  }
}
