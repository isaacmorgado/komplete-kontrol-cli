#!/bin/bash
# Auto Mode Hook - Implements /auto command logic
# Integrates with autonomous-command-router.sh for intelligent command execution

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTONOMOUS_MODE_FILE="${HOME}/.claude/autonomous-mode.active"
COMMAND_ROUTER="${SCRIPT_DIR}/autonomous-command-router.sh"
MEMORY_MANAGER="${SCRIPT_DIR}/memory-manager.sh"
COORDINATOR="${SCRIPT_DIR}/coordinator.sh"
LOG_FILE="${HOME}/.claude/logs/auto.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ============================================================================
# Autonomous Mode Management
# ============================================================================

activate_autonomous() {
    local task="${1:-}"

    log "Activating autonomous mode${task:+ with task: $task}"

    # Create activation file with timestamp
    echo "$(date +%s)" > "$AUTONOMOUS_MODE_FILE"

    # Report activation
    cat <<EOF
🤖 AUTONOMOUS MODE ACTIVATED

I will now work fully autonomously:
- Execute tasks without asking for confirmation
- Auto-checkpoint progress every 10 changes
- Auto-fix errors (retry up to 3 times)
- Continue until task is complete or blocked

To stop: Say "stop" or run /auto stop
EOF

    # Load working memory
    if [[ -x "$MEMORY_MANAGER" ]]; then
        log "Loading working memory"
        "$MEMORY_MANAGER" get-working 2>/dev/null || true
    fi

    # Determine what to do next
    determine_next_action "$task"
}

deactivate_autonomous() {
    log "Deactivating autonomous mode"

    # Remove activation file
    rm -f "$AUTONOMOUS_MODE_FILE" 2>/dev/null

    # Report deactivation
    cat <<EOF
✅ Autonomous mode deactivated

Claude is now in normal interactive mode.
- Will ask for confirmation before major actions
- Will wait for your instructions
- Use /auto or /auto start to re-enable autonomous mode
EOF
}

check_status() {
    if [[ -f "$AUTONOMOUS_MODE_FILE" ]]; then
        local since=$(cat "$AUTONOMOUS_MODE_FILE")
        local duration=$(($(date +%s) - since))
        local hours=$((duration / 3600))
        local minutes=$(((duration % 3600) / 60))

        echo "ACTIVE (running for ${hours}h ${minutes}m)"
        return 0
    else
        echo "INACTIVE"
        return 1
    fi
}

# ============================================================================
# Action Determination (Priority Order)
# ============================================================================

determine_next_action() {
    local provided_task="$1"

    log "Determining next action..."

    # Priority 1: Continuation Prompt
    if check_continuation_prompt; then
        log "Found continuation prompt - executing immediately"
        return 0
    fi

    # Priority 2: In-Progress Build
    if check_in_progress_build; then
        log "Found in-progress build - resuming"
        return 0
    fi

    # Priority 3: Build Guide
    if check_build_guide; then
        log "Found build guide - starting from first unchecked section"
        return 0
    fi

    # Priority 4: Active Task in Memory
    if check_memory_task; then
        log "Found active task in memory - continuing"
        return 0
    fi

    # Priority 5: User Provided Task
    if [[ -n "$provided_task" ]]; then
        log "Executing user-provided task: $provided_task"
        return 0
    fi

    # No task found
    log "No task found - waiting for instructions"
    cat <<EOF

No active task found. Please provide a task to work on autonomously,
or check the following:
- .claude/continuation-prompt.md
- .claude/current-build.local.md
- buildguide.md
- Working memory

EOF
}

check_continuation_prompt() {
    local continuation_prompt=""
    if [[ -f ".claude/continuation-prompt.md" ]]; then
        continuation_prompt=".claude/continuation-prompt.md"
    elif [[ -f "${HOME}/.claude/continuation-prompt.md" ]]; then
        continuation_prompt="${HOME}/.claude/continuation-prompt.md"
    fi

    if [[ -n "$continuation_prompt" ]]; then
        log "Continuation prompt found at: $continuation_prompt"
        cat "$continuation_prompt"
        return 0
    fi

    return 1
}

check_in_progress_build() {
    local build_file=".claude/current-build.local.md"

    if [[ -f "$build_file" ]]; then
        local phase=$(grep -i "^## Phase:" "$build_file" | head -1 | sed 's/^## Phase: //' || echo "unknown")
        local status=$(grep -i "^## Status:" "$build_file" | head -1 | sed 's/^## Status: //' || echo "unknown")

        if [[ "$status" != "complete" ]]; then
            log "In-progress build found: phase=$phase, status=$status"
            cat <<EOF

## In-Progress Build Detected

**Phase**: $phase
**Status**: $status

Resuming from: $build_file

EOF
            return 0
        fi
    fi

    return 1
}

check_build_guide() {
    local guide_file="buildguide.md"

    if [[ -f "$guide_file" ]]; then
        # Find first unchecked section
        local unchecked=$(grep -n "^\- \[ \]" "$guide_file" | head -5)

        if [[ -n "$unchecked" ]]; then
            log "Build guide found with unchecked sections"
            cat <<EOF

## Build Guide Detected

Found unchecked sections in: $guide_file

$unchecked

Starting from first unchecked section.

EOF
            return 0
        fi
    fi

    return 1
}

check_memory_task() {
    if [[ -x "$MEMORY_MANAGER" ]]; then
        local current_task=$("$MEMORY_MANAGER" get-current-task 2>/dev/null || echo "")

        if [[ -n "$current_task" ]]; then
            log "Current task from memory: $current_task"
            cat <<EOF

## Active Task from Memory

$current_task

Continuing from memory state.

EOF
            return 0
        fi
    fi

    return 1
}

# ============================================================================
# Integration with Autonomous Command Router
# ============================================================================

check_autonomous_triggers() {
    local action="$1"
    local context="${2:-}"

    log "Checking autonomous triggers for action: $action"

    if [[ ! -x "$COMMAND_ROUTER" ]]; then
        log "Command router not available"
        return 1
    fi

    # Determine trigger type based on action
    local trigger="manual"
    case "$action" in
        checkpoint_files)
            trigger="checkpoint_files"
            ;;
        checkpoint_context)
            trigger="checkpoint_context"
            ;;
        build_section_complete)
            trigger="build_section_complete"
            ;;
        *)
            trigger="manual"
            ;;
    esac

    # Get decision from router
    local decision
    decision=$("$COMMAND_ROUTER" execute "$trigger" "$context" 2>/dev/null || echo '{"execute_skill":"none"}')

    log "Router decision: $decision"

    # Output decision for Claude to process
    echo "$decision"
}

# ============================================================================
# Auto-Continue Integration
# ============================================================================

auto_continue() {
    log "Auto-continue triggered"

    # Check if autonomous mode is active
    if ! check_status >/dev/null 2>&1; then
        log "Auto-continue: Not in autonomous mode, skipping"
        return 0
    fi

    # Check context threshold
    local context_usage="${1:-unknown}"
    log "Context usage: $context_usage"

    # At 40% context, compact then checkpoint
    if [[ "$context_usage" =~ ^40% ]] || [[ "$context_usage" =~ ^[4][0-9]% ]]; then
        log "Context at 40% - triggering compact then checkpoint"
        check_autonomous_triggers "checkpoint_context" "$context_usage"
        return 0
    fi

    # After N file changes, checkpoint
    local file_changes="${2:-0}"
    if [[ $file_changes -ge 10 ]]; then
        log "File changes threshold reached: $file_changes"
        check_autonomous_triggers "checkpoint_files" "changes:$file_changes"
        return 0
    fi

    log "No autonomous triggers needed"
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    start|"")
        activate_autonomous "${2:-}"
        ;;

    stop)
        deactivate_autonomous
        ;;

    status)
        check_status
        ;;

    check-continue)
        auto_continue "${2:-}" "${3:-}"
        ;;

    trigger)
        check_autonomous_triggers "${2:-manual}" "${3:-}"
        ;;

    next-action)
        determine_next_action "${2:-}"
        ;;

    help|*)
        cat <<EOF
Auto Mode Hook - /auto command implementation

Usage: $0 <command> [args]

Commands:
  start [task]         - Activate autonomous mode (optionally with task)
  stop                  - Deactivate autonomous mode
  status                - Check if autonomous mode is active
  check-continue <ctx> <changes>
                        - Check if autonomous triggers are needed
  trigger <type> [context]
                        - Manually trigger autonomous command router
  next-action [task]     - Determine what action to take next

Integration:
  - Integrates with autonomous-command-router.sh for intelligent decisions
  - Supports both autonomous (auto-execute) and advisory modes
  - Returns JSON signals: {"execute_skill": "...", "autonomous": true}

Examples:
  $0 start "Implement authentication"
  $0 status
  $0 check-continue "40%" "12"
  $0 trigger checkpoint_files "changes:10"
EOF
        ;;
esac
