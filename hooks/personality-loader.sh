#!/bin/bash
# Personality Loader - Custom Agent Personalities
# Implements /personality command backend
# Loads domain-specific configurations and behavioral profiles

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERSONALITIES_DIR="${HOME}/.claude/personalities"
STATE_FILE="${HOME}/.claude/personality-state.json"
LOG_FILE="${HOME}/.claude/logs/personality.log"

# Built-in personalities directory (fallback to repo)
BUILTIN_DIR="${SCRIPT_DIR}/../personalities"

mkdir -p "$PERSONALITIES_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ============================================================================
# Personality Loading
# ============================================================================

load_personality() {
    local name="$1"

    log "Loading personality: $name"

    # Search order: user custom -> built-in
    local config_path=""
    if [[ -f "${PERSONALITIES_DIR}/${name}.yaml" ]]; then
        config_path="${PERSONALITIES_DIR}/${name}.yaml"
    elif [[ -f "${BUILTIN_DIR}/${name}.yaml" ]]; then
        config_path="${BUILTIN_DIR}/${name}.yaml"
    else
        echo "{\"error\": \"Personality not found: $name\"}" >&2
        return 1
    fi

    # Parse YAML and convert to JSON state
    local personality_json=$(parse_yaml_to_json "$config_path" "$name")

    # Update state file
    cat > "$STATE_FILE" <<EOF
{
    "current": "$name",
    "loadedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "configPath": "$config_path",
    "personality": $personality_json
}
EOF

    log "✓ Personality loaded: $name"

    # Return personality prompt for Claude
    generate_personality_prompt "$personality_json"
}

parse_yaml_to_json() {
    local yaml_file="$1"
    local name="$2"

    # Simple YAML parser (handles basic structure)
    # For production, would use yq or python

    local description=$(grep "^description:" "$yaml_file" | sed 's/description: *"\(.*\)"/\1/')
    local focus=$(grep -A 10 "^focus:" "$yaml_file" | grep "^  - " | sed 's/^  - //' | jq -R . | jq -s .)
    local communication_style=$(grep "communication_style:" "$yaml_file" | sed 's/.*communication_style: *"\(.*\)"/\1/')
    local code_style=$(grep "code_style:" "$yaml_file" | sed 's/.*code_style: *"\(.*\)"/\1/')

    cat <<EOF
{
    "name": "$name",
    "description": "$description",
    "focus": $focus,
    "behavior": {
        "communicationStyle": "$communication_style",
        "codeStyle": "$code_style"
    }
}
EOF
}

generate_personality_prompt() {
    local personality_json="$1"

    local name=$(echo "$personality_json" | jq -r '.name')
    local description=$(echo "$personality_json" | jq -r '.description')
    local focus=$(echo "$personality_json" | jq -r '.focus | join(", ")')
    local comm_style=$(echo "$personality_json" | jq -r '.behavior.communicationStyle')

    cat <<EOF

=== PERSONALITY ACTIVE: $name ===

$description

Focus Areas: $focus
Communication Style: $comm_style

You are now operating with the $name personality. Prioritize this domain expertise in your responses and decision-making.

EOF
}

# ============================================================================
# Personality Management
# ============================================================================

list_personalities() {
    log "Listing personalities"

    local personalities=()

    # Built-in personalities
    if [[ -d "$BUILTIN_DIR" ]]; then
        while IFS= read -r file; do
            local basename=$(basename "$file" .yaml)
            personalities+=("$basename")
        done < <(find "$BUILTIN_DIR" -name "*.yaml" -type f 2>/dev/null)
    fi

    # Custom personalities
    if [[ -d "$PERSONALITIES_DIR" ]]; then
        while IFS= read -r file; do
            local basename=$(basename "$file" .yaml)
            personalities+=("$basename")
        done < <(find "$PERSONALITIES_DIR" -name "*.yaml" -type f 2>/dev/null)
    fi

    # Remove duplicates and sort
    local unique=($(printf '%s\n' "${personalities[@]}" | sort -u))

    cat <<EOF
{
    "personalities": $(printf '%s\n' "${unique[@]}" | jq -R . | jq -s .),
    "count": ${#unique[@]},
    "customDir": "$PERSONALITIES_DIR",
    "builtinDir": "$BUILTIN_DIR"
}
EOF
}

get_current() {
    if [[ ! -f "$STATE_FILE" ]]; then
        echo '{"current": "default", "loaded": false}'
        return
    fi

    cat "$STATE_FILE"
}

create_personality() {
    local name="$1"
    local template_path="${PERSONALITIES_DIR}/${name}.yaml"

    if [[ -f "$template_path" ]]; then
        echo "{\"error\": \"Personality already exists: $name\"}" >&2
        return 1
    fi

    log "Creating personality: $name"

    # Create template
    cat > "$template_path" <<'EOF'
name: "PERSONALITY_NAME"
description: "Brief description of this personality"

focus:
  - Primary domain area
  - Secondary domain area
  - Specific technologies

knowledge:
  frameworks: ["Framework1", "Framework2"]
  patterns: ["Pattern1", "Pattern2"]
  tools: ["Tool1", "Tool2"]

behavior:
  communication_style: "concise"  # concise, detailed, beginner-friendly
  code_style: "functional"  # functional, oop, procedural
  testing_preference: "tdd"  # tdd, integration-first, e2e-first
  documentation_level: "comprehensive"  # comprehensive, minimal, inline-only

priorities:
  - Security
  - Performance
  - Maintainability
  - Speed of delivery

constraints:
  - "Never skip error handling"
  - "Always include tests"
  - "Document complex logic"

prompts:
  pre_task: "Before starting, consider..."
  post_task: "After completion, verify..."
EOF

    # Replace name in template
    sed -i.bak "s/PERSONALITY_NAME/$name/" "$template_path" && rm "${template_path}.bak"

    log "✓ Created personality template: $template_path"

    echo "{\"created\": \"$name\", \"path\": \"$template_path\"}"
}

# ============================================================================
# CLI Interface
# ============================================================================

case "${1:-help}" in
    load)
        name="${2:-default}"
        load_personality "$name"
        ;;

    list)
        list_personalities
        ;;

    current)
        get_current
        ;;

    create)
        name="${2:-}"
        if [[ -z "$name" ]]; then
            echo '{"error": "Personality name required"}' >&2
            exit 1
        fi
        create_personality "$name"
        ;;

    edit)
        name="${2:-}"
        if [[ -z "$name" ]]; then
            echo '{"error": "Personality name required"}' >&2
            exit 1
        fi

        config_path="${PERSONALITIES_DIR}/${name}.yaml"
        if [[ ! -f "$config_path" ]]; then
            config_path="${BUILTIN_DIR}/${name}.yaml"
        fi

        if [[ ! -f "$config_path" ]]; then
            echo "{\"error\": \"Personality not found: $name\"}" >&2
            exit 1
        fi

        echo "{\"path\": \"$config_path\", \"editor\": \"Use Read/Edit tools to modify this file\"}"
        ;;

    help|*)
        cat <<EOF
Personality Loader

Usage: personality-loader.sh <command> [args]

Commands:
  load <name>
      Load a personality profile
      Example: personality-loader.sh load security-expert

  list
      List all available personalities (built-in and custom)

  current
      Show currently active personality

  create <name>
      Create a new custom personality from template
      Example: personality-loader.sh create my-specialist

  edit <name>
      Get path to personality config for editing
      Example: personality-loader.sh edit security-expert

Built-in Personalities:
  - default: Balanced general development
  - security-expert: Security and vulnerability focus
  - performance-optimizer: Performance and scalability focus
  - api-architect: API design and best practices
  - frontend-specialist: UI/UX and component design
  - devops-engineer: Infrastructure and deployment
  - data-scientist: Data analysis and ML

Example Workflow:
  # List available personalities
  personality-loader.sh list

  # Load security expert
  personality-loader.sh load security-expert

  # Create custom personality
  personality-loader.sh create ecommerce-expert

  # Edit it
  personality-loader.sh edit ecommerce-expert

  # Load it
  personality-loader.sh load ecommerce-expert

Output:
  - load: Returns personality prompt for Claude
  - list: Returns JSON with all personalities
  - current: Returns JSON with active personality
  - create: Returns path to new template
  - edit: Returns path to config file

State Files:
  - ~/.claude/personality-state.json: Current personality
  - ~/.claude/personalities/*.yaml: Custom personalities
  - ~/Desktop/claude-sovereign/personalities/*.yaml: Built-in personalities
EOF
        ;;
esac
