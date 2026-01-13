/**
 * Result Merger for Swarm Orchestration
 * Source: /auto hooks/swarm-orchestrator.sh
 *
 * Aggregates results from multiple agents
 */

import type { AgentResult } from './Coordinator';

export interface MergedResult {
  swarmId: string;
  task: string;
  totalAgents: number;
  successfulAgents: number;
  failedAgents: number;
  summary: string;
  details: string[];
  allFilesModified: string[];
  errors: string[];
  recommendations: string[];
}

/**
 * Result merger for swarm execution
 */
export class ResultMerger {
  /**
   * Merge results from all agents
   */
  mergeResults(
    swarmId: string,
    task: string,
    results: AgentResult[]
  ): MergedResult {
    const successfulAgents = results.filter(r => r.status === 'success').length;
    const failedAgents = results.filter(r => r.status === 'failed').length;

    const details = results.map(r => this.formatAgentResult(r));
    const allFilesModified = this.collectUniqueFiles(results);
    const errors = this.collectErrors(results);
    const recommendations = this.generateRecommendations(results);

    return {
      swarmId,
      task,
      totalAgents: results.length,
      successfulAgents,
      failedAgents,
      summary: this.generateSummary(task, results),
      details,
      allFilesModified,
      errors,
      recommendations
    };
  }

  /**
   * Format individual agent result
   */
  private formatAgentResult(result: AgentResult): string {
    const status = result.status === 'success' ? '✅' : '❌';
    let output = `${status} Agent ${result.agentId}: ${result.summary}\n`;

    if (result.details) {
      output += `  Details: ${result.details}\n`;
    }

    if (result.filesModified.length > 0) {
      output += `  Files modified: ${result.filesModified.length}\n`;
      result.filesModified.forEach(file => {
        output += `    - ${file}\n`;
      });
    }

    if (result.errors && result.errors.length > 0) {
      output += `  Errors:\n`;
      result.errors.forEach(error => {
        output += `    - ${error}\n`;
      });
    }

    return output;
  }

  /**
   * Collect unique files from all agents
   */
  private collectUniqueFiles(results: AgentResult[]): string[] {
    const files = new Set<string>();

    for (const result of results) {
      for (const file of result.filesModified) {
        files.add(file);
      }
    }

    return Array.from(files).sort();
  }

  /**
   * Collect errors from all agents
   */
  private collectErrors(results: AgentResult[]): string[] {
    const errors: string[] = [];

    for (const result of results) {
      if (result.errors && result.errors.length > 0) {
        errors.push(`Agent ${result.agentId}:`, ...result.errors.map(e => `  ${e}`));
      }
    }

    return errors;
  }

  /**
   * Generate overall summary
   */
  private generateSummary(task: string, results: AgentResult[]): string {
    const total = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    let summary = `Swarm execution for "${task}" completed.\n`;
    summary += `Total agents: ${total}, Successful: ${success}, Failed: ${failed}\n`;

    if (failed === 0) {
      summary += 'All agents completed successfully.';
    } else if (success > 0) {
      summary += `Partially successful. ${failed} agent(s) encountered errors.`;
    } else {
      summary += 'All agents failed. Review errors for details.';
    }

    return summary;
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: AgentResult[]): string[] {
    const recommendations: string[] = [];

    const failed = results.filter(r => r.status === 'failed');
    if (failed.length > 0) {
      recommendations.push(
        `Review failed agents: ${failed.map(r => r.agentId).join(', ')}`
      );
    }

    const totalFiles = this.collectUniqueFiles(results).length;
    if (totalFiles > 10) {
      recommendations.push(
        `Many files modified (${totalFiles}). Consider code review before merging.`
      );
    }

    const totalErrors = this.collectErrors(results).length;
    if (totalErrors > 0) {
      recommendations.push(
        `${totalErrors} error(s) reported. Review error details for root causes.`
      );
    }

    return recommendations;
  }

  /**
   * Generate markdown report
   */
  generateReport(merged: MergedResult): string {
    let report = `# Swarm Execution Report\n\n`;
    report += `**Swarm ID**: ${merged.swarmId}\n`;
    report += `**Task**: ${merged.task}\n`;
    report += `**Total Agents**: ${merged.totalAgents}\n`;
    report += `**Successful**: ${merged.successfulAgents}\n`;
    report += `**Failed**: ${merged.failedAgents}\n\n`;

    report += `## Summary\n\n${merged.summary}\n\n`;

    if (merged.allFilesModified.length > 0) {
      report += `## Files Modified (${merged.allFilesModified.length})\n\n`;
      merged.allFilesModified.forEach(file => {
        report += `- ${file}\n`;
      });
      report += '\n';
    }

    report += `## Agent Results\n\n`;
    merged.details.forEach(detail => {
      report += detail + '\n';
    });

    if (merged.errors.length > 0) {
      report += `## Errors\n\n`;
      merged.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (merged.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      merged.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
      report += '\n';
    }

    return report;
  }
}
