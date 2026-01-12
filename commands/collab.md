---
description: Real-time collaboration with multiple users and Claude
argument-hint: "[action]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob"]
---

# Real-Time Collaboration

Enable multiple users to work simultaneously with Claude on the same project with conflict resolution and synchronized state.

## Usage

```
/collab start [session-name]
/collab join <session-id>
/collab status
/collab sync
/collab leave
```

## Commands

### start [session-name]
Create new collaboration session

### join <session-id>
Join existing collaboration session

### status
Show all active collaborators and their activity

### sync
Synchronize state with all collaborators

### leave
Exit collaboration session gracefully

## How It Works

1. **Session Management**: Creates shared workspace
2. **State Synchronization**: Keeps all users in sync
3. **Conflict Resolution**: Merges concurrent changes
4. **Activity Tracking**: Shows who's doing what
5. **Shared Memory**: All users see same context
6. **Turn-Taking**: Manages concurrent requests to Claude

## Features

### Conflict Resolution
- File-level locking during edits
- Automatic merge of non-conflicting changes
- Manual resolution prompts for conflicts
- Change history for all users

### Activity Awareness
- See what other users are working on
- Real-time file editing indicators
- Shared todo list
- Collaborative checkpoints

### Access Control
- Session ownership
- Permission levels (owner, editor, viewer)
- Invite-only sessions
- Activity audit log

## Example Workflow

```bash
# User 1 (Project Lead)
/collab start "auth-implementation"
# Session ID: collab_abc123

# User 2 (Developer)
/collab join collab_abc123

# Both users see same context
# User 1: "Claude, implement the login endpoint"
# User 2: "Claude, add tests for login"

# Automatic coordination
# - No conflicts if working on different files
# - Merge conflicts resolved automatically where possible
# - Manual intervention only when necessary

# Synchronized checkpoint
/collab sync
/checkpoint "Completed authentication implementation (collaborative session)"
```

## Configuration

```bash
export COLLAB_PORT="8765"
export COLLAB_HOST="localhost"
export COLLAB_TIMEOUT="3600"  # 1 hour
```

## Safety

- All changes tracked per user
- Rollback to any point in session
- Session isolation
- Encrypted communication (if network-based)
- Activity logging

## Integration

- `/auto` - Collaborative autonomous mode
- `/checkpoint` - Includes all users' contributions
- Memory system - Shared context across all users
