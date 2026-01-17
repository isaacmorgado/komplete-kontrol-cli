#!/bin/bash
# File Change Tracker - Tracks file modifications for auto-checkpoint
# Auto-triggers /checkpoint every 10 file changes
# FIX #2: Now updates coordination state for auto-continue integration

set -e

CLAUDE_DIR="${HOME}/.claude"
PROJECT_DIR="${PWD}"
TRACKER_FILE="${PROJECT_DIR}/.claude/file-changes.json"
LOG_FILE="${CLAUDE_DIR}/file-change-tracker.log"
COORD_STATE="${CLAUDE_DIR}/coordination/state.json"
CHECKPOINT_THRESHOLD=${CHECKPOINT_FILE_THRESHOLD:-10}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

init_tracker() {
    mkdir -p "${PROJECT_DIR}/.claude"
    mkdir -p "${CLAUDE_DIR}/coordination"
    
    if [[ ! -f "$TRACKER_FILE" ]]; then
        cat > "$TRACKER_FILE" <<'EOF'
{
  "session_start": "",
  "last_checkpoint": "",
  "files_changed": [],
  "change_count": 0,
  "checkpoint_count": 0
}
EOF
    fi
    
    # Initialize coordination state if needed
    if [[ ! -f "$COORD_STATE" ]]; then
        cat > "$COORD_STATE" <<'EOF'
{
  "status": "idle",
  "currentTask": "null",
  "initialized": "true",
  "fileChanges": 0,
  "fileChangeThreshold": 10,
  "lastFileCheckpoint": ""
}
EOF
    fi
}

# FIX #2: Update coordination state with file change count
update_coordination_state() {
    local change_count="$1"
    
    # Ensure coordination state exists
    if [[ -f "$COORD_STATE" ]]; then
        # Update fileChanges in coordination state
        jq --argjson count "$change_count" \
           --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
           '.fileChanges = $count | .lastFileCheckpoint = $ts' \
           "$COORD_STATE" > "${COORD_STATE}.tmp" 2>/dev/null
           
        if [[ -f "${COORD_STATE}.tmp" ]]; then
            mv "${COORD_STATE}.tmp" "$COORD_STATE"
            log "Updated coordination state: fileChanges=$change_count"
        fi
    fi
}

# Record a file change
record_change() {
    local file_path="$1"
    local change_type="${2:-modified}"  # created, modified, deleted

    init_tracker

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Check if session just started
    local session_start
    session_start=$(jq -r '.session_start' "$TRACKER_FILE")
    if [[ -z "$session_start" || "$session_start" == "null" || "$session_start" == "" ]]; then
        jq --arg ts "$timestamp" '.session_start = $ts' "$TRACKER_FILE" > "${TRACKER_FILE}.tmp"
        mv "${TRACKER_FILE}.tmp" "$TRACKER_FILE"
    fi

    # Add file change
    jq --arg file "$file_path" \
       --arg type "$change_type" \
       --arg ts "$timestamp" \
       '
       .files_changed += [{
           file: $file,
           type: $type,
           timestamp: $ts
       }] |
       .change_count += 1
       ' "$TRACKER_FILE" > "${TRACKER_FILE}.tmp"

    mv "${TRACKER_FILE}.tmp" "$TRACKER_FILE"

    local count
    count=$(jq -r '.change_count' "$TRACKER_FILE")

    log "Recorded change: $file_path ($change_type) - Total: $count"
    
    # FIX #2: Update coordination state
    update_coordination_state "$count"

    # Check if threshold reached
    if [[ $count -ge $CHECKPOINT_THRESHOLD ]]; then
        echo "CHECKPOINT_NEEDED:${count}"
        return 0
    fi

    echo "OK:${count}"
}

# Check if checkpoint needed
should_checkpoint() {
    init_tracker

    local count
    count=$(jq -r '.change_count' "$TRACKER_FILE")
    
    # FIX #2: Ensure coordination state is updated
    update_coordination_state "$count"

    if [[ $count -ge $CHECKPOINT_THRESHOLD ]]; then
        echo "true:${count}"
    else
        echo "false:${count}"
    fi
}

# Reset counter after checkpoint
reset_counter() {
    init_tracker

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local checkpoint_count
    checkpoint_count=$(jq -r '.checkpoint_count' "$TRACKER_FILE")
    checkpoint_count=$((checkpoint_count + 1))

    jq --arg ts "$timestamp" \
       --argjson count "$checkpoint_count" \
       '
       .last_checkpoint = $ts |
       .checkpoint_count = $count |
       .change_count = 0 |
       .files_changed = []
       ' "$TRACKER_FILE" > "${TRACKER_FILE}.tmp"

    mv "${TRACKER_FILE}.tmp" "$TRACKER_FILE"
    
    # FIX #2: Reset coordination state fileChanges to 0
    update_coordination_state 0

    log "Counter reset after checkpoint (checkpoint #${checkpoint_count})"
}

# Get status
get_status() {
    init_tracker

    local count
    count=$(jq -r '.change_count' "$TRACKER_FILE")

    local last_checkpoint
    last_checkpoint=$(jq -r '.last_checkpoint // "never"' "$TRACKER_FILE")

    local checkpoint_count
    checkpoint_count=$(jq -r '.checkpoint_count' "$TRACKER_FILE")
    
    # FIX #2: Also check coordination state
    local coord_changes
    if [[ -f "$COORD_STATE" ]]; then
        coord_changes=$(jq -r '.fileChanges // 0' "$COORD_STATE")
    else
        coord_changes="N/A"
    fi

    cat <<EOF
File Change Tracker Status:
  Changes since last checkpoint: $count / $CHECKPOINT_THRESHOLD
  Coordination state fileChanges: $coord_changes
  Last checkpoint: $last_checkpoint
  Total checkpoints this session: $checkpoint_count
  Checkpoint needed: $(if [[ $count -ge $CHECKPOINT_THRESHOLD ]]; then echo "YES"; else echo "no"; fi)
EOF
}

# Get recent changes
get_recent() {
    init_tracker

    jq -r '.files_changed[-10:] | .[] | "  \(.timestamp) [\(.type)] \(.file)"' "$TRACKER_FILE"
}

# Command interface
case "${1:-help}" in
    record)
        record_change "${2:-unknown}" "${3:-modified}"
        ;;
    check)
        should_checkpoint
        ;;
    reset)
        reset_counter
        ;;
    status)
        get_status
        ;;
    recent)
        get_recent
        ;;
    init)
        init_tracker
        echo "Tracker initialized"
        ;;
    *)
        echo "File Change Tracker - Auto-checkpoint trigger"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  record <file> [type]  - Record a file change (type: created|modified|deleted)"
        echo "  check                 - Check if checkpoint is needed"
        echo "  reset                 - Reset counter after checkpoint"
        echo "  status                - Show current status"
        echo "  recent                - Show recent changes"
        echo "  init                  - Initialize tracker"
        echo ""
        echo "Threshold: $CHECKPOINT_THRESHOLD files (set CHECKPOINT_FILE_THRESHOLD to change)"
        ;;
esac
