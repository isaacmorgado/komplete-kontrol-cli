# Autonomous Build Loop - Quick Start Guide

## Get Started in 5 Minutes

### Step 1: Verify Installation (1 min)

```bash
# Check hooks are executable
ls -la hooks/auto-continue.sh hooks/memory-manager.sh hooks/coordinator.sh

# All should have -rwxr-xr-x permissions
```

### Step 2: Start Autonomous Mode (1 min)

In Claude Code, simply type:
```
/auto start
```

Expected response:
```
🤖 AUTONOMOUS MODE ACTIVATED

I will now work fully autonomously:
- Execute tasks without asking for confirmation
- Auto-checkpoint progress every 10 file changes or 5 minutes
- Auto-fix errors (retry up to 3 times)
- Continue until task is complete or blocked

To stop: Say "stop" or run `/auto stop`
```

### Step 3: Monitor Progress (1 min)

Open a terminal and run:
```bash
# Watch auto-continue log
tail -f ~/.claude/auto-continue.log
```

Expected output when triggers:
```
[2026-01-15 09:45:00] Context: 40% (80000/200000)
[2026-01-15 09:45:00] Threshold reached (40% >= 40%) - triggering auto-continue
[2026-01-15 09:45:00] ✅ Memory checkpoint created: MEM-1736900000-12345
```

### Step 4: Work on buildguide.md (2 min)

The system will automatically:
1. Read buildguide.md
2. Find first unchecked section
3. Work on that section
4. Auto-checkpoint at thresholds
5. Continue to next section
6. Repeat until complete

You can check progress:
```bash
# See current checkpoint
~/.claude/hooks/memory-manager.sh list | head -1

# See build state
cat .claude/current-build.local.md
```

### Step 5: Stop When Done (Optional)

```
/auto stop
```

## Customization (Optional)

### Adjust Checkpoint Frequency

```bash
# More frequent checkpoints
export CLAUDE_FILE_CHANGE_THRESHOLD=5
export CLAUDE_TIME_THRESHOLD_MINUTES=3

# Less frequent checkpoints
export CLAUDE_FILE_CHANGE_THRESHOLD=20
export CLAUDE_TIME_THRESHOLD_MINUTES=10
```

### Disable Alternative Triggers

```bash
export CLAUDE_ALTERNATIVE_TRIGGERS=false
```

## Troubleshooting

### Auto-continue not triggering?

```bash
# Check log
tail -50 ~/.claude/auto-continue.log

# Common issues:
# - Context data unavailable → Alternative triggers should activate
# - Thresholds not met → Adjust CLAUDE_* environment variables
# - Disabled → Remove .claude/auto-continue-disabled file
```

### Checkpoint failing?

```bash
# Test memory-manager
~/.claude/hooks/memory-manager.sh checkpoint "Test"

# Check logs
tail -20 ~/.claude/memory-manager.log
```

## Documentation

- **Full Guide**: AUTO-BUILD-LOOP-GUIDE.md
- **Testing**: TESTING-AND-MONITORING-GUIDE.md
- **Enhancements**: AUTO-CONTINUE-ENHANCEMENTS.md
- **Summary**: AUTONOMOUS-BUILD-LOOP-SUMMARY.md

## Support

For issues, check:
1. `~/.claude/auto-continue.log` - Hook execution log
2. `~/.claude/memory-manager.log` - Memory manager log
3. `TESTING-AND-MONITORING-GUIDE.md` - Troubleshooting guide

---

**Start now**: `/auto start`
**Monitor**: `tail -f ~/.claude/auto-continue.log`
**Complete**: Let it work through buildguide.md autonomously
