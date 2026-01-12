#!/bin/bash
# Message-Based Checkpoint Tracker
# Tracks conversation messages and triggers checkpoints every N messages
# Implements Priority 1.1 from COMPREHENSIVE-TEST-FINDINGS.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTER="${SCRIPT_DIR}/autonomous-command-router.sh"
STATE_DIR="${HOME}/.claude/state"
MESSAGE_LOG="${STATE_DIR}/message-count.json"
LOG_FILE="${HOME}/.claude/logs/message-tracker.log"

# Configuration
MESSAGE_CHECKPOINT_INTERVAL="${MESSAGE_CHECKPOINT_INTERVAL:-50}"  # Checkpoint every 50 messages

# Ensure directories exist
mkdir -p "$STATE_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ============================================================================
# Message Tracking Functions
# ============================================================================

init_tracking() {
    local session_id="${1:-$(date +%s)}"

    cat > "$MESSAGE_LOG" <<EOF
{
  "sessionId": "$session_id",
  "messageCount": 0,
  "lastCheckpoint": 0,
  "checkpointInterval": $MESSAGE_CHECKPOINT_INTERVAL,
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log "Initialized message tracking for session $session_id"
}

increment_message() {
    local role="${1:-user}"  # user or assistant

    # Initialize if doesn't exist
    [[ ! -f "$MESSAGE_LOG" ]] && init_tracking

    # Read current state
    local current_count=$(jq -r '.messageCount' "$MESSAGE_LOG")
    local last_checkpoint=$(jq -r '.lastCheckpoint' "$MESSAGE_LOG")
    local interval=$(jq -r '.checkpointInterval' "$MESSAGE_LOG")

    # Increment
    local new_count=$((current_count + 1))

    # Update state
    jq --arg count "$new_count" \
       --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.messageCount = ($count | tonumber) | .lastUpdated = $updated' \
       "$MESSAGE_LOG" > "${MESSAGE_LOG}.tmp" && mv "${MESSAGE_LOG}.tmp" "$MESSAGE_LOG"

    log "Message count: $new_count (role: $role)"

    # Check if checkpoint needed
    local messages_since_checkpoint=$((new_count - last_checkpoint))

    if [[ $messages_since_checkpoint -ge $interval ]]; then
        log "Checkpoint threshold reached: $messages_since_checkpoint messages since last checkpoint"
        trigger_checkpoint "$new_count"
    fi
}

trigger_checkpoint() {
    local message_count="$1"

    # Update last checkpoint
    jq --arg count "$message_count" \
       '.lastCheckpoint = ($count | tonumber)' \
       "$MESSAGE_LOG" > "${MESSAGE_LOG}.tmp" && mv "${MESSAGE_LOG}.tmp" "$MESSAGE_LOG"

    # Check if autonomous mode is active
    if [[ -f "${HOME}/.claude/autonomous-mode.active" ]]; then
        log "Triggering autonomous checkpoint at message $message_count"

        # Signal router
        if [[ -x "$ROUTER" ]]; then
            local signal=$("$ROUTER" execute checkpoint_messages "$message_count")
            log "Router response: $signal"
            echo "$signal"
        fi
    else
        log "Manual mode - advisory only"
        echo '{"advisory": "Checkpoint recommended after '"$message_count"' messages", "reason": "message_threshold"}'
    fi
}

get_status() {
    if [[ ! -f "$MESSAGE_LOG" ]]; then
        echo '{"status": "not_initialized"}'
        return
    fi

    local count=$(jq -r '.messageCount' "$MESSAGE_LOG")
    local last_checkpoint=$(jq -r '.lastCheckpoint' "$MESSAGE_LOG")
    local interval=$(jq -r '.checkpointInterval' "$MESSAGE_LOG")
    local messages_until=$(( interval - (count - last_checkpoint) ))

    cat <<EOF
{
  "messageCount": $count,
  "lastCheckpoint": $last_checkpoint,
  "messagesSinceCheckpoint": $((count - last_checkpoint)),
  "messagesUntilNextCheckpoint": $messages_until,
  "checkpointInterval": $interval
}
EOF
}

reset_tracking() {
    rm -f "$MESSAGE_LOG"
    log "Reset message tracking"
    init_tracking
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    init)
        session_id="${2:-$(date +%s)}"
        init_tracking "$session_id"
        ;;

    increment)
        role="${2:-user}"
        increment_message "$role"
        ;;

    status)
        get_status
        ;;

    reset)
        reset_tracking
        ;;

    help|*)
        cat <<EOF
Message-Based Checkpoint Tracker

Usage: message-tracker.sh <command> [args]

Commands:
  init [session_id]     Initialize tracking for new session
  increment [role]      Increment message count (role: user|assistant)
  status                Get current tracking status
  reset                 Reset message counter

Configuration:
  MESSAGE_CHECKPOINT_INTERVAL=$MESSAGE_CHECKPOINT_INTERVAL (default: 50)

Example:
  # Start tracking
  message-tracker.sh init

  # After each message
  message-tracker.sh increment user
  message-tracker.sh increment assistant

  # Check status
  message-tracker.sh status

Output format (status):
  {
    "messageCount": 45,
    "lastCheckpoint": 0,
    "messagesSinceCheckpoint": 45,
    "messagesUntilNextCheckpoint": 5,
    "checkpointInterval": 50
  }
EOF
        ;;
esac
