#!/bin/bash
# Autonomous Command Router
# Intelligently decides when to execute /checkpoint, /compact, /build, etc.
# Usage: autonomous-command-router.sh analyze <context>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_MANAGER="${SCRIPT_DIR}/memory-manager.sh"
LOG_FILE="${HOME}/.claude/logs/command-router.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ============================================================================
# Decision Engine
# ============================================================================

analyze_situation() {
    local trigger="$1"  # checkpoint_files, checkpoint_context, build_progress, etc.
    local context="${2:-}"

    log "Analyzing situation: trigger=$trigger, context=$context"

    # Check if autonomous mode is active
    local autonomous=false
    if [[ -f "${HOME}/.claude/autonomous-mode.active" ]]; then
        autonomous=true
        log "Autonomous mode: ACTIVE"
    else
        log "Autonomous mode: INACTIVE"
    fi

    # Get current state
    local project_dir="$(pwd)"
    local has_buildguide=false
    local has_claude_md=false
    local build_in_progress=false

    [[ -f "buildguide.md" ]] && has_buildguide=true
    [[ -f "CLAUDE.md" ]] && has_claude_md=true
    [[ -f ".claude/current-build.local.md" ]] && build_in_progress=true

    log "State: buildguide=$has_buildguide, claude_md=$has_claude_md, build=$build_in_progress"

    # Decision matrix
    case "$trigger" in
        checkpoint_files)
            # Triggered after N file changes
            if $autonomous; then
                echo '{"command": "checkpoint", "reason": "file_threshold", "auto_execute": true}'
            else
                echo '{"advisory": "Run /checkpoint to save progress after multiple file changes", "reason": "file_threshold", "auto_execute": false}'
            fi
            ;;

        checkpoint_context)
            # Triggered at 40% context usage
            # Note: auto-continue.sh already handles memory compaction before calling this
            if $autonomous; then
                echo '{"command": "checkpoint", "reason": "context_threshold", "auto_execute": true, "note": "Memory already compacted by auto-continue.sh"}'
            else
                echo '{"advisory": "Context at 40%. Run /checkpoint to save progress", "reason": "context_threshold", "auto_execute": false}'
            fi
            ;;

        build_section_complete)
            # Triggered when a build section is marked complete
            if ! $has_buildguide; then
                log "Skipping build checkpoint: buildguide.md not found"
                echo '{"command": "none", "reason": "no_buildguide", "note": "buildguide.md not found in project root"}'
            elif $autonomous; then
                echo '{"command": "checkpoint", "reason": "build_section_complete", "auto_execute": true, "note": "Update buildguide.md section status"}'
            else
                echo '{"advisory": "Build section complete. Run /checkpoint to update buildguide.md", "reason": "build_section_complete", "auto_execute": false}'
            fi
            ;;

        checkpoint_messages)
            # Triggered after N messages (Priority 1.1)
            local message_count="${context:-unknown}"
            if $autonomous; then
                echo '{"command": "checkpoint", "reason": "message_threshold", "auto_execute": true, "note": "Checkpoint after '"$message_count"' messages"}'
            else
                echo '{"advisory": "Checkpoint recommended after '"$message_count"' messages", "reason": "message_threshold", "auto_execute": false}'
            fi
            ;;

        manual)
            # User explicitly requested checkpoint
            echo '{"command": "checkpoint", "reason": "manual_request", "auto_execute": true}'
            ;;

        *)
            log "Unknown trigger: $trigger"
            echo '{"command": "none", "reason": "unknown_trigger"}'
            ;;
    esac
}

# ============================================================================
# Command Executor (for hook integration)
# ============================================================================

execute_if_autonomous() {
    local decision="$1"

    local command
    local auto_execute
    local reason

    command=$(echo "$decision" | jq -r '.command // "none"')
    auto_execute=$(echo "$decision" | jq -r '.auto_execute // false')
    reason=$(echo "$decision" | jq -r '.reason // "unknown"')

    log "Decision: command=$command, auto_execute=$auto_execute, reason=$reason"

    if [[ "$auto_execute" == "true" ]]; then
        # In autonomous mode - output execution signal
        case "$command" in
            checkpoint)
                log "Signaling Claude to execute /checkpoint"
                echo '{"execute_skill": "checkpoint", "reason": "'"$reason"'", "autonomous": true}'
                ;;

            compact_then_checkpoint)
                log "Signaling Claude to execute /compact then /checkpoint"
                echo '{"execute_skill": "compact", "then": "checkpoint", "reason": "'"$reason"'", "autonomous": true}'
                ;;

            *)
                log "No action needed"
                echo '{"execute_skill": "none"}'
                ;;
        esac
    else
        # Not autonomous - output advisory only
        local advisory
        advisory=$(echo "$decision" | jq -r '.advisory // "Checkpoint recommended"')
        log "Advisory mode: $advisory"
        echo '{"advisory": "'"$advisory"'"}'
    fi
}

# ============================================================================
# Main
# ============================================================================

case "${1:-help}" in
    analyze)
        # Analyze situation and return decision
        trigger="${2:-unknown}"
        context="${3:-}"
        analyze_situation "$trigger" "$context"
        ;;

    execute)
        # Analyze and execute if autonomous
        trigger="${2:-unknown}"
        context="${3:-}"
        decision=$(analyze_situation "$trigger" "$context")
        execute_if_autonomous "$decision"
        ;;

    status)
        # Check autonomous mode status
        if [[ -f "${HOME}/.claude/autonomous-mode.active" ]]; then
            echo '{"autonomous": true, "since": "'"$(cat "${HOME}/.claude/autonomous-mode.active")"'"}'
        else
            echo '{"autonomous": false}'
        fi
        ;;

    help|*)
        cat <<EOF
Autonomous Command Router - Intelligent command execution

Usage:
  $0 analyze <trigger> [context]   - Analyze situation and recommend command
  $0 execute <trigger> [context]   - Analyze and execute if autonomous
  $0 status                        - Check autonomous mode status

Triggers:
  checkpoint_files     - After N file changes (default: 10)
  checkpoint_context   - At context threshold (default: 40%)
  build_section_complete - After completing a build section
  manual              - User explicit request

Examples:
  $0 analyze checkpoint_files
  $0 execute checkpoint_context "80000/200000"
  $0 status

Decision Logic:
  - If autonomous mode active: Auto-execute /checkpoint or /compact
  - If normal mode: Output advisory for user
  - Considers: buildguide.md, CLAUDE.md, build state, memory pressure

Integration:
  Call from hooks:
    decision=\$(autonomous-command-router.sh execute checkpoint_files)
    echo "\$decision"  # Hook output for Claude to process
EOF
        ;;
esac
