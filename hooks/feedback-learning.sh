#!/bin/bash
# Environmental Feedback Learning
# Tracks action outcomes and adapts strategies based on success/failure
# Implements Priority 2.2 from COMPREHENSIVE-TEST-FINDINGS.md
# Inspired by OpenBMB/XAgent environmental feedback mechanisms

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FEEDBACK_DIR="${HOME}/.claude/learning"
OUTCOMES_LOG="${FEEDBACK_DIR}/outcomes.jsonl"
STRATEGIES_DB="${FEEDBACK_DIR}/strategies.json"
PATTERNS_DB="${FEEDBACK_DIR}/patterns.json"

mkdir -p "$FEEDBACK_DIR"

# ============================================================================
# Feedback Recording
# ============================================================================

record_outcome() {
    local action_type="$1"
    local context_summary="$2"
    local strategy_used="$3"
    local outcome="$4"  # success, partial_success, failure
    local reward="${5:-0.0}"  # 0.0 to 1.0
    local details="${6:-}"

    local outcome_id="outcome_$(date +%s)_$$"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local outcome_record=$(cat <<EOF
{
  "outcomeId": "$outcome_id",
  "timestamp": "$timestamp",
  "actionType": "$action_type",
  "contextSummary": "$context_summary",
  "strategyUsed": "$strategy_used",
  "outcome": "$outcome",
  "reward": $reward,
  "details": "$details"
}
EOF
)

    echo "$outcome_record" >> "$OUTCOMES_LOG"

    # Update strategy scores
    update_strategy_score "$action_type" "$strategy_used" "$outcome" "$reward"

    # Extract patterns if successful
    if [[ "$outcome" == "success" ]]; then
        extract_pattern "$action_type" "$context_summary" "$strategy_used"
    fi

    echo "$outcome_record"
}

update_strategy_score() {
    local action_type="$1"
    local strategy="$2"
    local outcome="$3"
    local reward="$4"

    # Initialize strategies DB if doesn't exist
    if [[ ! -f "$STRATEGIES_DB" ]]; then
        echo '{}' > "$STRATEGIES_DB"
    fi

    # Calculate new score using exponential moving average
    local alpha=0.3  # Learning rate

    local current_score=$(jq -r --arg type "$action_type" --arg strat "$strategy" \
                          '.[$type][$strat].score // 0.5' "$STRATEGIES_DB")

    local new_score=$(awk "BEGIN {printf \"%.4f\", $current_score * (1 - $alpha) + $reward * $alpha}")

    local usage_count=$(jq -r --arg type "$action_type" --arg strat "$strategy" \
                        '.[$type][$strat].usageCount // 0' "$STRATEGIES_DB")
    usage_count=$((usage_count + 1))

    local success_count=$(jq -r --arg type "$action_type" --arg strat "$strategy" \
                          '.[$type][$strat].successCount // 0' "$STRATEGIES_DB")
    if [[ "$outcome" == "success" ]]; then
        success_count=$((success_count + 1))
    fi

    # Update database
    jq --arg type "$action_type" \
       --arg strat "$strategy" \
       --arg score "$new_score" \
       --arg usage "$usage_count" \
       --arg success "$success_count" \
       --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.[$type][$strat] = {
           "score": ($score | tonumber),
           "usageCount": ($usage | tonumber),
           "successCount": ($success | tonumber),
           "successRate": (($success | tonumber) / ($usage | tonumber)),
           "lastUpdated": $updated
        }' \
       "$STRATEGIES_DB" > "${STRATEGIES_DB}.tmp" && mv "${STRATEGIES_DB}.tmp" "$STRATEGIES_DB"
}

extract_pattern() {
    local action_type="$1"
    local context="$2"
    local strategy="$3"

    # Initialize patterns DB if doesn't exist
    if [[ ! -f "$PATTERNS_DB" ]]; then
        echo '{"patterns": []}' > "$PATTERNS_DB"
    fi

    # Create pattern entry
    local pattern=$(cat <<EOF
{
  "actionType": "$action_type",
  "context": "$context",
  "successfulStrategy": "$strategy",
  "discoveredAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "confidence": 1.0
}
EOF
)

    # Add to patterns
    jq --argjson pattern "$pattern" '.patterns += [$pattern]' \
       "$PATTERNS_DB" > "${PATTERNS_DB}.tmp" && mv "${PATTERNS_DB}.tmp" "$PATTERNS_DB"
}

# ============================================================================
# Strategy Recommendation
# ============================================================================

recommend_strategy() {
    local action_type="$1"
    local context="${2:-}"

    if [[ ! -f "$STRATEGIES_DB" ]]; then
        echo '{"recommendation": "default", "confidence": 0.5, "reason": "No learning data available"}'
        return
    fi

    # Get all strategies for this action type, sorted by score
    local strategies=$(jq --arg type "$action_type" \
                          '.[$type] // {} | to_entries |
                           map({strategy: .key, score: .value.score, successRate: .value.successRate}) |
                           sort_by(-.score)' \
                          "$STRATEGIES_DB")

    local top_strategy=$(echo "$strategies" | jq -r '.[0].strategy // "default"')
    local top_score=$(echo "$strategies" | jq -r '.[0].score // 0.5')
    local success_rate=$(echo "$strategies" | jq -r '.[0].successRate // 0.0')

    # Check for similar context patterns
    local similar_pattern=""
    if [[ -f "$PATTERNS_DB" && -n "$context" ]]; then
        similar_pattern=$(jq --arg type "$action_type" --arg ctx "$context" \
                          '.patterns[] |
                           select(.actionType == $type) |
                           select(.context | contains($ctx)) |
                           .successfulStrategy' \
                          "$PATTERNS_DB" | head -1 | tr -d '"')
    fi

    local recommendation="$top_strategy"
    local reason="Highest scoring strategy (score: $top_score, success rate: $success_rate)"

    if [[ -n "$similar_pattern" ]]; then
        recommendation="$similar_pattern"
        reason="Similar successful pattern found in history"
    fi

    cat <<EOF
{
  "recommendation": "$recommendation",
  "confidence": $top_score,
  "successRate": $success_rate,
  "reason": "$reason",
  "alternatives": $strategies
}
EOF
}

get_learning_stats() {
    local action_type="${1:-all}"

    if [[ ! -f "$OUTCOMES_LOG" ]]; then
        echo '{"totalOutcomes": 0}'
        return
    fi

    local total=$(wc -l < "$OUTCOMES_LOG")
    local successful=$(grep -c '"outcome": "success"' "$OUTCOMES_LOG" || echo "0")
    local failed=$(grep -c '"outcome": "failure"' "$OUTCOMES_LOG" || echo "0")

    local success_rate=$(awk "BEGIN {printf \"%.2f\", ($successful / $total) * 100}")

    cat <<EOF
{
  "totalOutcomes": $total,
  "successful": $successful,
  "failed": $failed,
  "successRate": $success_rate,
  "strategies": $(jq -s 'group_by(.actionType) | map({type: .[0].actionType, count: length})' "$OUTCOMES_LOG")
}
EOF
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    record)
        # record <action_type> <context> <strategy> <outcome> [reward] [details]
        action_type="${2:-}"
        context="${3:-}"
        strategy="${4:-}"
        outcome="${5:-}"
        reward="${6:-0.5}"
        details="${7:-}"

        if [[ -z "$action_type" || -z "$strategy" || -z "$outcome" ]]; then
            echo "Error: action_type, strategy, and outcome required"
            exit 1
        fi

        record_outcome "$action_type" "$context" "$strategy" "$outcome" "$reward" "$details"
        ;;

    recommend)
        # recommend <action_type> [context]
        action_type="${2:-}"
        context="${3:-}"

        if [[ -z "$action_type" ]]; then
            echo "Error: action_type required"
            exit 1
        fi

        recommend_strategy "$action_type" "$context"
        ;;

    stats)
        action_type="${2:-all}"
        get_learning_stats "$action_type"
        ;;

    help|*)
        cat <<EOF
Environmental Feedback Learning

Usage: feedback-learning.sh <command> [args]

Commands:
  record <type> <context> <strategy> <outcome> [reward] [details]
      Record action outcome for learning
      Types: implementation, debugging, testing, documentation, etc.
      Outcomes: success, partial_success, failure
      Reward: 0.0-1.0 (success=1.0, partial=0.5, failure=0.0)
      Example: feedback-learning.sh record implementation "Add auth" "research-first" success 1.0 "Clean implementation"

  recommend <type> [context]
      Get recommended strategy based on learning
      Example: feedback-learning.sh recommend implementation "Add payment"

  stats [type]
      Get learning statistics (overall or by type)

How It Works:
  1. Record outcomes after every significant action
  2. System learns which strategies work best
  3. Future recommendations based on past success
  4. Adapts over time using exponential moving average

Example Integration:
  # Before action
  recommendation=\$(feedback-learning.sh recommend implementation "Build API")
  strategy=\$(echo "\$recommendation" | jq -r '.recommendation')

  # Execute using recommended strategy
  # ...

  # After action
  feedback-learning.sh record implementation "Build API" "\$strategy" success 1.0 "API working"

Output format (recommend):
  {
    "recommendation": "research-first",
    "confidence": 0.85,
    "successRate": 0.90,
    "reason": "Highest scoring strategy",
    "alternatives": [...]
  }
EOF
        ;;
esac
