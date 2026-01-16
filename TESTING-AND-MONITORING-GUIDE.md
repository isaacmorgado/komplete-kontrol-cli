# Autonomous Build Loop - Testing and Monitoring Guide

## Date: 2026-01-15
## Project: komplete-kontrol-cli

## Pre-Test Checklist

### System Requirements
- [x] All hooks installed and executable
- [x] auto-continue.sh enhanced with alternative triggers
- [x] Autonomous mode activation/deactivation working
- [x] Buildguide.md created for komplete-kontrol-cli
- [x] Documentation complete

### Environment Setup
- [ ] Set custom thresholds (optional)
- [ ] Review configuration options
- [ ] Understand monitoring commands
- [ ] Prepare test workspace

## Testing Phase 1: Basic Autonomous Mode

### Test 1.1: Autonomous Mode Activation
**Objective**: Verify autonomous mode activates correctly

**Steps**:
```bash
# 1. Activate autonomous mode
/auto start

# 2. Verify activation
ls -la ~/.claude/autonomous-mode.active

# 3. Check status
cat ~/.claude/autonomous-mode.active
```

**Expected Results**:
- ✅ `~/.claude/autonomous-mode.active` file created
- ✅ File contains timestamp
- ✅ Autonomous mode confirmed

**Monitoring**:
```bash
# Watch auto-continue log
tail -f ~/.claude/auto-continue.log
```

### Test 1.2: Buildguide.md Parsing
**Objective**: Verify auto-continue reads buildguide.md correctly

**Steps**:
```bash
# 1. Check buildguide.md has unchecked sections
grep '^\- \[ \]' buildguide.md

# 2. Check local state file
cat .claude/auto-continue.local.md 2>/dev/null || echo "Not created yet"
```

**Expected Results**:
- ✅ At least one unchecked section: `- [ ]`
- ✅ Local state file exists after first checkpoint
- ✅ State file contains iteration count

### Test 1.3: Manual Checkpoint
**Objective**: Verify checkpoint command works

**Steps**:
```bash
# 1. Run checkpoint manually
/checkpoint

# 2. Verify checkpoint created
~/.claude/hooks/memory-manager.sh list | head -5

# 3. Verify CLAUDE.md updated
grep "## Session" CLAUDE.md | tail -1
```

**Expected Results**:
- ✅ Checkpoint ID returned (e.g., MEM-1736900000-12345)
- ✅ CLAUDE.md updated with session summary
- ✅ Buildguide.md section marked complete

## Testing Phase 2: Context Window Trigger

### Test 2.1: Context Threshold Detection
**Objective**: Verify auto-continue triggers at 40% context

**Prerequisites**:
- Claude Code session must provide context window data
- Context usage must reach 40% threshold

**Steps**:
```bash
# 1. Monitor auto-continue log in separate terminal
tail -f ~/.claude/auto-continue.log

# 2. In Claude Code:
# - Activate autonomous mode: /auto start
# - Work through buildguide.md sections
# - Wait for context to reach 40%

# 3. Watch for trigger in log
# Expected: "Context: 40% (80000/200000)"
# Expected: "Threshold reached (40% >= 40%) - triggering auto-continue"
```

**Expected Results**:
```
[2026-01-15 09:45:00] Context data available: true
[2026-01-15 09:45:00] Context: 40% (80000/200000)
[2026-01-15 09:45:00] Threshold reached (40% >= 40%) - triggering auto-continue
[2026-01-15 09:45:00] ✅ Memory checkpoint created: MEM-1736900000-12345
[2026-01-15 09:45:00] Wrote continuation prompt to ~/.claude/continuation-prompt.md
[2026-01-15 09:45:00] Auto-continue triggered - iteration 1 (trigger: context_window)
```

**Success Criteria**:
- ✅ Context data detected: true
- ✅ Threshold triggered at 40%
- ✅ Memory checkpoint created
- ✅ Continuation prompt written
- ✅ Iteration incremented

## Testing Phase 3: Alternative Triggers

### Test 3.1: File-Based Trigger
**Objective**: Verify file-based trigger works when no context data

**Prerequisites**:
- Claude Code NOT providing context window data
- File changes tracked by coordinator

**Steps**:
```bash
# 1. Simulate no context data
# Create test files to reach threshold
for i in {1..12}; do touch test-$i.ts; done

# 2. Track changes
~/.claude/hooks/coordinator.sh track-changes 12

# 3. Verify state
cat ~/.claude/coordination/state.json | jq '.fileChanges'

# 4. Check log
tail -20 ~/.claude/auto-continue.log
```

**Expected Log Output**:
```
[2026-01-15 09:50:00] Context data available: false
[2026-01-15 09:50:00] ⚠️  No context window data received from Claude Code
[2026-01-15 09:50:00] 🔄 Attempting alternative triggers...
[2026-01-15 09:50:00] File changes tracked: 12 (threshold: 10)
[2026-01-15 09:50:00] 📁 File change threshold reached (12 >= 10)
[2026-01-15 09:50:00] ✅ Memory checkpoint created: MEM-1736900000-67890
[2026-01-15 09:50:00] Auto-continue triggered - iteration 2 (trigger: alternative_trigger)
```

**Success Criteria**:
- ✅ Context data detected: false
- ✅ Alternative triggers activated
- ✅ File changes threshold reached
- ✅ Checkpoint created via file trigger

### Test 3.2: Time-Based Trigger
**Objective**: Verify time-based trigger works

**Prerequisites**:
- Claude Code NOT providing context window data
- File changes not meeting threshold

**Steps**:
```bash
# 1. Set low time threshold for testing
export CLAUDE_TIME_THRESHOLD_MINUTES=1

# 2. Create initial checkpoint state
mkdir -p .claude
cat > .claude/auto-continue.local.md <<EOF
---
active: true
lastCheckpointTime: $(date -v-2M +%s 2>/dev/null || date -d '2 minutes ago' +%s)
lastCheckpointMessages: 0
---
EOF

# 3. Wait 1+ minutes
echo "Waiting for time threshold..."
sleep 65

# 4. Check log
tail -20 ~/.claude/auto-continue.log
```

**Expected Log Output**:
```
[2026-01-15 09:52:00] Context data available: false
[2026-01-15 09:52:00] ⚠️  No context window data received from Claude Code
[2026-01-15 09:52:00] 🔄 Attempting alternative triggers...
[2026-01-15 09:52:00] Time since last checkpoint: 65s (threshold: 60s)
[2026-01-15 09:52:00] ⏱️  Time threshold reached (65s >= 60s)
[2026-01-15 09:52:00] ✅ Memory checkpoint created: MEM-1736900120-12345
```

**Success Criteria**:
- ✅ Time difference calculated correctly
- ✅ Time threshold reached
- ✅ Checkpoint created via time trigger

### Test 3.3: Message-Based Trigger
**Objective**: Verify message-based trigger works

**Prerequisites**:
- Transcript file available in hook input
- Claude Code NOT providing context window data

**Steps**:
```bash
# 1. Create mock transcript with 12 user messages
mkdir -p /tmp/test-transcript
cat > /tmp/test-transcript/transcript.json <<'EOF'
[
  $(for i in {1..12}; do echo '{"role":"user","message":{"content":[{"text":"Message '$i'"}]}}'; done)
]
EOF

# 2. Test with mock input
echo '{"transcript_path":"/tmp/test-transcript/transcript.json"}' | \
  CLAUDE_ALTERNATIVE_TRIGGERS=true hooks/auto-continue.sh

# 3. Check log
tail -20 ~/.claude/auto-continue.log
```

**Expected Log Output**:
```
[2026-01-15 09:55:00] Context data available: false
[2026-01-15 09:55:00] ⚠️  No context window data received from Claude Code
[2026-01-15 09:55:00] 🔄 Attempting alternative triggers...
[2026-01-15 09:55:00] New messages since last checkpoint: 12 (threshold: 10)
[2026-01-15 09:55:00] 💬 Message threshold reached (12 >= 10)
[2026-01-15 09:55:00] ✅ Memory checkpoint created: MEM-1736900300-98765
```

**Success Criteria**:
- ✅ Message count calculated correctly
- ✅ Message threshold reached
- ✅ Checkpoint created via message trigger

## Testing Phase 4: Full Autonomous Loop

### Test 4.1: End-to-End Autonomous Operation
**Objective**: Verify complete 100% hands-off operation

**Scenario**: Work through entire buildguide.md without manual intervention

**Steps**:
```bash
# Terminal 1: Monitor logs
tail -f ~/.claude/auto-continue.log

# Terminal 2: Monitor coordinator state
watch -n 1 'cat ~/.claude/coordination/state.json | jq .'

# Terminal 3: Monitor checkpoints
watch -n 5 '~/.claude/hooks/memory-manager.sh list | head -3'

# Claude Code:
/auto start
# Then work through buildguide.md sections autonomously
# Monitor context, triggers, checkpoints
```

**Expected Behavior**:
```
[Auto] Starting buildguide.md execution
[Auto] Section 1: Run edge case tests
[Context reaches 40%]
[Auto-continue] Trigger: context_window
[Auto-continue] ✅ Checkpoint created: MEM-12345
[Auto-continue] Continuation prompt written
[Auto] Resuming from continuation prompt
[Auto] Continuing with Section 2
[Context reaches 40% again]
[Auto-continue] Trigger: context_window (or alternative_trigger)
[Auto-continue] ✅ Checkpoint created: MEM-67890
[Auto-continue] Continuation prompt written
[Auto] Continuing with Section 3
[... repeats until all sections complete]
```

**Success Criteria**:
- ✅ Autonomous mode stays active throughout
- ✅ Auto-continue triggers multiple times
- ✅ Multiple checkpoints created
- ✅ Continuation prompts generated correctly
- ✅ No manual intervention required
- ✅ All buildguide.md sections completed

## Monitoring Commands

### Real-Time Monitoring

```bash
# Monitor auto-continue log
tail -f ~/.claude/auto-continue.log

# Monitor coordinator state
watch -n 2 'cat ~/.claude/coordination/state.json | jq .'

# Monitor checkpoints
watch -n 5 '~/.claude/hooks/memory-manager.sh list | head -5'

# Monitor continuation prompt
watch -n 2 'cat ~/.claude/continuation-prompt.md'

# Monitor local state
watch -n 2 'cat .claude/auto-continue.local.md'

# Monitor build state
watch -n 2 'cat .claude/current-build.local.md 2>/dev/null || echo "No build state"'
```

### Status Checks

```bash
# Check autonomous mode status
if [[ -f ~/.claude/autonomous-mode.active ]]; then
    echo "✅ Autonomous mode ACTIVE"
else
    echo "❌ Autonomous mode INACTIVE"
fi

# Check latest checkpoint
~/.claude/hooks/memory-manager.sh list | head -1

# Check context usage estimate
cat .claude/auto-continue.local.md 2>/dev/null | grep last_percent

# Check file changes tracked
cat ~/.claude/coordination/state.json | jq '.fileChanges // 0'

# List all checkpoints
~/.claude/hooks/memory-manager.sh list
```

### Log Analysis

```bash
# Count triggers today
grep "$(date '+%Y-%m-%d')" ~/.claude/auto-continue.log | \
  grep -c "triggered"

# Show trigger types
grep "triggered - iteration" ~/.claude/auto-continue.log | \
  tail -10

# Show context usage history
grep "Context:" ~/.claude/auto-continue.log | tail -20

# Show checkpoint creations
grep "checkpoint created:" ~/.claude/auto-continue.log | tail -10

# Show errors
grep -i "error\|fail" ~/.claude/auto-continue.log | tail -20
```

## Troubleshooting

### Issue: Auto-Continue Not Triggering

**Symptoms**: Context > 40% but no checkpoint

**Checks**:
```bash
# 1. Check if context data available
grep "Context data available" ~/.claude/auto-continue.log | tail -5

# 2. Check if alternative triggers enabled
grep "ALTERNATIVE_TRIGGERS" ~/.claude/auto-continue.log | tail -5

# 3. Check trigger thresholds
grep "threshold reached" ~/.claude/auto-continue.log | tail -5

# 4. Check if disabled
ls -la .claude/auto-continue-disabled 2>/dev/null
```

**Solutions**:
- If no context data: Alternative triggers should activate
- If alternative triggers disabled: Enable with `CLAUDE_ALTERNATIVE_TRIGGERS=true`
- If no triggers hit: Adjust thresholds (file/time/message)
- If disabled: Remove `.claude/auto-continue-disabled` file

### Issue: Checkpoint Failing

**Symptoms**: "Failed to create memory checkpoint" in logs

**Checks**:
```bash
# 1. Verify memory-manager exists
ls -la ~/.claude/hooks/memory-manager.sh

# 2. Test memory-manager directly
~/.claude/hooks/memory-manager.sh checkpoint "Test checkpoint"

# 3. Check for errors
grep -i "checkpoint.*error\|checkpoint.*fail" ~/.claude/auto-continue.log | tail -10
```

**Solutions**:
- Ensure memory-manager.sh is executable: `chmod +x ~/.claude/hooks/memory-manager.sh`
- Check memory-manager logs: `tail -20 ~/.claude/memory-manager.log`
- Verify SQLite database accessible: `ls -la ~/.claude/memory.db`

### Issue: Continuation Prompt Not Created

**Symptoms**: Checkpoint created but no continuation prompt

**Checks**:
```bash
# 1. Check continuation prompt file
ls -la ~/.claude/continuation-prompt.md

# 2. Check for errors in log
grep "continuation" ~/.claude/auto-continue.log | tail -10

# 3. Check file permissions
ls -la ~/.claude/
```

**Solutions**:
- Ensure `.claude` directory writable: `chmod -R u+w ~/.claude`
- Check disk space: `df -h`
- Verify write permissions

### Issue: Wrong Trigger Type

**Symptoms**: Wrong trigger activating (file instead of time, etc.)

**Checks**:
```bash
# 1. Check trigger order in log
grep "threshold reached" ~/.claude/auto-continue.log | tail -10

# 2. Check threshold values
grep "threshold:" ~/.claude/auto-continue.log | tail -10

# 3. Check current values
env | grep CLAUDE_
```

**Solutions**:
- Adjust trigger priorities in auto-continue.sh
- Set custom thresholds via environment variables
- Disable unwanted triggers with appropriate env vars

## Performance Metrics

### Track During Testing

```bash
# Create metrics file
cat > ~/auto-continue-metrics.csv <<EOF
timestamp,trigger_type,context_percent,file_changes,time_diff_sec,message_count,checkpoint_id,iteration
EOF

# Extract metrics from logs
grep "triggered - iteration" ~/.claude/auto-continue.log | \
  awk '{print $1","$7","$(NF-5)","$(NF-4)","$(NF-3)","$(NF-2)","$(NF-1)}' >> ~/auto-continue-metrics.csv

# View metrics
cat ~/auto-continue-metrics.csv
```

### Key Metrics to Monitor

1. **Trigger Frequency**: How often does auto-continue trigger?
2. **Trigger Types**: Which triggers are most common?
3. **Checkpoint Timing**: Are checkpoints timed appropriately?
4. **Iteration Count**: How many iterations per session?
5. **Context Percentages**: What percentages are typical?

## Success Criteria

### Phase 1: Basic Functionality ✅
- [x] Autonomous mode activates/deactivates
- [x] Buildguide.md parsing works
- [x] Manual checkpoint works
- [ ] Context window trigger works
- [ ] Alternative triggers work
- [ ] Full autonomous loop works

### Phase 2: Advanced Features ⏳
- [ ] All 3 alternative triggers tested
- [ ] Graceful degradation verified
- [ ] Configuration options tested
- [ ] Edge cases handled

### Phase 3: Production Ready ⏳
- [ ] Full buildguide.md completed autonomously
- [ ] No manual intervention required
- [ ] All checkpoints created successfully
- [ ] All continuation prompts correct
- [ ] Performance acceptable

## Next Steps After Testing

1. **Document Test Results**
   - Create test report
   - Record any issues
   - Note successful features

2. **Adjust Thresholds** (if needed)
   - Based on actual usage patterns
   - Optimize for workflow
   - Balance frequency vs. performance

3. **Deploy to Production**
   - Enable in main workflow
   - Train team on usage
   - Document best practices

## Conclusion

This guide provides comprehensive testing and monitoring for the autonomous build loop system. Follow the phases systematically, monitor the logs, and document all findings to ensure reliable 100% hands-off operation.
