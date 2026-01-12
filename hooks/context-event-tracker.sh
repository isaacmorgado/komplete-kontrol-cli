#!/bin/bash
# Context Event Tracker
# Logs context management events (condensation, compaction, truncation)
# Implements Priority 1.2 from COMPREHENSIVE-TEST-FINDINGS.md
# Inspired by RooCodeInc/Roo-Code context management

set -euo pipefail

EVENTS_DIR="${HOME}/.claude/logs/context-events"
EVENTS_LOG="${EVENTS_DIR}/events.jsonl"
STATS_FILE="${EVENTS_DIR}/stats.json"

# Ensure directories exist
mkdir -p "$EVENTS_DIR"

log_event() {
    local event_type="$1"
    local before_tokens="$2"
    local after_tokens="$3"
    local method="${4:-unknown}"
    local success="${5:-true}"
    local error_message="${6:-}"

    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local tokens_saved=$((before_tokens - after_tokens))
    local reduction_percent=$(awk "BEGIN {printf \"%.2f\", (($before_tokens - $after_tokens) / $before_tokens) * 100}")

    # Create event JSON
    local event=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "eventType": "$event_type",
  "beforeTokens": $before_tokens,
  "afterTokens": $after_tokens,
  "tokensSaved": $tokens_saved,
  "reductionPercent": $reduction_percent,
  "method": "$method",
  "success": $success,
  "errorMessage": "$error_message"
}
EOF
)

    # Append to events log (JSONL format)
    echo "$event" >> "$EVENTS_LOG"

    # Update statistics
    update_stats "$event_type" "$tokens_saved" "$success"

    echo "$event"
}

update_stats() {
    local event_type="$1"
    local tokens_saved="$2"
    local success="$3"

    # Initialize stats if doesn't exist
    if [[ ! -f "$STATS_FILE" ]]; then
        cat > "$STATS_FILE" <<EOF
{
  "totalEvents": 0,
  "successfulEvents": 0,
  "failedEvents": 0,
  "totalTokensSaved": 0,
  "eventTypes": {
    "condense_context": {"count": 0, "tokensSaved": 0},
    "compact_memory": {"count": 0, "tokensSaved": 0},
    "sliding_window": {"count": 0, "tokensSaved": 0}
  },
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    fi

    # Update counts
    local current_total=$(jq '.totalEvents' "$STATS_FILE")
    local new_total=$((current_total + 1))

    local success_count=$(jq '.successfulEvents' "$STATS_FILE")
    local fail_count=$(jq '.failedEvents' "$STATS_FILE")

    if [[ "$success" == "true" ]]; then
        success_count=$((success_count + 1))
    else
        fail_count=$((fail_count + 1))
    fi

    local total_saved=$(jq '.totalTokensSaved' "$STATS_FILE")
    total_saved=$((total_saved + tokens_saved))

    local event_count=$(jq ".eventTypes.\"$event_type\".count // 0" "$STATS_FILE")
    event_count=$((event_count + 1))

    local event_saved=$(jq ".eventTypes.\"$event_type\".tokensSaved // 0" "$STATS_FILE")
    event_saved=$((event_saved + tokens_saved))

    # Update stats file
    jq --arg total "$new_total" \
       --arg success "$success_count" \
       --arg fail "$fail_count" \
       --arg saved "$total_saved" \
       --arg type "$event_type" \
       --arg count "$event_count" \
       --arg type_saved "$event_saved" \
       --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.totalEvents = ($total | tonumber) |
        .successfulEvents = ($success | tonumber) |
        .failedEvents = ($fail | tonumber) |
        .totalTokensSaved = ($saved | tonumber) |
        .eventTypes[$type].count = ($count | tonumber) |
        .eventTypes[$type].tokensSaved = ($type_saved | tonumber) |
        .lastUpdated = $updated' \
       "$STATS_FILE" > "${STATS_FILE}.tmp" && mv "${STATS_FILE}.tmp" "$STATS_FILE"
}

get_stats() {
    if [[ ! -f "$STATS_FILE" ]]; then
        echo '{"status": "no_events"}'
        return
    fi

    cat "$STATS_FILE"
}

get_recent_events() {
    local limit="${1:-10}"

    if [[ ! -f "$EVENTS_LOG" ]]; then
        echo '[]'
        return
    fi

    tail -n "$limit" "$EVENTS_LOG" | jq -s '.'
}

get_session_summary() {
    local session_start="${1:-$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)}"

    if [[ ! -f "$EVENTS_LOG" ]]; then
        echo '{"sessionEvents": 0, "tokensSaved": 0}'
        return
    fi

    # Filter events after session start and calculate totals
    jq --arg start "$session_start" '
        select(.timestamp >= $start) |
        {timestamp, eventType, tokensSaved}
    ' "$EVENTS_LOG" | jq -s '{
        sessionEvents: length,
        tokensSaved: (map(.tokensSaved) | add // 0),
        events: .
    }'
}

reset_stats() {
    rm -f "$STATS_FILE"
    echo "Stats reset"
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    log)
        # log <event_type> <before_tokens> <after_tokens> [method] [success] [error]
        event_type="${2:-condense_context}"
        before="${3:-0}"
        after="${4:-0}"
        method="${5:-auto}"
        success="${6:-true}"
        error="${7:-}"
        log_event "$event_type" "$before" "$after" "$method" "$success" "$error"
        ;;

    stats)
        get_stats
        ;;

    recent)
        limit="${2:-10}"
        get_recent_events "$limit"
        ;;

    session)
        start_time="${2:-$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)}"
        get_session_summary "$start_time"
        ;;

    reset)
        reset_stats
        ;;

    help|*)
        cat <<EOF
Context Event Tracker

Usage: context-event-tracker.sh <command> [args]

Commands:
  log <type> <before> <after> [method] [success] [error]
      Log a context management event
      Types: condense_context, compact_memory, sliding_window
      Example: context-event-tracker.sh log condense_context 80000 50000 auto true

  stats
      Get aggregate statistics

  recent [limit]
      Get recent N events (default: 10)

  session [start_time]
      Get summary for session since start_time
      Format: 2026-01-12T20:00:00Z

  reset
      Reset all statistics

Example workflow:
  # Log condensation event
  context-event-tracker.sh log condense_context 80000 50000 auto true

  # Check stats
  context-event-tracker.sh stats

  # View recent events
  context-event-tracker.sh recent 5

Output format (stats):
  {
    "totalEvents": 15,
    "successfulEvents": 14,
    "failedEvents": 1,
    "totalTokensSaved": 450000,
    "eventTypes": {
      "condense_context": {"count": 10, "tokensSaved": 300000},
      "compact_memory": {"count": 4, "tokensSaved": 120000},
      "sliding_window": {"count": 1, "tokensSaved": 30000}
    }
  }
EOF
        ;;
esac
