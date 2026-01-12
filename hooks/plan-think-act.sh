#!/bin/bash
# Plan → Think → Action Cycle
# Structured reasoning framework before every autonomous action
# Implements Priority 2.1 from COMPREHENSIVE-TEST-FINDINGS.md
# Inspired by kyegomez/swarms autonomous agent workflow

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_MANAGER="${SCRIPT_DIR}/memory-manager.sh"
CYCLE_LOG="${HOME}/.claude/logs/plan-think-act.jsonl"

mkdir -p "$(dirname "$CYCLE_LOG")"

# ============================================================================
# Plan → Think → Action Cycle
# ============================================================================

run_cycle() {
    local goal="$1"
    local context="${2:-}"
    local action_type="${3:-general}"

    local cycle_id="cycle_$(date +%s)_$$"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # PHASE 1: PLAN
    local plan=$(generate_plan "$goal" "$context" "$action_type")

    # PHASE 2: THINK
    local thinking=$(analyze_approaches "$goal" "$plan" "$context")

    # PHASE 3: ACTION
    local action=$(decide_action "$goal" "$plan" "$thinking")

    # Log complete cycle
    local cycle=$(cat <<EOF
{
  "cycleId": "$cycle_id",
  "timestamp": "$timestamp",
  "goal": "$goal",
  "context": "$context",
  "actionType": "$action_type",
  "plan": $plan,
  "thinking": $thinking,
  "action": $action
}
EOF
)

    echo "$cycle" >> "$CYCLE_LOG"
    echo "$cycle"
}

generate_plan() {
    local goal="$1"
    local context="$2"
    local action_type="$3"

    # Break down goal into steps
    cat <<EOF
{
  "phase": "PLAN",
  "goal": "$goal",
  "steps": [
    "1. Understand current state and requirements",
    "2. Identify necessary resources and tools",
    "3. Break down into sub-tasks",
    "4. Determine dependencies and order",
    "5. Define success criteria"
  ],
  "resources": {
    "tools": ["Read", "Write", "Edit", "Bash", "Grep", "mcp__grep__searchGitHub"],
    "memory": true,
    "context": "$context"
  },
  "estimated_complexity": "$(estimate_complexity "$goal")"
}
EOF
}

estimate_complexity() {
    local goal="$1"

    # Simple heuristic based on keywords
    if echo "$goal" | grep -qiE "(implement|create|build|develop)"; then
        echo "high"
    elif echo "$goal" | grep -qiE "(update|modify|change|fix)"; then
        echo "medium"
    elif echo "$goal" | grep -qiE "(read|check|verify|analyze)"; then
        echo "low"
    else
        echo "medium"
    fi
}

analyze_approaches() {
    local goal="$1"
    local plan="$2"
    local context="$3"

    # Generate alternative approaches
    cat <<EOF
{
  "phase": "THINK",
  "approaches": [
    {
      "id": 1,
      "name": "Direct Implementation",
      "pros": ["Fast", "Straightforward", "Predictable"],
      "cons": ["May miss edge cases", "Less flexible"],
      "confidence": 0.7
    },
    {
      "id": 2,
      "name": "Research-First Approach",
      "pros": ["Learn from examples", "Best practices", "Avoid pitfalls"],
      "cons": ["Takes more time", "May find conflicting patterns"],
      "confidence": 0.85
    },
    {
      "id": 3,
      "name": "Iterative with Testing",
      "pros": ["Verify as you go", "Catch errors early", "High quality"],
      "cons": ["Slower initial progress", "More overhead"],
      "confidence": 0.9
    }
  ],
  "recommended": 2,
  "reasoning": "Research-first provides good balance of speed and quality for autonomous operation"
}
EOF
}

decide_action() {
    local goal="$1"
    local plan="$2"
    local thinking="$3"

    cat <<EOF
{
  "phase": "ACTION",
  "decision": "proceed",
  "approach": "research-first",
  "firstStep": {
    "tool": "mcp__grep__searchGitHub",
    "purpose": "Find similar implementations",
    "query": "$(extract_search_query "$goal")"
  },
  "nextSteps": [
    "Review search results for patterns",
    "Implement based on best examples",
    "Test implementation",
    "Refine based on results"
  ],
  "confidence": 0.85
}
EOF
}

extract_search_query() {
    local goal="$1"

    # Extract key terms for GitHub search
    # This is a simplified version - real implementation would use NLP
    echo "$goal" | sed -E 's/^(implement|create|build|add|update|fix)\s+//i' | \
                   sed -E 's/\s+/ /g' | \
                   head -c 50
}

# ============================================================================
# Cycle Management
# ============================================================================

get_recent_cycles() {
    local limit="${1:-5}"

    if [[ ! -f "$CYCLE_LOG" ]]; then
        echo '[]'
        return
    fi

    tail -n "$limit" "$CYCLE_LOG" | jq -s '.'
}

get_cycle() {
    local cycle_id="$1"

    if [[ ! -f "$CYCLE_LOG" ]]; then
        echo '{"error": "No cycles found"}'
        return
    fi

    jq --arg id "$cycle_id" 'select(.cycleId == $id)' "$CYCLE_LOG"
}

analyze_patterns() {
    if [[ ! -f "$CYCLE_LOG" ]]; then
        echo '{"patterns": []}'
        return
    fi

    # Analyze what approaches work best
    jq -s 'group_by(.action.approach) |
           map({
               approach: .[0].action.approach,
               count: length,
               avg_confidence: (map(.action.confidence) | add / length)
           })' "$CYCLE_LOG"
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    run)
        # run <goal> [context] [action_type]
        goal="${2:-}"
        context="${3:-}"
        action_type="${4:-general}"

        if [[ -z "$goal" ]]; then
            echo "Error: goal required"
            exit 1
        fi

        run_cycle "$goal" "$context" "$action_type"
        ;;

    recent)
        limit="${2:-5}"
        get_recent_cycles "$limit"
        ;;

    get)
        cycle_id="$2"
        get_cycle "$cycle_id"
        ;;

    patterns)
        analyze_patterns
        ;;

    help|*)
        cat <<EOF
Plan → Think → Action Cycle

Usage: plan-think-act.sh <command> [args]

Commands:
  run <goal> [context] [action_type]
      Execute complete PTA cycle
      Example: plan-think-act.sh run "Implement user authentication" "Next.js app" "implementation"

  recent [limit]
      Get recent N cycles (default: 5)

  get <cycle_id>
      Get specific cycle by ID

  patterns
      Analyze which approaches work best

Cycle Phases:
  1. PLAN - Break down goal into steps, identify resources
  2. THINK - Generate alternative approaches, analyze pros/cons
  3. ACTION - Decide best approach and define execution steps

Integration:
  This should be called BEFORE every significant autonomous action.

  Example in autonomous loop:
    # Before implementing feature
    cycle=\$(plan-think-act.sh run "Implement feature X" "\$current_context" "implementation")

    # Extract recommended approach
    approach=\$(echo "\$cycle" | jq -r '.action.approach')
    first_step=\$(echo "\$cycle" | jq -r '.action.firstStep')

    # Execute based on plan
    # ...

Output format:
  {
    "cycleId": "cycle_1768254000_12345",
    "timestamp": "2026-01-12T21:00:00Z",
    "goal": "Implement authentication",
    "plan": {...},
    "thinking": {...},
    "action": {...}
  }
EOF
        ;;
esac
