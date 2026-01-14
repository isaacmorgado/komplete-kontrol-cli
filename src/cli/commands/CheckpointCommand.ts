import type { CommandContext, CommandResult } from '../types';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export interface CheckpointOptions {
  summary?: string;
}

export class CheckpointCommand {
  name = 'checkpoint';

  async execute(context: CommandContext, options: CheckpointOptions): Promise<CommandResult> {
    try {
      // Step 0: Check for Pipeline State
      const claudeMdPath = join(context.workDir, 'CLAUDE.md');
      const pipelineState: any = null;
      let currentFeature = '';
      let currentTier = '';
      let currentPhase = '';
      let tierStatus = '';
      let reports: any = null;

      if (existsSync(claudeMdPath)) {
        const claudeContent = readFileSync(claudeMdPath, 'utf-8');
        const pipelineMatch = claudeContent.match(/## Pipeline State\n([\s\S]*?)(?=##|$)/s);
        if (pipelineMatch) {
          const pipelineContent = pipelineMatch[1];
          const phaseMatch = pipelineContent.match(/Phase:\s*(\w+)/);
          const featureMatch = pipelineContent.match(/Feature:\s*(.+)/);
          const tierMatch = pipelineContent.match(/Tier:\s*(\w+)/);
          const statusMatch = pipelineContent.match(/Tier-Status:\s*(\w+)/);
          const reportsMatch = pipelineContent.match(/Reports:\s*(.+)/);

          if (phaseMatch) currentPhase = phaseMatch[1];
          if (featureMatch) currentFeature = featureMatch[1];
          if (tierMatch) currentTier = tierMatch[1];
          if (statusMatch) tierStatus = statusMatch[1];
          if (reportsMatch) reports = reportsMatch[1];
        }
      }

      // Step 0.5: Update buildguide.md (If It Exists)
      const buildguidePath = join(context.workDir, 'buildguide.md');
      let nextSection = '';
      const newDocsFound: string[] = [];

      if (existsSync(buildguidePath)) {
        const buildguideContent = readFileSync(buildguidePath, 'utf-8');
        
        // Find next unchecked section
        const uncheckedMatch = buildguideContent.match(/-\s*\[\s*\]\s*(.+)/);
        if (uncheckedMatch && uncheckedMatch.length > 0) {
          nextSection = uncheckedMatch[0].trim();
        }
      }

      // Step 1: Update CLAUDE.md (KEEP IT LEAN)
      let claudeContent = existsSync(claudeMdPath) ? readFileSync(claudeMdPath, 'utf-8') : '';
      const now = new Date().toISOString().split('T')[0];

      // Replace Last Session (don't nest)
      const lastSessionRegex = /## Last Session\s*\([\s\S]*?\)\s*([\s\S]*?)/;
      claudeContent = claudeContent.replace(lastSessionRegex, '');

      // Add new Last Session (currently unused - reserved for future use)

      // Remove completed Next Steps (don't use strikethrough)
      const nextStepsMatch = claudeContent.match(/## Next Steps\s*([\s\S]*?)(?=##|$)/s);
      if (nextStepsMatch) {
        const nextStepsContent = nextStepsMatch[1];
        const filteredNextSteps = nextStepsContent
          .split('\n')
          .filter((line, index, _lines) => {
            if (line.trim().startsWith('- ')) {
              return index < 3; // Keep only first 3 items
            }
            return true;
          })
          .join('\n');
        
        claudeContent = claudeContent.replace(
          nextStepsMatch[0],
          `## Next Steps\n${filteredNextSteps}`
        );
      }

      // Remove Session Log / History sections
      claudeContent = claudeContent.replace(/## Session Log\s*[\s\S]*?(?=##|$)/gs, '');
      claudeContent = claudeContent.replace(/## History\s*[\s\S]*?(?=##|$)/gs, '');

      // Update Pipeline State if exists
      if (pipelineState) {
        const pipelineRegex = /## Pipeline State\s*([\s\S]*?)(?=##|$)/s;
        const newState = this.advancePipelineState(currentPhase, currentTier, tierStatus);
        const newPipelineSection = `## Pipeline State

Phase: ${newState.phase}
Feature: ${currentFeature}
Tier: ${newState.tier}
Tier-Status: ${newState.status}
Reports: ${reports || 'N/A'}
`;

        if (pipelineRegex) {
          claudeContent = claudeContent.replace(pipelineRegex, newPipelineSection);
        } else {
          claudeContent += '\n' + newPipelineSection;
        }
      }

      // Write updated CLAUDE.md
      writeFileSync(claudeMdPath, claudeContent);

      // Step 1.5: Push to GitHub (if in git repo)
      try {
        const isGitRepo = execSync('git rev-parse --git-dir 2>/dev/null', { cwd: context.workDir, stdio: 'pipe' });
        if (isGitRepo) {
          const hasChanges = execSync('git diff --quiet || git diff --cached --quiet', { cwd: context.workDir, stdio: 'pipe' });
          if (hasChanges) {
            execSync('git add CLAUDE.md buildguide.md 2>/dev/null || git add CLAUDE.md', { cwd: context.workDir });
            execSync(`git commit -m "checkpoint: ${now} - session progress saved"`, { cwd: context.workDir });
            
            try {
              execSync('git push origin HEAD 2>/dev/null', { cwd: context.workDir });
            } catch (e) {
              console.log(chalk.yellow('Note: Push failed, may need authentication'));
            }
          }
        }
      } catch (e) {
        // Not in git repo or git not available - continue normally
      }

      // Step 2: Output Continuation Prompt
      const continuationPrompt = this.generateContinuationPrompt(
        context.workDir,
        options.summary || 'Session checkpointed',
        currentFeature,
        currentPhase,
        currentTier,
        tierStatus,
        nextSection,
        newDocsFound
      );

      console.log(chalk.bold('\n' + continuationPrompt));

      return {
        success: true,
        message: 'Checkpoint saved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Checkpoint failed'
      };
    }
  }

  private advancePipelineState(phase: string, tier: string, status: string): any {
    const transitions: Record<string, any> = {
      'debugging,high,in-progress': { phase: 'debugging', tier: 'medium', status: 'pending' },
      'debugging,medium,in-progress': { phase: 'debugging', tier: 'low', status: 'pending' },
      'debugging,low,in-progress': { phase: 'refactor-hunt', tier: '-', status: '-' },
      'refactoring,high,in-progress': { phase: 'refactoring', tier: 'medium', status: 'pending' },
      'refactoring,medium,in-progress': { phase: 'refactoring', tier: 'low', status: 'pending' },
      'refactoring,low,in-progress': { phase: 'build', tier: '-', status: '-' }
    };

    const key = `${phase},${tier},${status}`;
    return transitions[key] || { phase, tier, status };
  }

  private generateContinuationPrompt(
    workDir: string,
    summary: string,
    feature: string,
    phase: string,
    tier: string,
    status: string,
    nextSection: string,
    newDocs: string[]
  ): string {
    const projectName = workDir.split('/').pop() || 'Project';

    if (phase) {
      // Pipeline-aware prompt
      return this.generatePipelineContinuationPrompt(
        projectName,
        summary,
        feature,
        phase,
        tier,
        status,
        nextSection,
        newDocs
      );
    }

    // Standard prompt
    return `
## Continuation Prompt

Continue work on ${projectName} at ${workDir}.

**What's Done**: ${summary}

**Current State**: Checkpoint saved at ${new Date().toLocaleTimeString()}

${nextSection ? `**Build Guide**: Next section: ${nextSection} - see buildguide.md for research` : ''}

${newDocs.length > 0 ? `**New Docs Found**: ${newDocs.join(', ')}` : ''}

**Next Step**: ${nextSection ? `Continue with ${nextSection}` : 'Check CLAUDE.md for next steps'}

**Key Files**: CLAUDE.md${existsSync(join(workDir, 'buildguide.md')) ? ', buildguide.md' : ''}

**Approach**: Do NOT explore full codebase. Use context above. Check buildguide.md for collected research.
`;
  }

  private generatePipelineContinuationPrompt(
    projectName: string,
    summary: string,
    feature: string,
    phase: string,
    tier: string,
    status: string,
    nextSection: string,
    newDocs: string[]
  ): string {
    if (phase === 'debugging') {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Phase**: debugging
**Feature**: ${feature}
**Current Tier**: ${tier} - ${status}

**Next Action**: Fix ${tier} priority bugs from bug report

**Approach**: Do NOT explore codebase. Read only files in Scope above.
`;
    }

    if (phase === 'refactor-hunt') {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Phase**: refactor-hunt
**Feature**: ${feature}

**Next Action**: Run /refactor-hunt-checkpoint to analyze for refactoring opportunities

**Approach**: Do NOT explore codebase. Read only files in Scope above.
`;
    }

    if (phase === 'refactoring') {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Phase**: refactoring
**Feature**: ${feature}
**Current Tier**: ${tier} - ${status}

**Next Action**: Execute ${tier} priority refactors from refactor report

**Approach**: Do NOT explore codebase. Read only files in Scope above.
`;
    }

    if (phase === 'build') {
      return `
## Continuation Prompt

Continue work on ${projectName}.

**Pipeline Complete** for feature: ${feature}

**Next Action**: ${nextSection || 'Pipeline complete - check with user for next task'}

**Approach**: Read CLAUDE.md for full context. You may explore codebase as needed.
`;
    }

    return this.generateStandardContinuationPrompt(projectName, summary, nextSection, newDocs);
  }

  private generateStandardContinuationPrompt(
    projectName: string,
    summary: string,
    nextSection: string,
    newDocs: string[]
  ): string {
    return `
## Continuation Prompt

Continue work on ${projectName}.

**What's Done**: ${summary}

${nextSection ? `**Build Guide**: Next section: ${nextSection} - see buildguide.md for research` : ''}

${newDocs.length > 0 ? `**New Docs Found**: ${newDocs.join(', ')}` : ''}

**Next Step**: ${nextSection || 'Check CLAUDE.md for next steps'}

**Key Files**: CLAUDE.md

**Approach**: Do NOT explore full codebase. Use context above. Check buildguide.md for collected research.
`;
  }
}
