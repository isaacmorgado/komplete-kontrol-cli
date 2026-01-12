---
description: Distributed agent swarms for parallel task execution
argument-hint: "[action] [task...]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Task", "TodoWrite"]
---

# Distributed Agent Swarms

Launch multiple Claude instances working in parallel on different aspects of a complex task.

## Usage

```
/swarm spawn <count> <task-description>
/swarm status
/swarm collect
/swarm terminate
```

## Commands

### spawn <count> <task>
Launch N parallel agent instances
- Each agent gets a portion of the task
- Agents work independently with shared memory
- Results aggregated automatically

### status
Check status of all running swarm agents

### collect
Collect and merge results from all agents

### terminate
Stop all swarm agents gracefully

## How It Works

1. **Task Decomposition**: Breaks complex task into parallel sub-tasks
2. **Agent Spawning**: Launches multiple Claude instances
3. **Work Distribution**: Assigns sub-tasks to agents
4. **Shared Memory**: Agents can read (not write) shared context
5. **Result Aggregation**: Combines outputs from all agents
6. **Consensus**: Resolves conflicts through voting or merging

## Example Workflows

### Parallel Testing
```bash
/swarm spawn 5 "Run comprehensive test suite in parallel"
# Agent 1: Unit tests
# Agent 2: Integration tests
# Agent 3: E2E tests
# Agent 4: Performance tests
# Agent 5: Security tests
```

### Multi-Feature Development
```bash
/swarm spawn 3 "Implement user management system"
# Agent 1: Backend API endpoints
# Agent 2: Frontend components
# Agent 3: Database migrations + tests
```

### Documentation Generation
```bash
/swarm spawn 4 "Generate complete project documentation"
# Agent 1: API documentation
# Agent 2: Architecture docs
# Agent 3: User guides
# Agent 4: Developer setup guides
```

## Configuration

```bash
export SWARM_MAX_AGENTS="10"
export SWARM_SHARED_MEMORY="true"
export SWARM_CONSENSUS_METHOD="voting"  # or "merge", "first-wins"
```

## Features

- ✅ Parallel execution (2-10 agents)
- ✅ Task decomposition
- ✅ Shared read-only memory
- ✅ Result aggregation
- ✅ Conflict resolution
- ✅ Progress monitoring
- ✅ Automatic cleanup

## Safety

- Agents cannot interfere with each other's work
- All operations logged individually
- Rollback possible if consensus fails
- Resource limits per agent
- Timeout enforcement

## Integration

Works with:
- `/auto` - Spawn swarms autonomously when beneficial
- `/checkpoint` - Synchronized checkpoints across swarm
- Memory system - Shared context for all agents
