# /auto Command - Skill Integration Documentation

## Overview

The `/auto` command has been enhanced to properly integrate with Claude agent skills (`/checkpoint`, `/commit`, `/compact`) based on the official [Claude Agent Skills documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

## Skill Invocation Logic

### `/checkpoint` - Session-Level Recovery

**Purpose:** Quick, session-level recovery for rapid iteration and rollback capability.

**When to invoke:**
1. **Regular intervals** - Every N iterations (default: 10, configurable via `checkpointThreshold`)
2. **After failures** - When 3 or more consecutive failures occur (for recovery)
3. **After progress** - When 5+ consecutive successes and threshold interval passed

**Implementation:**
```typescript
private async performCheckpoint(context: CommandContext, goal: string): Promise<void> {
  this.info('📸 Auto-checkpoint triggered');

  try {
    const result = await this.checkpointCommand.execute(context, {
      summary: `Auto checkpoint at iteration ${this.iterations}: ${goal}`
    });
    
    if (result.success) {
      this.success('Checkpoint saved - session can be resumed from this point');
    } else {
      this.warn('Checkpoint failed (continuing anyway)');
    }
    
    this.lastCheckpointIteration = this.iterations;
  } catch (error) {
    this.warn('Checkpoint failed (continuing anyway)');
  }
}
```

**Claude Best Practice:** Use checkpoints before major edits, at natural breakpoints, or when trying experimental changes.

### `/commit` - Permanent Version History

**Purpose:** Permanent version history for milestones and collaboration.

**When to invoke:**
1. **Milestone after progress** - Every 20 iterations with 10+ consecutive successes
2. **Final milestone** - When goal is achieved and at least 5 iterations since last commit

**Implementation:**
```typescript
private async performCommit(context: CommandContext, goal: string): Promise<void> {
  this.info('💾 Auto-commit triggered (milestone)');

  try {
    const result = await this.commitCommand.execute(context, {
      message: `Milestone: ${goal} - iteration ${this.iterations}`,
      push: false // Don't auto-push by default
    });
    
    if (result.success) {
      this.success('Commit created - milestone saved to version history');
    } else {
      this.warn('Commit failed (continuing anyway)');
    }
    
    this.lastCommitIteration = this.iterations;
  } catch (error) {
    this.warn('Commit failed (continuing anyway)');
  }
}
```

**Claude Best Practice:** Use commits for permanent version history and collaboration, when work is stable and ready to share.

### `/compact` - Context Optimization

**Purpose:** Optimize context window when approaching limits.

**When to invoke:**
1. **Critical context** - When context reaches 80% of max tokens
2. **After checkpoint** - Proactively compact when context is at warning level (70%+)

**Implementation:**
```typescript
private async handleContextCompaction(config: AutoConfig): Promise<void> {
  if (!this.contextManager || this.conversationHistory.length === 0) {
    return;
  }

  const health = this.contextManager.checkContextHealth(this.conversationHistory);

  if (health.status === 'warning') {
    this.warn(`Context at ${health.percentage.toFixed(1)}% - approaching limit`);
  }

  if (health.shouldCompact) {
    this.info(`🔄 Context at ${health.percentage.toFixed(1)}% - compacting...`);
    const { messages, result } = await this.contextManager.compactMessages(
      this.conversationHistory,
      `Goal: ${config.goal}`
    );

    this.conversationHistory = messages;
    this.success(
      `Compacted ${result.originalMessageCount} → ${result.compactedMessageCount} messages ` +
      `(${(result.compressionRatio * 100).toFixed(0)}% of original)`
    );

    // Record compaction to memory
    await this.memory.addContext(
      `Context compacted: ${result.compressionRatio.toFixed(2)}x compression`,
      6
    );

    this.lastCompactIteration = this.iterations;
  }
}
```

**Claude Best Practice:** Proactively compact at checkpoints or natural breakpoints when context window is getting full.

## State Tracking

The `/auto` command tracks several state variables to determine when to invoke skills:

| Variable | Purpose |
|----------|---------|
| `lastCheckpointIteration` | Track when last checkpoint was created |
| `lastCommitIteration` | Track when last commit was created |
| `lastCompactIteration` | Track when last compact was performed |
| `consecutiveSuccesses` | Count successful cycles for milestone detection |
| `consecutiveFailures` | Count failed cycles for recovery checkpointing |

## Autonomous Loop Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Autonomous Loop Iteration                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 1. Handle Context Compaction │
         │    (if context at 80%+)     │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 2. Execute ReAct Cycle      │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 3. Track Success/Failure   │
         │    (update counters)          │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 4. Check Goal Achievement   │
         └────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │ 5. Invoke Skills            │
         │    • Checkpoint?            │
         │    • Commit?                │
         │    • Compact? (at checkpoint)  │
         └────────────────────────────────┘
                          │
                          ▼
                    (Continue loop)
```

## Configuration Options

The `/auto` command supports the following configuration options:

| Option | Type | Default | Description |
|---------|--------|----------|-------------|
| `goal` | string | required | The goal to achieve |
| `maxIterations` | number | 50 | Maximum number of iterations |
| `checkpointThreshold` | number | 10 | Iterations between checkpoints |
| `model` | string | 'auto-routed' | LLM model to use |
| `verbose` | boolean | false | Enable verbose output |

## Example Usage

```bash
# Basic usage
komplete auto "Implement user authentication"

# With custom checkpoint threshold
komplete auto "Build REST API" --checkpoint-threshold 5

# With specific model
komplete auto "Debug login issue" --model claude-sonnet-4.5

# Verbose mode
komplete auto "Refactor database" --verbose
```

## References

- [Claude Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Code Checkpoints](https://code.claude.com/docs/en/checkpointing)
- [Claude Code 2.0: Checkpoints, Subagents, and Autonomous Coding](https://skywork.ai/blog/claude-code-2-0-checkpoints-subagents-autonomous-coding/)
- [Claude Code Best Practices](https://htdocs.dev/posts/claude-code-best-practices-and-pro-tips/)
