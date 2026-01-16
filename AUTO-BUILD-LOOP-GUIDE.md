# Autonomous Build Loop - Complete Usage Guide

## Overview

The autonomous build loop is **already fully implemented** in your hooks directory. This system enables 100% hands-off operation where Claude works through a buildguide.md from start to end without any manual intervention.

## System Architecture

### Core Components

1. **auto-continue.sh** - The loop orchestrator
   - Monitors context usage at 40% threshold
   - Triggers memory compaction
   - Auto-executes /checkpoint
   - Generates continuation prompts
   - Feeds prompt back to keep working

2. **autonomous-command-router.sh** - The decision engine
   - Analyzes situation (context, build state, file changes)
   - Determines when to execute /checkpoint
   - Returns JSON signal: `{"execute_skill": "checkpoint", "autonomous": true}`
   - Enables autonomous skill execution

3. **memory-manager.sh** - Memory management
   - Compacts memory to save tokens
   - Creates checkpoints for recovery
   - Manages context budget

4. **/checkpoint command** - State persistence
   - Saves progress to CLAUDE.md
   - Updates buildguide.md (marks sections complete)
   - Outputs continuation prompt for next session

### The Autonomous Loop

```
User: "/auto start"
  ↓
Claude reads buildguide.md
  ↓
Works on first unchecked section
  ↓
[Context fills to 40%]
  ↓
auto-continue.sh triggers
  ↓
→ memory-manager.sh context-compact
  ↓
→ autonomous-command-router.sh execute checkpoint_context
  ↓
→ Returns: {"execute_skill": "checkpoint", "autonomous": true}
  ↓
auto-continue.sh outputs continuation prompt with execution signal
  ↓
Claude immediately executes /checkpoint
  ↓
/checkpoint updates:
  - CLAUDE.md (session state)
  - buildguide.md (marks section complete)
  - Outputs continuation prompt
  ↓
Context clears automatically
  ↓
Claude continues from continuation prompt
  ↓
Works on next unchecked section
  ↓
[Loop repeats until all sections checked]
  ↓
Build complete - stops
```

## Usage Instructions

### Step 1: Prepare Your Build Guide

Create a `buildguide.md` in your project root with this structure:

```markdown
# Build Guide for [Project Name]

## Build Sections

### Phase 1: Foundation

- [ ] Task 1
  - Subtask 1.1
  - Subtask 1.2

- [ ] Task 2
  - Subtask 2.1

### Phase 2: Core Features

- [ ] Task 3
  - ...

## Notes

Optional: Add implementation notes, architecture references, etc.
```

**Key points:**
- Use `- [ ]` for unchecked sections (spaces inside brackets)
- Use `- [x]` for completed sections
- Claude will process sections in order
- Each section should be clear and actionable

### Step 2: Activate Autonomous Mode

In Claude Code, simply run:

```
/auto start
```

Or if providing a goal:

```
/auto "Work through buildguide.md autonomously from start to end"
```

### Step 3: Walk Away

That's it! The system will:

✅ Read buildguide.md for first unchecked section
✅ Work on that section autonomously
✅ Auto-compact memory at 40% context
✅ Auto-execute /checkpoint to save progress
✅ Auto-update buildguide.md (mark section complete)
✅ Auto-generate continuation prompt
✅ Auto-clear context (save tokens)
✅ Auto-continue with continuation prompt
✅ Move to next section
✅ Repeat until all sections are checked

**Zero manual intervention required.**

## Autonomous Behaviors

### What Happens Automatically

1. **Context Management**
   - At 40% context usage: Auto-compacts memory
   - Saves tokens while preserving essential context
   - Creates checkpoint before compaction

2. **Checkpoint Execution**
   - Automatically executes `/checkpoint` at context threshold
   - No permission needed (autonomous mode)
   - Updates CLAUDE.md and buildguide.md

3. **Continuation Prompts**
   - Automatically generates focused continuation prompts
   - Includes next section from buildguide.md
   - Includes current build state
   - Includes memory checkpoint ID

4. **Context Clearing**
   - Automatically clears context after checkpoint
   - Saves tokens for long builds
   - Maintains progress via CLAUDE.md

5. **Build Progress Tracking**
   - Automatically marks sections complete in buildguide.md
   - Moves to next unchecked section
   - Updates `.claude/current-build.local.md` with progress

### Quality & Safety

The system includes:

- **Quality gates** - Auto-evaluates output quality
- **Error recovery** - Retries failed actions (3 attempts)
- **Bounded autonomy** - Blocks dangerous actions (force push, etc.)
- **Constitutional AI** - Checks outputs for safety issues
- **Debug orchestrator** - Prevents regressions when fixing bugs

## Verification Checklist

To verify the system is working:

- [ ] `hooks/auto-continue.sh` exists and is executable
- [ ] `hooks/autonomous-command-router.sh` exists and is executable
- [ ] `hooks/memory-manager.sh` exists and is executable
- [ ] `commands/checkpoint.md` exists
- [ ] `commands/auto.md` exists

All hooks should be in your local project at `hooks/` directory.

## Example Workflow

### 1. Create Build Guide

```markdown
# My Project Build Guide

## Build Sections

### Phase 1

- [ ] Setup project structure
- [ ] Implement authentication
- [ ] Add database layer

### Phase 2

- [ ] Build REST API
- [ ] Add frontend
- [ ] Write tests

### Phase 3

- [ ] Deploy
- [ ] Document
```

### 2. Start Autonomous Mode

```
/auto start
```

### 3. What Happens

Claude will:
1. Read "Setup project structure"
2. Create directories, initialize package.json, etc.
3. [Context hits 40%]
4. Auto-compact memory
5. Auto-execute /checkpoint
6. Mark "Setup project structure" as complete: `- [x] Setup project structure`
7. Clear context
8. Generate continuation: "Next section: Implement authentication"
9. Continue working
10. Repeat until all sections marked complete

### 4. Result

You return to a fully built project:
- ✅ All tasks completed
- ✅ buildguide.md all sections checked
- ✅ CLAUDE.md with complete session history
- ✅ Zero manual intervention

## Troubleshooting

### Auto-continue not triggering

**Check:**
- Is `~/.claude/hooks/auto-continue.sh` executable?
- Is autonomous mode active (`~/.claude/autonomous-mode.active` exists)?
- Is context reaching 40%?

**Fix:**
```bash
chmod +x hooks/auto-continue.sh
chmod +x hooks/autonomous-command-router.sh
chmod +x hooks/memory-manager.sh
```

### Checkpoint not executing autonomously

**Check:**
- Is `autonomous-command-router.sh` returning the right signal?
- Is Claude recognizing the `<command-name>` tag?

**Test:**
```bash
# Test router directly
hooks/autonomous-command-router.sh execute checkpoint_context "80000/200000"
# Should return: {"execute_skill": "checkpoint", ...}
```

### Build not progressing

**Check:**
- Does `buildguide.md` exist in project root?
- Are sections formatted correctly: `- [ ] Section Name`?

**Fix:**
- Ensure sections use markdown checkbox format
- Check for typos in section names
- Verify buildguide.md is in project root (not subdirectory)

## Advanced Features

### Multi-Agent Swarm

For complex sections, the system can auto-spawn swarms:

```
# If section has 3+ independent subtasks
- [ ] Implement feature X
  - Backend API
  - Frontend UI
  - Database schema
  - Tests

System will:
1. Detect parallelizable tasks
2. Auto-spawn swarm of 3 agents
3. Each agent works independently
4. Auto-merge results
5. Continue to next section
```

### Debug Orchestrator

When fixing bugs in autonomous mode:

```
System will:
1. Create snapshot before fix
2. Search bug fix memory
3. Search GitHub for similar issues
4. Apply fix
5. Create snapshot after fix
6. Detect regressions
7. If regression: Auto-revert + try alternative
8. If clean: Record fix to memory
```

### Quality Gates

After each section completion:

```
System will:
1. Auto-evaluate output quality (LLM-as-Judge)
2. If score < 7.0: Auto-revise
3. Re-evaluate until passing
4. Only then mark section complete
```

## Summary

The autonomous build loop is **production-ready and fully functional** in your project:

✅ **Hooks installed and verified**
✅ **Integration points working**
✅ **Auto-continuation loop operational**
✅ **Zero configuration needed**
✅ **100% hands-off operation**

**To use:**
1. Create `buildguide.md` with your tasks
2. Run `/auto start`
3. Walk away
4. Return to completed project

The system handles everything else automatically.
