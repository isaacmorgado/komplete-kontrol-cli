# V2 Integration Guide

Complete guide for how V2 features integrate with the existing system.

---

## ✅ Fully Integrated Features

These features are **wired and working** automatically:

### 1. Context Event Tracking ✅

**Hook**: `hooks/context-event-tracker.sh`
**Integration Point**: `hooks/auto-continue.sh` lines 83-114
**Trigger**: Automatic on every compaction/truncation

**How it works**:
```bash
# auto-continue.sh automatically:
1. Records token count before compaction
2. Attempts memory compaction
3. Logs event with before/after tokens
4. If compaction fails, triggers sliding window
5. Logs sliding window event
```

**View events**:
```bash
~/.claude/hooks/context-event-tracker.sh stats
~/.claude/hooks/context-event-tracker.sh recent 10
```

---

### 2. Sliding Window Fallback ✅

**Hook**: `hooks/sliding-window.sh`
**Integration Point**: `hooks/auto-continue.sh` lines 96-114
**Trigger**: Automatic when compaction fails

**How it works**:
```bash
# auto-continue.sh automatically:
1. Tries memory compaction first
2. If fails, calculates truncation strategy
3. Applies sliding window based on context usage
4. Logs event to context-event-tracker
```

**Manual usage**:
```bash
~/.claude/hooks/sliding-window.sh strategy 180000 200000
```

---

### 3. Build Trigger Fix ✅

**Hook**: `hooks/autonomous-command-router.sh`
**Integration Point**: Lines 71-81
**Trigger**: On `build_section_complete` event

**How it works**:
```bash
# Router now:
1. Checks if buildguide.md exists
2. If missing, returns graceful error
3. If exists, proceeds with checkpoint
```

**Test**:
```bash
~/.claude/hooks/autonomous-command-router.sh execute build_section_complete
```

---

### 4. Message-Based Checkpoints ✅

**Hook**: `hooks/message-tracker.sh`
**Integration Point**: `hooks/autonomous-command-router.sh` lines 83-91
**Trigger**: Manual or via wrapper script

**How to integrate** (choose one):

#### Option A: Call from Claude Code (Recommended)
```bash
# Add to your workflow:
~/.claude/hooks/message-tracker.sh init  # Start of session
~/.claude/hooks/message-tracker.sh increment user  # After each message
~/.claude/hooks/message-tracker.sh increment assistant
```

#### Option B: Via Pre-Prompt Hook (Future)
Create `~/.claude/hooks/pre-prompt.sh`:
```bash
#!/bin/bash
~/.claude/hooks/message-tracker.sh increment user
cat  # Pass through input
```

**Check status**:
```bash
~/.claude/hooks/message-tracker.sh status
# Output: {"messagesUntilNextCheckpoint": 15, ...}
```

---

### 5. Swarm Orchestrator ✅

**Hook**: `hooks/swarm-orchestrator.sh`
**Integration**: Via `/swarm` command
**Trigger**: Manual command

**Usage**:
```bash
# Backend is implemented
~/.claude/hooks/swarm-orchestrator.sh spawn 3 "Run comprehensive tests"
~/.claude/hooks/swarm-orchestrator.sh status
~/.claude/hooks/swarm-orchestrator.sh collect
```

**In Claude Code**:
```
/swarm spawn 3 "Run comprehensive tests"
```

Behind the scenes calls:
```bash
~/.claude/hooks/swarm-orchestrator.sh spawn 3 "Run comprehensive tests"
```

---

## 📝 Manual Integration Features

These features require explicit calls (by design):

### 6. Plan → Think → Action ✅

**Hook**: `hooks/plan-think-act.sh`
**When to use**: Before starting significant tasks
**Integration**: Manual or via autonomous loop

**Usage**:
```bash
# Before implementing feature
cycle=$(~/.claude/hooks/plan-think-act.sh run "Implement authentication" "Next.js app")

# Extract recommendation
approach=$(echo "$cycle" | jq -r '.action.approach')
first_step=$(echo "$cycle" | jq -r '.action.firstStep')

# Execute based on plan
```

**Future Integration** (in `/auto` skill):
```yaml
# In commands/auto.md, add to workflow:
Before starting task:
1. Run plan-think-act cycle
2. Extract recommended approach
3. Execute using that approach
```

---

### 7. Environmental Feedback Learning ✅

**Hook**: `hooks/feedback-learning.sh`
**When to use**: After completing actions
**Integration**: Manual recording + automatic recommendation

**Usage**:
```bash
# After completing action
~/.claude/hooks/feedback-learning.sh record \
    implementation "Add authentication" "research-first" success 1.0

# Before starting new action
recommendation=$(~/.claude/hooks/feedback-learning.sh recommend implementation "Add payment")
strategy=$(echo "$recommendation" | jq -r '.recommendation')

# Use recommended strategy
```

**Future Integration** (in autonomous loop):
```bash
# At start of task
strategy=$(feedback-learning.sh recommend "$task_type" "$context")

# Execute task using strategy

# At end of task
feedback-learning.sh record "$task_type" "$context" "$strategy" "$outcome" "$reward"
```

---

### 8. Isolated Sandbox ✅

**Hook**: `hooks/sandbox-executor.sh`
**When to use**: Executing untrusted or experimental code
**Integration**: Manual or via safety wrapper

**Usage**:
```bash
# Execute safely
result=$(~/.claude/hooks/sandbox-executor.sh exec "python test.py")
success=$(echo "$result" | jq -r '.success')
output=$(echo "$result" | jq -r '.stdout')
```

**Requirements**: Docker installed and running

**Future Integration** (safety wrapper):
```bash
# In autonomous mode, wrap code execution:
if [[ "$AUTONOMOUS_MODE" == "true" && "$SAFETY_MODE" == "strict" ]]; then
    sandbox-executor.sh exec "$command"
else
    bash -c "$command"
fi
```

---

## 🔮 Specification-Only Features

These have documentation but need full implementation:

### 9. Multi-Repo Orchestration 📋
**Command**: `/multi-repo`
**Status**: Specification complete, backend needed
**TODO**: Implement `hooks/multi-repo-orchestrator.sh`

### 10. Real-Time Collaboration 📋
**Command**: `/collab`
**Status**: Specification complete, server needed
**TODO**: Implement collaboration server

### 11. Voice Commands 📋
**Command**: `/voice`
**Status**: Specification complete, speech engine needed
**TODO**: Integrate Whisper or cloud speech API

### 12. Custom Personalities ✅
**Hook**: `hooks/personality-loader.sh`
**Integration**: Via `/personality` command
**Status**: Working - 3 built-in personalities implemented
**Usage**: Manual command

---

## 🔧 How to Add Full Integration

### For Plan-Think-Act

**Edit**: `~/.claude/hooks/autonomous-orchestrator-v2.sh`

Add before task execution:
```bash
# Run planning cycle
if [[ -x "${SCRIPT_DIR}/plan-think-act.sh" ]]; then
    CYCLE=$("${SCRIPT_DIR}/plan-think-act.sh" run "$GOAL" "$CONTEXT" "implementation")
    APPROACH=$(echo "$CYCLE" | jq -r '.action.approach')
    log "Using approach: $APPROACH"
fi
```

### For Feedback Learning

**Edit**: `~/.claude/hooks/autonomous-orchestrator-v2.sh`

Add after task completion:
```bash
# Record outcome
if [[ -x "${SCRIPT_DIR}/feedback-learning.sh" ]]; then
    "${SCRIPT_DIR}/feedback-learning.sh" record \
        "$TASK_TYPE" "$CONTEXT" "$STRATEGY" "$OUTCOME" "$REWARD"
fi
```

### For Message Tracking

**Create**: `~/.claude/hooks/pre-prompt.sh`

```bash
#!/bin/bash
set -euo pipefail

TRACKER="${HOME}/.claude/hooks/message-tracker.sh"

if [[ -x "$TRACKER" ]]; then
    "$TRACKER" increment user 2>/dev/null || true
fi

# Pass through input
cat
```

**Create**: `~/.claude/hooks/post-response.sh`

```bash
#!/bin/bash
set -euo pipefail

TRACKER="${HOME}/.claude/hooks/message-tracker.sh"

if [[ -x "$TRACKER" ]]; then
    "$TRACKER" increment assistant 2>/dev/null || true
fi

# Pass through input
cat
```

---

## 📊 Integration Status Matrix

| Feature | Hook | Auto-Integrated | Manual Use | Backend |
|---------|------|-----------------|------------|---------|
| Context Events | ✅ | ✅ auto-continue | ✅ CLI | ✅ Complete |
| Sliding Window | ✅ | ✅ auto-continue | ✅ CLI | ✅ Complete |
| Build Trigger Fix | ✅ | ✅ router | N/A | ✅ Complete |
| Message Checkpoints | ✅ | ⚠️ Need hook | ✅ CLI | ✅ Complete |
| Swarm | ✅ | N/A | ✅ /swarm | ✅ Complete |
| Plan-Think-Act | ✅ | ⚠️ Need integration | ✅ CLI | ✅ Complete |
| Feedback Learning | ✅ | ⚠️ Need integration | ✅ CLI | ✅ Complete |
| Sandbox | ✅ | ⚠️ Optional | ✅ CLI | ✅ Complete |
| Multi-Repo | 📋 | N/A | 📋 /multi-repo | ❌ Spec only |
| Collaboration | 📋 | N/A | 📋 /collab | ❌ Spec only |
| Voice | 📋 | N/A | 📋 /voice | ❌ Spec only |
| Personalities | ✅ | N/A | ✅ /personality | ✅ Complete |

**Legend**:
- ✅ = Fully working
- ⚠️ = Works but needs wiring
- 📋 = Specification only
- ❌ = Not implemented

---

## 🚀 Quick Start for Integrated Features

### Context Management (Automatic)
```bash
# Just use /auto - everything automatic
/auto

# Features work automatically:
# - Event tracking on compaction
# - Sliding window fallback
# - All logged to ~/.claude/logs/
```

### Message Tracking (Semi-Automatic)
```bash
# Initialize at session start
~/.claude/hooks/message-tracker.sh init

# Check progress anytime
~/.claude/hooks/message-tracker.sh status
```

### Swarm (Manual Command)
```
/swarm spawn 3 "Comprehensive testing"
/swarm status
/swarm collect
```

### Plan-Think-Act (Manual Before Tasks)
```bash
# Before starting work
cycle=$(~/.claude/hooks/plan-think-act.sh run "Build feature X" "Current context")
approach=$(echo "$cycle" | jq -r '.action.approach')
# Use approach in implementation
```

### Feedback Learning (Manual Record)
```bash
# After completing work
~/.claude/hooks/feedback-learning.sh record \
    implementation "Feature X" "approach-used" success 1.0 "Details"

# Before next task
recommendation=$(~/.claude/hooks/feedback-learning.sh recommend implementation)
```

---

## 📝 Configuration

### Environment Variables

```bash
# Message tracking
export MESSAGE_CHECKPOINT_INTERVAL=50

# Sliding window
export SLIDING_WINDOW_TARGET_PERCENT=60

# Sandbox
export SANDBOX_IMAGE="ubuntu:22.04"
export SANDBOX_TIMEOUT=300

# Swarm
export SWARM_MAX_AGENTS=10
export SWARM_CONSENSUS_METHOD=voting
```

---

## 🎯 Recommended Integration Order

1. ✅ **Already Done**: Context events, sliding window, build fix
2. **Next**: Message tracking pre/post hooks (10 min)
3. **Then**: Plan-think-act in orchestrator (20 min)
4. **Finally**: Feedback learning in orchestrator (20 min)

**Total time to full integration**: ~1 hour

---

## 🔍 Testing Integration

```bash
# Test context events
tail -f ~/.claude/logs/context-events/events.jsonl

# Test sliding window
~/.claude/hooks/sliding-window.sh strategy 190000 200000

# Test message tracking
~/.claude/hooks/message-tracker.sh status

# Test swarm
~/.claude/hooks/swarm-orchestrator.sh spawn 2 "Test task"
~/.claude/hooks/swarm-orchestrator.sh status
~/.claude/hooks/swarm-orchestrator.sh collect

# Test plan-think-act
~/.claude/hooks/plan-think-act.sh run "Test goal" "Test context"

# Test feedback learning
~/.claude/hooks/feedback-learning.sh stats
```

---

## ✅ Integration Checklist

- [x] Context event tracking integrated into auto-continue
- [x] Sliding window integrated into auto-continue
- [x] Build trigger fix integrated into router
- [x] Message checkpoint trigger added to router
- [x] Swarm backend implemented and working
- [ ] Message tracker pre/post hooks (optional)
- [ ] Plan-think-act in orchestrator (optional)
- [ ] Feedback learning in orchestrator (optional)
- [ ] Multi-repo backend (future)
- [ ] Collaboration server (future)
- [ ] Voice interface (future)
- [ ] Personality system (future)

**Status**: Core features integrated ✅
**Optional**: Enhanced autonomous loop integration
**Future**: Advanced feature implementations
