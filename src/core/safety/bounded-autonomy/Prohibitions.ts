/**
 * Prohibited Actions Definition
 * Source: /auto hooks/bounded-autonomy.sh
 *
 * Defines actions that are NEVER allowed autonomously
 */

export interface ActionLimits {
  maxFileChanges: number;
  maxLinesPerFile: number;
  maxNewFiles: number;
  maxDeletions: number;
}

export interface AutonomyRules {
  autoAllowed: {
    description: string;
    actions: string[];
    limits: ActionLimits;
  };
  requiresApproval: {
    description: string;
    actions: string[];
    escalationTriggers: string[];
  };
  prohibited: {
    description: string;
    actions: string[];
  };
}

/**
 * Get complete autonomy rules
 */
export function getAutonomyRules(): AutonomyRules {
  return {
    autoAllowed: {
      description: 'Actions that can be taken without approval',
      actions: [
        'Read files',
        'Search code',
        'Run tests',
        'Run linters',
        'Edit files (< 100 lines changed)',
        'Add/update comments',
        'Fix linting errors',
        'Update dependencies (patch/minor versions)',
        'Create test files',
        'Fix test failures',
        'Update documentation',
        'Refactor without changing behavior (< 50 lines)'
      ],
      limits: {
        maxFileChanges: 10,
        maxLinesPerFile: 100,
        maxNewFiles: 3,
        maxDeletions: 20
      }
    },
    requiresApproval: {
      description: 'Actions requiring user confirmation',
      actions: [
        'Architecture changes',
        'Database migrations',
        'External API integrations',
        'Security-sensitive code',
        'Large refactoring (> 100 lines)',
        'Dependency major version updates',
        'Configuration changes',
        'Delete files',
        'Modify build scripts',
        'Change CI/CD pipelines',
        'Install new dependencies'
      ],
      escalationTriggers: [
        'Confidence < 70%',
        'High risk operation',
        'Multiple failures (> 2)',
        'Ambiguous requirements',
        'Security implications'
      ]
    },
    prohibited: {
      description: 'Actions never allowed autonomously',
      actions: [
        'Commit with --no-verify',
        'Force push to main/master',
        'Delete production data',
        'Expose secrets/credentials',
        'Bypass security checks',
        'Modify .git directory',
        'Change system files',
        'Deploy to production'
      ]
    }
  };
}

/**
 * Check if action is prohibited
 */
export function isProhibited(action: string): boolean {
  const rules = getAutonomyRules();
  const lowerAction = action.toLowerCase();

  return rules.prohibited.actions.some(prohibited =>
    lowerAction.includes(prohibited.toLowerCase())
  );
}

/**
 * Check if action requires approval
 */
export function requiresApproval(action: string): boolean {
  const rules = getAutonomyRules();
  const lowerAction = action.toLowerCase();

  return rules.requiresApproval.actions.some(approval =>
    lowerAction.includes(approval.toLowerCase())
  );
}

/**
 * Check if action is auto-allowed
 */
export function isAutoAllowed(action: string): boolean {
  const rules = getAutonomyRules();
  const lowerAction = action.toLowerCase();

  return rules.autoAllowed.actions.some(allowed =>
    lowerAction.includes(allowed.toLowerCase())
  );
}
