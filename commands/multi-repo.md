---
description: Multi-repository orchestration and coordination
argument-hint: "[action] [repos...]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Task"]
---

# Multi-Repo Orchestration

Coordinate work across multiple repositories with dependency tracking, synchronized operations, and cross-repo memory.

## Usage

```
/multi-repo status
/multi-repo add <path1> <path2> ...
/multi-repo sync
/multi-repo checkpoint "message"
/multi-repo exec "<command>"
```

## Commands

### status
Shows all registered repositories and their status

### add <paths...>
Register repositories for orchestration

### sync
Synchronize all repositories (pull latest, check status)

### checkpoint <message>
Create synchronized checkpoint across all repos

### exec <command>
Execute command in all repositories

## How It Works

1. **Repository Registry**: Maintains list of related repos
2. **Dependency Tracking**: Understands relationships between repos
3. **Synchronized Operations**: Checkpoints, commits, pushes across repos
4. **Cross-Repo Memory**: Shared context about multi-repo projects
5. **Parallel Execution**: Operates on independent repos in parallel

## Configuration

```bash
export MULTI_REPO_DIR="$HOME/.claude/multi-repo"
export MULTI_REPO_PARALLEL="true"
```

## Example Workflow

```bash
# Register related repositories
/multi-repo add ~/projects/frontend ~/projects/backend ~/projects/shared

# Check status of all repos
/multi-repo status

# Make changes across repos
# ... (autonomous work)

# Synchronized checkpoint
/multi-repo checkpoint "Implemented authentication flow across services"

# Execute tests in all repos
/multi-repo exec "npm test"
```

## Features

- ✅ Multi-repo registry
- ✅ Dependency graph
- ✅ Synchronized checkpoints
- ✅ Cross-repo memory
- ✅ Parallel operations
- ✅ Status aggregation

## Integration

Works seamlessly with:
- `/checkpoint` - Extended to handle multi-repo
- `/auto` - Autonomous mode across multiple repos
- Memory system - Cross-repo context

## Safety

- Never force-pushes without confirmation
- Checks for uncommitted changes before operations
- Validates all repos accessible before sync
- Logs all multi-repo operations
