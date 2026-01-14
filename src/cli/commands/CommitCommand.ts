import type { CommandContext, CommandResult } from '../types';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export interface CommitOptions {
  message?: string;
  push?: boolean;
  branch?: string;
}

export class CommitCommand {
  name = 'commit';
  description = 'Create a permanent version history commit (milestone)';

  async execute(context: CommandContext, options: CommitOptions): Promise<CommandResult> {
    try {
      console.log(chalk.bold('\n=== Git Commit (Milestone) ==='));

      // Step 1: Check if we're in a git repository
      try {
        execSync('git rev-parse --git-dir', { cwd: context.workDir, stdio: 'pipe' });
      } catch (e) {
        return {
          success: false,
          message: 'Not in a git repository. Cannot create commit.'
        };
      }

      // Step 2: Check for changes
      const hasChanges = execSync('git diff --quiet || git diff --cached --quiet', { cwd: context.workDir, stdio: 'pipe' });
      if (!hasChanges) {
        console.log(chalk.yellow('\nNo changes to commit.'));
        return {
          success: true,
          message: 'No changes to commit'
        };
      }

      // Step 3: Generate commit message if not provided
      let commitMessage = options.message;
      if (!commitMessage) {
        commitMessage = await this.generateCommitMessage(context);
      }

      console.log(chalk.cyan(`\nCommit message: ${commitMessage}`));

      // Step 4: Stage all changes
      console.log(chalk.gray('Staging changes...'));
      execSync('git add -A', { cwd: context.workDir });

      // Step 5: Create commit
      console.log(chalk.gray('Creating commit...'));
      execSync(`git commit -m "${commitMessage}"`, { cwd: context.workDir });
      console.log(chalk.green('✓ Commit created successfully'));

      // Step 6: Get commit hash
      const commitHash = execSync('git rev-parse --short HEAD', { cwd: context.workDir, encoding: 'utf-8' }).trim();
      console.log(chalk.gray(`Commit: ${commitHash}`));

      // Step 7: Push if requested
      if (options.push) {
        console.log(chalk.gray('Pushing to remote...'));
        try {
          if (options.branch) {
            execSync(`git push origin ${options.branch}`, { cwd: context.workDir });
          } else {
            execSync('git push origin HEAD', { cwd: context.workDir });
          }
          console.log(chalk.green('✓ Pushed to remote'));
        } catch (e) {
          console.log(chalk.yellow('Note: Push failed, may need authentication'));
        }
      }

      // Step 8: Update CLAUDE.md with milestone info
      this.updateClaudeMd(context, commitMessage, commitHash);

      console.log(chalk.bold('\n=== Milestone Saved ==='));
      console.log(chalk.green('This commit represents a stable milestone in your project.'));

      return {
        success: true,
        message: `Commit ${commitHash} created: ${commitMessage}`,
        data: { hash: commitHash, message: commitMessage }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Commit failed'
      };
    }
  }

  /**
   * Generate a commit message based on current changes
   */
  private async generateCommitMessage(context: CommandContext): Promise<string> {
    try {
      // Get git diff for context (currently unused, reserved for future AI analysis)
      // const _diff = execSync('git diff --cached --stat', { cwd: context.workDir, encoding: 'utf-8' });

      // Check for CLAUDE.md context
      const claudeMdPath = join(context.workDir, 'CLAUDE.md');
      let contextInfo = '';
      if (existsSync(claudeMdPath)) {
        const claudeContent = readFileSync(claudeMdPath, 'utf-8');
        const lastSessionMatch = claudeContent.match(/## Last Session\s*\([^)]+\)\s*- ([^\n]+)/);
        if (lastSessionMatch) {
          contextInfo = lastSessionMatch[1].trim();
        }
      }

      // Generate message
      const now = new Date().toISOString().split('T')[0];
      let message = `Milestone: ${now}`;

      if (contextInfo) {
        message += ` - ${contextInfo}`;
      }

      return message;
    } catch (e) {
      const now = new Date().toISOString().split('T')[0];
      return `Milestone: ${now}`;
    }
  }

  /**
   * Update CLAUDE.md with milestone information
   */
  private updateClaudeMd(context: CommandContext, message: string, hash: string): void {
    const claudeMdPath = join(context.workDir, 'CLAUDE.md');
    if (!existsSync(claudeMdPath)) return;

    let claudeContent = readFileSync(claudeMdPath, 'utf-8');

    // Add or update Milestones section
    const now = new Date().toISOString().split('T')[0];
    const milestoneEntry = `- ${now}: ${message} (${hash})`;

    const milestonesRegex = /## Milestones\s*([\s\S]*?)(?=##|$)/s;
    const milestonesMatch = claudeContent.match(milestonesRegex);

    if (milestonesMatch) {
      // Add new milestone at the beginning of the list
      const milestonesContent = milestonesMatch[1];
      const lines = milestonesContent.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim() && !line.trim().startsWith('-'));
      const newMilestones = nonEmptyLines.join('\n') + '\n' + milestoneEntry;
      claudeContent = claudeContent.replace(milestonesRegex, `## Milestones\n${newMilestones}`);
    } else {
      // Create new Milestones section
      claudeContent += `\n\n## Milestones\n${milestoneEntry}`;
    }

    writeFileSync(claudeMdPath, claudeContent);
  }
}
