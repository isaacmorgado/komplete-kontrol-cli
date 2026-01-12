#!/bin/bash
# Sliding Window Fallback
# Truncates oldest messages when context approaches limit
# Implements Priority 1.3 from COMPREHENSIVE-TEST-FINDINGS.md
# Fallback when memory compaction fails or unavailable
# Inspired by RooCodeInc/Roo-Code sliding window implementation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVENT_TRACKER="${SCRIPT_DIR}/context-event-tracker.sh"
LOG_FILE="${HOME}/.claude/logs/sliding-window.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ============================================================================
# Sliding Window Implementation
# ============================================================================

truncate_context() {
    local current_tokens="$1"
    local max_tokens="$2"
    local target_percent="${3:-60}"  # Truncate to 60% of max

    log "Truncating context: current=$current_tokens, max=$max_tokens, target=${target_percent}%"

    # Calculate target tokens
    local target_tokens=$(awk "BEGIN {printf \"%.0f\", $max_tokens * ($target_percent / 100)}")
    local tokens_to_remove=$((current_tokens - target_tokens))

    log "Target: $target_tokens tokens (removing $tokens_to_remove)"

    # Estimate messages to remove (rough estimate: 500 tokens per message)
    local messages_to_remove=$(( tokens_to_remove / 500 ))
    if [[ $messages_to_remove -lt 1 ]]; then
        messages_to_remove=1
    fi

    log "Estimated messages to remove: $messages_to_remove"

    # Return truncation plan
    cat <<EOF
{
  "method": "sliding_window",
  "currentTokens": $current_tokens,
  "targetTokens": $target_tokens,
  "tokensToRemove": $tokens_to_remove,
  "estimatedMessagesToRemove": $messages_to_remove,
  "strategy": "Remove oldest $messages_to_remove messages, keeping system prompt and recent context"
}
EOF

    # Log event
    if [[ -x "$EVENT_TRACKER" ]]; then
        "$EVENT_TRACKER" log sliding_window "$current_tokens" "$target_tokens" "fallback" "true" ""
    fi
}

calculate_window_size() {
    local max_tokens="$1"
    local buffer_percent="${2:-10}"  # Keep 10% buffer

    # Calculate usable window (max - buffer)
    local usable=$(awk "BEGIN {printf \"%.0f\", $max_tokens * (1 - $buffer_percent / 100)}")

    cat <<EOF
{
  "maxTokens": $max_tokens,
  "bufferPercent": $buffer_percent,
  "usableTokens": $usable,
  "truncateThreshold": $(awk "BEGIN {printf \"%.0f\", $usable * 0.9}")
}
EOF
}

get_truncation_strategy() {
    local current_tokens="$1"
    local max_tokens="$2"

    local percent=$(awk "BEGIN {printf \"%.1f\", ($current_tokens / $max_tokens) * 100}")

    # Determine strategy based on usage
    local strategy="none"
    local action="No action needed"

    if (( $(echo "$percent >= 95" | bc -l) )); then
        strategy="aggressive"
        action="Truncate to 50% immediately (emergency)"
    elif (( $(echo "$percent >= 85" | bc -l) )); then
        strategy="moderate"
        action="Truncate to 60% (fallback triggered)"
    elif (( $(echo "$percent >= 75" | bc -l) )); then
        strategy="gentle"
        action="Try compaction first, truncate to 70% if fails"
    fi

    cat <<EOF
{
  "currentPercent": $percent,
  "strategy": "$strategy",
  "action": "$action",
  "shouldTruncate": $([ "$strategy" != "none" ] && echo "true" || echo "false")
}
EOF
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    truncate)
        # truncate <current_tokens> <max_tokens> [target_percent]
        current="${2:-0}"
        max="${3:-200000}"
        target="${4:-60}"
        truncate_context "$current" "$max" "$target"
        ;;

    window-size)
        # window-size <max_tokens> [buffer_percent]
        max="${2:-200000}"
        buffer="${3:-10}"
        calculate_window_size "$max" "$buffer"
        ;;

    strategy)
        # strategy <current_tokens> <max_tokens>
        current="${2:-0}"
        max="${3:-200000}"
        get_truncation_strategy "$current" "$max"
        ;;

    help|*)
        cat <<EOF
Sliding Window Fallback

Usage: sliding-window.sh <command> [args]

Commands:
  truncate <current> <max> [target_percent]
      Calculate truncation plan
      Example: sliding-window.sh truncate 180000 200000 60

  window-size <max> [buffer_percent]
      Calculate usable window size
      Example: sliding-window.sh window-size 200000 10

  strategy <current> <max>
      Determine truncation strategy based on usage
      Example: sliding-window.sh strategy 170000 200000

Truncation Strategies:
  - none: < 75% usage - No action needed
  - gentle: 75-84% - Try compaction first, truncate to 70% if fails
  - moderate: 85-94% - Truncate to 60% (fallback triggered)
  - aggressive: 95%+ - Truncate to 50% immediately (emergency)

Example Integration (in auto-continue.sh):
  # Try compaction first
  if ! compact_memory; then
      # Fallback to sliding window
      plan=\$(sliding-window.sh truncate \$CURRENT_TOKENS \$MAX_TOKENS 60)
      # Apply truncation based on plan
  fi

Output format (truncate):
  {
    "method": "sliding_window",
    "currentTokens": 180000,
    "targetTokens": 120000,
    "tokensToRemove": 60000,
    "estimatedMessagesToRemove": 120,
    "strategy": "Remove oldest 120 messages"
  }
EOF
        ;;
esac
