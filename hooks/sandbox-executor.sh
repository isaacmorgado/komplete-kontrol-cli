#!/bin/bash
# Isolated Execution Sandbox
# Executes code safely in Docker containers
# Implements Priority 2.3 from COMPREHENSIVE-TEST-FINDINGS.md
# Inspired by OpenBMB/XAgent isolated execution

set -euo pipefail

SANDBOX_IMAGE="${SANDBOX_IMAGE:-ubuntu:22.04}"
SANDBOX_TIMEOUT="${SANDBOX_TIMEOUT:-300}"  # 5 minutes default
LOG_FILE="${HOME}/.claude/logs/sandbox.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo '{"error": "Docker not installed", "available": false}'
        return 1
    fi

    if ! docker info &> /dev/null; then
        echo '{"error": "Docker daemon not running", "available": false}'
        return 1
    fi

    echo '{"available": true}'
    return 0
}

# Execute command in sandbox
execute() {
    local command="$1"
    local workdir="${2:-.}"
    local timeout="${3:-$SANDBOX_TIMEOUT}"

    log "Executing in sandbox: $command"

    # Create temporary directory for execution
    local exec_dir=$(mktemp -d)
    local output_file="$exec_dir/output.txt"
    local error_file="$exec_dir/error.txt"
    local exit_code_file="$exec_dir/exit_code.txt"

    # Run in Docker with timeout
    local container_id=$(docker run -d \
        --rm \
        --network none \
        --memory="512m" \
        --cpus="1.0" \
        --read-only \
        --tmpfs /tmp:rw,noexec,nosuid,size=100m \
        -w /workspace \
        "$SANDBOX_IMAGE" \
        /bin/bash -c "timeout $timeout bash -c '$command' > /tmp/output.txt 2> /tmp/error.txt; echo \$? > /tmp/exit_code.txt")

    log "Container ID: $container_id"

    # Wait for completion or timeout
    docker wait "$container_id" > /dev/null 2>&1 || true

    # Get results
    docker cp "$container_id:/tmp/output.txt" "$output_file" 2>/dev/null || echo "" > "$output_file"
    docker cp "$container_id:/tmp/error.txt" "$error_file" 2>/dev/null || echo "" > "$error_file"
    docker cp "$container_id:/tmp/exit_code.txt" "$exit_code_file" 2>/dev/null || echo "1" > "$exit_code_file"

    local stdout=$(cat "$output_file")
    local stderr=$(cat "$error_file")
    local exit_code=$(cat "$exit_code_file")

    # Cleanup
    rm -rf "$exec_dir"

    # Return result
    cat <<EOF
{
  "success": $([ "$exit_code" -eq 0 ] && echo "true" || echo "false"),
  "exitCode": $exit_code,
  "stdout": $(echo "$stdout" | jq -Rs .),
  "stderr": $(echo "$stderr" | jq -Rs .),
  "containerId": "$container_id"
}
EOF
}

# Status check
status() {
    local docker_status=$(check_docker)

    cat <<EOF
{
  "sandbox": "docker",
  "image": "$SANDBOX_IMAGE",
  "timeout": $SANDBOX_TIMEOUT,
  "docker": $docker_status
}
EOF
}

case "${1:-help}" in
    exec)
        command="${2:-echo 'No command provided'}"
        workdir="${3:-.}"
        timeout="${4:-$SANDBOX_TIMEOUT}"
        execute "$command" "$workdir" "$timeout"
        ;;

    status)
        status
        ;;

    check)
        check_docker
        ;;

    help|*)
        cat <<EOF
Isolated Execution Sandbox

Usage: sandbox-executor.sh <command> [args]

Commands:
  exec <command> [workdir] [timeout]
      Execute command in isolated Docker container
      Example: sandbox-executor.sh exec "python test.py" . 60

  status
      Check sandbox status and configuration

  check
      Check if Docker is available

Safety Features:
  - Network disabled (--network none)
  - Memory limited (512MB)
  - CPU limited (1 core)
  - Read-only filesystem
  - Temporary filesystem for /tmp only
  - Timeout enforcement

Example:
  # Safe Python execution
  sandbox-executor.sh exec "python -c 'print(1+1)'"

  # With timeout
  sandbox-executor.sh exec "sleep 100" . 5  # Will timeout after 5 seconds

Output format:
  {
    "success": true,
    "exitCode": 0,
    "stdout": "2\\n",
    "stderr": "",
    "containerId": "abc123..."
  }

Note: Requires Docker installed and running
EOF
        ;;
esac
