#!/bin/bash
# Auto-Continue Hook - Fully automated context management with quality awareness
# When context hits threshold:
# 1. Checks if build is in progress
# 2. Runs validation before checkpoint
# 3. Saves state and creates continuation prompt
# 4. Feeds prompt back to keep running
#
# ENHANCED: Now supports alternative triggers when context data unavailable

set -euo pipefail

THRESHOLD=${CLAUDE_CONTEXT_THRESHOLD:-40}
LOG_FILE="${HOME}/.claude/auto-continue.log"
STATE_FILE=".claude/auto-continue.local.md"
BUILD_STATE=".claude/current-build.local.md"
COORD_STATE="${HOME}/.claude/coordination/state.json"

# Alternative trigger settings
ALTERNATIVE_TRIGGERS="${CLAUDE_ALTERNATIVE_TRIGGERS:-true}"
FILE_CHANGE_THRESHOLD=${CLAUDE_FILE_CHANGE_THRESHOLD:-10}
TIME_THRESHOLD_MINUTES=${CLAUDE_TIME_THRESHOLD_MINUTES:-5}
MESSAGE_THRESHOLD=${CLAUDE_MESSAGE_THRESHOLD:-10}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Read hook input
HOOK_INPUT=$(cat)

# Extract context info
CONTEXT_SIZE=$(echo "$HOOK_INPUT" | jq -r '.context_window.context_window_size // 200000')
USAGE=$(echo "$HOOK_INPUT" | jq '.context_window.current_usage // null')
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path // ""')

# Check for context data availability
HAS_CONTEXT_DATA=false
if [[ "$USAGE" != "null" && -n "$USAGE" ]]; then
    HAS_CONTEXT_DATA=true
fi

log "Context data available: $HAS_CONTEXT_DATA"

if ! $HAS_CONTEXT_DATA; then
    log "⚠️  No context window data received from Claude Code"
    
    # FIX #1: Force continuation trigger if autonomous mode is active
    if [[ -f "${HOME}/.claude/autonomous-mode.active" ]]; then
        log "🔄 Autonomous mode active - forcing continuation trigger"
        USAGE='{"input_tokens": 0, "cache_creation_input_tokens": 80000, "cache_read_input_tokens": 0}'
        HAS_CONTEXT_DATA=true  # Force trigger below
    fi
    
    # Try alternative triggers
    if [[ "$ALTERNATIVE_TRIGGERS" == "true" ]]; then
        log "🔄 Attempting alternative triggers..."
        
        # Alternative Trigger 1: File changes
        log "🔍 Checking file-based trigger..."
        if [[ -f "$COORD_STATE" ]] && command -v jq &>/dev/null; then
            FILE_CHANGES=$(jq -r '.fileChanges // 0' "$COORD_STATE" 2>/dev/null || echo "0")
            log "🔍 File changes tracked: $FILE_CHANGES (threshold: $FILE_CHANGE_THRESHOLD)"
            
            if [[ "$FILE_CHANGES" -ge "$FILE_CHANGE_THRESHOLD" ]]; then
                log "📁 File change threshold reached ($FILE_CHANGES >= $FILE_CHANGE_THRESHOLD)"
                USAGE='{"input_tokens": 0, "cache_creation_input_tokens": 80000, "cache_read_input_tokens": 0}'
                HAS_CONTEXT_DATA=true
            fi
        else
            log "⚠️  Coordination state file not found or jq not available"
        fi
        
        # Alternative Trigger 2: Time-based
        if [[ "$USAGE" == "null" ]]; then
            log "🔍 Checking time-based trigger..."
            LAST_CHECKPOINT_TIME=$(jq -r '.lastCheckpointTime // 0' "$STATE_FILE" 2>/dev/null || echo "0")
            CURRENT_TIME=$(date +%s)
            TIME_DIFF=$((CURRENT_TIME - LAST_CHECKPOINT_TIME))
            TIME_THRESHOLD_SECONDS=$((TIME_THRESHOLD_MINUTES * 60))
            
            log "🔍 Time since last checkpoint: ${TIME_DIFF}s (threshold: ${TIME_THRESHOLD_SECONDS}s)"
            
            if [[ $TIME_DIFF -ge $TIME_THRESHOLD_SECONDS ]]; then
                log "⏱️  Time threshold reached (${TIME_DIFF}s >= ${TIME_THRESHOLD_SECONDS}s)"
                # Calculate percentage based on typical usage
                USAGE='{"input_tokens": 0, "cache_creation_input_tokens": 80000, "cache_read_input_tokens": 0}'
                HAS_CONTEXT_DATA=true
            fi
        fi
        
        # Alternative Trigger 3: Message-based (if available)
        if [[ "$USAGE" == "null" && -f "$TRANSCRIPT_PATH" ]]; then
            log "🔍 Checking message-based trigger..."
            MESSAGE_COUNT=$(grep -c '"role":"user"' "$TRANSCRIPT_PATH" 2>/dev/null || echo "0")
            LAST_CHECKPOINT_MESSAGES=$(jq -r '.lastCheckpointMessages // 0' "$STATE_FILE" 2>/dev/null || echo "0")
            NEW_MESSAGES=$((MESSAGE_COUNT - LAST_CHECKPOINT_MESSAGES))
            
            log "🔍 New messages since last checkpoint: $NEW_MESSAGES (threshold: $MESSAGE_THRESHOLD)"
            
            if [[ $NEW_MESSAGES -ge $MESSAGE_THRESHOLD ]]; then
                log "💬 Message threshold reached ($NEW_MESSAGES >= $MESSAGE_THRESHOLD)"
                USAGE='{"input_tokens": 0, "cache_creation_input_tokens": 80000, "cache_read_input_tokens": 0}'
                HAS_CONTEXT_DATA=true
            fi
        fi
        
        # FIX #4: Fallback to default threshold if autonomous mode and no trigger hit
        if [[ "$USAGE" == "null" && -f "${HOME}/.claude/autonomous-mode.active" ]]; then
            log "🛡️  Autonomous fallback: Using default 5% threshold"
            USAGE='{"input_tokens": 0, "cache_creation_input_tokens": 10000, "cache_read_input_tokens": 0}'
            HAS_CONTEXT_DATA=true
        fi
        
        # If no alternative trigger hit, log and exit
        if [[ "$USAGE" == "null" ]]; then
            log "No alternative trigger hit - allowing stop"
            log "💡 Tip: Run /checkpoint manually or adjust thresholds:"
            log "   - File-based: Checkpoint after $FILE_CHANGE_THRESHOLD changes"
            log "   - Time-based: Checkpoint every $TIME_THRESHOLD_MINUTES minutes"
            log "   - Message-based: Checkpoint after $MESSAGE_THRESHOLD messages"
            exit 0
        fi
    else
        log "Alternative triggers disabled - allowing stop"
        exit 0
    fi
fi

# Calculate percentage
INPUT_TOKENS=$(echo "$USAGE" | jq -r '.input_tokens // 0')
CACHE_CREATE=$(echo "$USAGE" | jq -r '.cache_creation_input_tokens // 0')
CACHE_READ=$(echo "$USAGE" | jq -r '.cache_read_input_tokens // 0')
CURRENT_TOKENS=$((INPUT_TOKENS + CACHE_CREATE + CACHE_READ))
PERCENT=$((CURRENT_TOKENS * 100 / CONTEXT_SIZE))

log "Context: ${PERCENT}% (${CURRENT_TOKENS}/${CONTEXT_SIZE})"

# Check if auto-continue is disabled
if [[ -f ".claude/auto-continue-disabled" ]]; then
    log "Auto-continue disabled - allowing stop"
    exit 0
fi

# Check for stop words in last message
if [[ -n "$TRANSCRIPT_PATH" ]] && [[ -f "$TRANSCRIPT_PATH" ]]; then
    LAST_USER=$(grep '"role":"user"' "$TRANSCRIPT_PATH" | tail -1 | jq -r '.message.content[0].text // ""' 2>/dev/null || echo "")
    if echo "$LAST_USER" | grep -qiE '\b(stop|pause|hold|wait|quit)\b'; then
        log "Stop word detected - allowing stop"
        exit 0
    fi
fi

# Below threshold - allow normal stop
if [[ $PERCENT -lt $THRESHOLD ]]; then
    log "Below threshold (${PERCENT}% < ${THRESHOLD}%) - allowing stop"
    exit 0
fi

log "Threshold reached (${PERCENT}% >= ${THRESHOLD}%) - triggering auto-continue"

# Update state file with checkpoint time
mkdir -p .claude
LAST_CHECKPOINT_TIME=$(date +%s)
MESSAGE_COUNT=$(jq -c '"role":"user"' "$TRANSCRIPT_PATH" 2>/dev/null || echo "0")

cat > "$STATE_FILE" <<EOF
---
active: true
lastCheckpointTime: $LAST_CHECKPOINT_TIME
lastCheckpointMessages: $MESSAGE_COUNT
lastPercent: $PERCENT
lastTrigger: $(if $HAS_CONTEXT_DATA; then echo "context_window"; else echo "alternative_trigger"; fi)
---

Auto-continue active. Triggered via $(if $HAS_CONTEXT_DATA; then echo "context window"; else echo "alternative trigger"; fi).
EOF

# PHASE 1 & 4 INTEGRATION: Check context budget and create checkpoint
log "Checking memory context budget..."
MEMORY_MANAGER="${HOME}/.claude/hooks/memory-manager.sh"
CHECKPOINT_ID=""

if [[ -x "$MEMORY_MANAGER" ]]; then
    # PHASE 4: Check context budget
    CONTEXT_USAGE=$("$MEMORY_MANAGER" context-usage 2>/dev/null || echo "{}")
    CONTEXT_STATUS=$(echo "$CONTEXT_USAGE" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")

    if [[ "$CONTEXT_STATUS" == "critical" || "$CONTEXT_STATUS" == "warning" ]]; then
        log "⚠️  Memory context budget at warning/critical - compacting memory..."
        "$MEMORY_MANAGER" context-compact 2>/dev/null || log "⚠️  Memory compact failed"
    fi

    # PHASE 1: Create checkpoint with context percentage in description
    log "Creating memory checkpoint before Claude context compact..."
    CHECKPOINT_ID=$("$MEMORY_MANAGER" checkpoint "Auto-checkpoint at ${PERCENT}% context before compact" 2>/dev/null || echo "")

    if [[ -n "$CHECKPOINT_ID" ]]; then
        log "✅ Memory checkpoint created: $CHECKPOINT_ID"
    else
        log "⚠️  Failed to create memory checkpoint"
    fi
else
    log "⚠️  memory-manager.sh not found - skipping checkpoint"
fi

# Get current working directory info
PROJECT_NAME=$(basename "$(pwd)")
PROJECT_DIR=$(pwd)

# Check if build is in progress
BUILD_CONTEXT=""
if [[ -f "$BUILD_STATE" ]]; then
    BUILD_FEATURE=$(grep '^feature:' "$BUILD_STATE" | sed 's/feature: *//' || echo "")
    BUILD_PHASE=$(grep '^phase:' "$BUILD_STATE" | sed 's/phase: *//' || echo "")
    BUILD_ITERATION=$(grep '^iteration:' "$BUILD_STATE" | sed 's/iteration: *//' || echo "1")

    if [[ -n "$BUILD_FEATURE" ]] && [[ "$BUILD_PHASE" != "complete" ]]; then
        BUILD_CONTEXT="
**Active Build**: $BUILD_FEATURE (phase: $BUILD_PHASE, iteration: $BUILD_ITERATION)
Continue implementing this feature. Check .claude/current-build.local.md for progress."
    fi
fi

# Read CLAUDE.md if exists
CLAUDE_MD_CONTENT=""
if [[ -f "CLAUDE.md" ]]; then
    CLAUDE_MD_CONTENT=$(head -50 CLAUDE.md 2>/dev/null || echo "")
fi

# Read buildguide.md next section if exists
NEXT_SECTION=""
NEXT_SECTION_DETAIL=""
if [[ -f "buildguide.md" ]]; then
    # Get first unchecked section
    NEXT_SECTION=$(grep -m1 '^\- \[ \]' buildguide.md 2>/dev/null | sed 's/- \[ \] //' || echo "")

    # Try to get the section details
    if [[ -n "$NEXT_SECTION" ]]; then
        # Find the section header and get content until next section
        SECTION_CONTENT=$(awk "/^## .*${NEXT_SECTION}/,/^## /" buildguide.md 2>/dev/null | head -30 || echo "")
        if [[ -n "$SECTION_CONTENT" ]]; then
            NEXT_SECTION_DETAIL="
**Next Section from buildguide.md**: $NEXT_SECTION
$SECTION_CONTENT"
        fi
    fi
fi

# Check for architecture docs
ARCH_CONTEXT=""
for arch_file in "ARCHITECTURE.md" "docs/architecture.md" ".claude/docs/architecture.md"; do
    if [[ -f "$arch_file" ]]; then
        ARCH_CONTEXT="
**Architecture**: See $arch_file for system design."
        break
    fi
done

# Check for stuck issues in debug-log
STUCK_ISSUES=""
if [[ -f ".claude/docs/debug-log.md" ]]; then
    STUCK=$(grep -c "STUCK" ".claude/docs/debug-log.md" 2>/dev/null || echo "0")
    STUCK=$(echo "$STUCK" | tr -d '\n' | tr -d ' ')
    if [[ -n "$STUCK" ]] && [[ "$STUCK" =~ ^[0-9]+$ ]] && [[ "$STUCK" -gt 0 ]]; then
        STUCK_ISSUES="
⚠️ $STUCK stuck issues in debug-log.md - may need review."
    fi
fi

# Build continuation prompt (token-effective per Ken Kai principles)
# Short, focused, no essays - agent is smart
CHECKPOINT_INFO=""
if [[ -n "$CHECKPOINT_ID" ]]; then
    CHECKPOINT_INFO="
📋 Memory checkpoint: $CHECKPOINT_ID (restore with: memory-manager.sh restore $CHECKPOINT_ID)"
fi

# Use intelligent command router to determine checkpoint action
COMMAND_ROUTER="${HOME}/.claude/hooks/autonomous-command-router.sh"
ROUTER_DECISION=""
CHECKPOINT_ACTION="First: Run /checkpoint to save session state"
TRIGGER_INFO="context: ${CURRENT_TOKENS}/${CONTEXT_SIZE}"

if ! $HAS_CONTEXT_DATA; then
    TRIGGER_INFO="alternative trigger (context data unavailable)"
fi

if [[ -x "$COMMAND_ROUTER" ]]; then
    ROUTER_OUTPUT=$("$COMMAND_ROUTER" execute checkpoint_context "${CURRENT_TOKENS}/${CONTEXT_SIZE}" 2>/dev/null || echo '{}')

    # Check if autonomous execution is signaled
    EXECUTE_SKILL=$(echo "$ROUTER_OUTPUT" | jq -r '.execute_skill // ""')
    if [[ "$EXECUTE_SKILL" == "checkpoint" ]]; then
        CHECKPOINT_ACTION="<command-name>/checkpoint</command-name>"
        ROUTER_DECISION="$ROUTER_OUTPUT"
    fi
fi

# Build continuation prompt based on whether checkpoint should execute
if [[ -n "$CHECKPOINT_ACTION" ]]; then
    CONTINUATION_PROMPT="Context ${PERCENT}% → Memory compacted. Execute checkpoint:

$CHECKPOINT_ACTION

Trigger: $TRIGGER_INFO

After completion:
${BUILD_CONTEXT:+• Resume: .claude/current-build.local.md}${BUILD_CONTEXT:-• Check: buildguide.md}${NEXT_SECTION:+
• Next: $NEXT_SECTION}

(Autonomous mode - execute immediately without asking)"
else
    CONTINUATION_PROMPT="Continue ${PROJECT_NAME}. Context: ${PERCENT}%.${CHECKPOINT_INFO}
Trigger: $TRIGGER_INFO
${BUILD_CONTEXT}${NEXT_SECTION:+Next: $NEXT_SECTION}${STUCK_ISSUES}

${BUILD_CONTEXT:+Resume: .claude/current-build.local.md}${BUILD_CONTEXT:-Check: buildguide.md}

Ken's rules: Short > long. Reference, don't dump. Stay focused."
fi

# Track iteration
ITERATION=1
if [[ -f "$STATE_FILE" ]]; then
    ITERATION=$(grep '^iteration:' "$STATE_FILE" 2>/dev/null | sed 's/iteration: *//' || echo "1")
    ITERATION=$((ITERATION + 1))
fi

# Create/update state file
mkdir -p .claude
cat > "$STATE_FILE" <<EOF
---
active: true
iteration: $ITERATION
threshold: $THRESHOLD
last_percent: $PERCENT
last_compact: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
last_checkpoint_time: $LAST_CHECKPOINT_TIME
build_active: $(if [[ -n "$BUILD_CONTEXT" ]]; then echo "true"; else echo "false"; fi)
trigger_type: $(if $HAS_CONTEXT_DATA; then echo "context_window"; else echo "alternative_trigger"; fi)
file_changes: $FILE_CHANGES
---

Auto-continue active. Iteration ${ITERATION}. Triggered via $(if $HAS_CONTEXT_DATA; then echo "context window"; else echo "alternative trigger"; fi).
EOF

# Output JSON to block stop and feed continuation prompt
# Include router decision for autonomous skill execution
if [[ -n "$ROUTER_DECISION" ]]; then
    jq -n \
        --arg prompt "$CONTINUATION_PROMPT" \
        --arg msg "🔄 Auto-continue: Context ${PERCENT}% → compacted (iteration ${ITERATION})${BUILD_CONTEXT:+ | Build: $BUILD_FEATURE} (trigger: $(if $HAS_CONTEXT_DATA; then echo "context"; else echo "alt"; fi))" \
        --argjson router "$ROUTER_DECISION" \
        '{
            "decision": "block",
            "reason": $prompt,
            "systemMessage": $msg,
            "router_decision": $router
        }'
else
    jq -n \
        --arg prompt "$CONTINUATION_PROMPT" \
        --arg msg "🔄 Auto-continue: Context ${PERCENT}% → compacted (iteration ${ITERATION})${BUILD_CONTEXT:+ | Build: $BUILD_FEATURE} (trigger: $(if $HAS_CONTEXT_DATA; then echo "context"; else echo "alt"; fi))" \
        '{
            "decision": "block",
            "reason": $prompt,
            "systemMessage": $msg
        }'
fi

log "Auto-continue triggered - iteration $ITERATION (trigger: $(if $HAS_CONTEXT_DATA; then echo "context_window"; else echo "alternative_trigger"; fi))"
exit 0
