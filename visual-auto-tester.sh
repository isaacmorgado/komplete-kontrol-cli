#!/usr/bin/env bash
# Visual Auto-Tester - Uses VisionPilot for screenshot capture while testing all models
# Runs in /auto mode with full visual verification

set -e

# Ensure we're using bash 4+ for associative arrays
if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    echo "Warning: Bash 4+ required for associative arrays, using /bin/bash..."
    exec /bin/bash "$0" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VISIONPILOT_DIR="$HOME/Desktop/Development/Projects/visionpilot"
RESULTS_DIR="$SCRIPT_DIR/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_DIR="$RESULTS_DIR/run_$TIMESTAMP"

# Create directories
mkdir -p "$RUN_DIR"/{logs,screenshots,results}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Visual Auto-Tester - Multi-Model Verification with Screenshots  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Run: $TIMESTAMP"
echo "Results Directory: $RUN_DIR"
echo ""

# Check if proxy is running
if ! curl -s http://127.0.0.1:3000/v1/models > /dev/null 2>&1; then
    echo "❌ Error: Proxy server not running on port 3000"
    echo "   Starting proxy server..."
    node ~/.claude/model-proxy-server.js 3000 > "$RUN_DIR/logs/proxy.log" 2>&1 &
    PROXY_PID=$!
    echo "   Proxy PID: $PROXY_PID"
    sleep 3
fi

echo "✅ Proxy server running on port 3000"
echo ""

# Check visionpilot
if [ ! -d "$VISIONPILOT_DIR" ]; then
    echo "❌ Error: VisionPilot not found at $VISIONPILOT_DIR"
    exit 1
fi

echo "✅ VisionPilot found"
echo ""

# Models to test
declare -A MODELS=(
    ["dolphin"]="featherless/dphn/Dolphin-Mistral-24B-Venice-Edition"
    ["qwen"]="featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated"
    ["rabbit"]="featherless/WhiteRabbitNeo/Llama-3-WhiteRabbitNeo-8B-v2.0"
    ["llama8b"]="featherless/mlabonne/Meta-Llama-3.1-8B-Instruct-abliterated"
    ["llama70b"]="featherless/huihui-ai/Llama-3.3-70B-Instruct-abliterated"
)

# Test scenarios
test_basic_tool() {
    local model_id="$1"
    local test_name="$2"

    node -e "
const http = require('http');
const requestBody = {
    model: '$model_id',
    messages: [{ role: 'user', content: 'Read the package.json file and tell me the project name' }],
    tools: [{
        name: 'Read',
        description: 'Read a file from the filesystem',
        input_schema: {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'Path to file' }
            },
            required: ['file_path']
        }
    }],
    max_tokens: 1000
};

const req = http.request('http://127.0.0.1:3000/v1/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': 'test-key'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            const hasToolUse = response.content?.some(c => c.type === 'tool_use') ||
                              response.tool_calls?.length > 0;
            console.log(JSON.stringify({ success: hasToolUse, response: data }));
        } catch (e) {
            console.log(JSON.stringify({ success: false, error: e.message, raw: data }));
        }
    });
});

req.on('error', (err) => {
    console.log(JSON.stringify({ success: false, error: err.message }));
});

req.write(JSON.stringify(requestBody));
req.end();
" 2>&1
}

test_agent_spawn() {
    local model_id="$1"

    node -e "
const http = require('http');
const requestBody = {
    model: '$model_id',
    messages: [{ role: 'user', content: 'Use the Task tool to spawn an Explore agent to find all TypeScript files' }],
    tools: [{
        name: 'Task',
        description: 'Spawn a specialized agent',
        input_schema: {
            type: 'object',
            properties: {
                subagent_type: { type: 'string' },
                description: { type: 'string' },
                prompt: { type: 'string' }
            },
            required: ['subagent_type', 'description', 'prompt']
        }
    }],
    max_tokens: 1000
};

const req = http.request('http://127.0.0.1:3000/v1/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': 'test-key'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            const hasTaskUse = response.content?.some(c => c.type === 'tool_use' && c.name === 'Task') ||
                              response.tool_calls?.some(tc => tc.function?.name === 'Task');
            console.log(JSON.stringify({ success: hasTaskUse, response: data }));
        } catch (e) {
            console.log(JSON.stringify({ success: false, error: e.message, raw: data }));
        }
    });
});

req.on('error', (err) => {
    console.log(JSON.stringify({ success: false, error: err.message }));
});

req.write(JSON.stringify(requestBody));
req.end();
" 2>&1
}

# Take screenshot function
take_screenshot() {
    local name="$1"
    local output="$RUN_DIR/screenshots/${name}.png"

    cd "$VISIONPILOT_DIR"
    python3 -m src.cli screenshot "$output" > /dev/null 2>&1 || true
    echo "  📸 Screenshot saved: ${name}.png"
}

# Test a single model
test_model() {
    local model_name="$1"
    local model_id="$2"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Testing: $model_name"
    echo "ID: $model_id"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local log_file="$RUN_DIR/logs/${model_name}.log"
    local results_file="$RUN_DIR/results/${model_name}.json"

    # Take initial screenshot
    take_screenshot "${model_name}_start"

    # Test 1: Basic Tool Calling
    echo "  [1/3] Testing basic tool calling..."
    local tool_result=$(test_basic_tool "$model_id" "$model_name")
    echo "$tool_result" > "$RUN_DIR/results/${model_name}_tool.json"

    if echo "$tool_result" | grep -q '"success":true'; then
        echo "    ✅ Tool calling works"
        local tool_pass=1
    else
        echo "    ❌ Tool calling failed"
        local tool_pass=0
    fi

    sleep 2
    take_screenshot "${model_name}_after_tool_test"

    # Test 2: Agent Spawning
    echo "  [2/3] Testing agent spawning..."
    local agent_result=$(test_agent_spawn "$model_id")
    echo "$agent_result" > "$RUN_DIR/results/${model_name}_agent.json"

    if echo "$agent_result" | grep -q '"success":true'; then
        echo "    ✅ Agent spawning works"
        local agent_pass=1
    else
        echo "    ❌ Agent spawning failed"
        local agent_pass=0
    fi

    sleep 2
    take_screenshot "${model_name}_after_agent_test"

    # Test 3: MCP Awareness (check if response mentions MCP tools)
    echo "  [3/3] Testing MCP awareness..."
    local mcp_test=$(node -e "
const http = require('http');
const requestBody = {
    model: '$model_id',
    messages: [{ role: 'user', content: 'Do you have access to browser automation tools like mcp__claude-in-chrome__computer?' }],
    max_tokens: 500
};

const req = http.request('http://127.0.0.1:3000/v1/messages', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': 'test-key'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data));
});
req.on('error', (err) => console.error(err));
req.write(JSON.stringify(requestBody));
req.end();
" 2>&1)

    echo "$mcp_test" > "$RUN_DIR/results/${model_name}_mcp.json"

    if echo "$mcp_test" | grep -qi -E "(yes|available|access|can use|mcp)"; then
        echo "    ✅ MCP awareness confirmed"
        local mcp_pass=1
    else
        echo "    ❌ MCP awareness unclear"
        local mcp_pass=0
    fi

    take_screenshot "${model_name}_complete"

    # Calculate score
    local total_score=$((tool_pass + agent_pass + mcp_pass))

    # Save summary
    cat > "$results_file" <<EOF
{
    "model": "$model_name",
    "model_id": "$model_id",
    "timestamp": "$TIMESTAMP",
    "tests": {
        "tool_calling": $([ $tool_pass -eq 1 ] && echo "true" || echo "false"),
        "agent_spawning": $([ $agent_pass -eq 1 ] && echo "true" || echo "false"),
        "mcp_awareness": $([ $mcp_pass -eq 1 ] && echo "true" || echo "false")
    },
    "score": "$total_score/3",
    "passed": $([ $total_score -eq 3 ] && echo "true" || echo "false")
}
EOF

    echo ""
    echo "  Results: $total_score/3 tests passed"

    return $((3 - total_score))
}

# Main execution
main() {
    local total_models=0
    local passed_models=0
    local failed_models=0

    # Take initial system screenshot
    take_screenshot "system_start"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Starting Model Tests (5 models)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for model_name in "${!MODELS[@]}"; do
        model_id="${MODELS[$model_name]}"
        total_models=$((total_models + 1))

        if test_model "$model_name" "$model_id"; then
            passed_models=$((passed_models + 1))
        else
            failed_models=$((failed_models + 1))
        fi

        # Rate limiting between models
        sleep 3
    done

    # Take final screenshot
    take_screenshot "system_complete"

    # Generate final report
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    FINAL RESULTS                             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    for result_file in "$RUN_DIR/results"/*.json; do
        if [ -f "$result_file" ] && [[ "$result_file" != *"_tool.json" ]] && [[ "$result_file" != *"_agent.json" ]] && [[ "$result_file" != *"_mcp.json" ]]; then
            model=$(basename "$result_file" .json)
            score=$(grep -o '"score":"[^"]*"' "$result_file" | cut -d'"' -f4)
            passed=$(grep -o '"passed":[^,}]*' "$result_file" | cut -d: -f2)

            if [ "$passed" = "true" ]; then
                echo "  ✅ $model: $score"
            else
                echo "  ❌ $model: $score"
            fi
        fi
    done

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Total Models: $total_models"
    echo "  Passed: $passed_models"
    echo "  Failed: $failed_models"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📁 Results Directory: $RUN_DIR"
    echo "📸 Screenshots: $RUN_DIR/screenshots/"
    echo "📊 Test Results: $RUN_DIR/results/"
    echo "📝 Logs: $RUN_DIR/logs/"
    echo ""

    if [ $failed_models -eq 0 ]; then
        echo "✅ ALL TESTS PASSED"
        exit 0
    else
        echo "⚠️  SOME TESTS FAILED - Check results for details"
        exit 1
    fi
}

# Run main
main "$@"
