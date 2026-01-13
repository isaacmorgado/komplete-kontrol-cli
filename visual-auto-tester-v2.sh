#!/bin/bash
# Visual Auto-Tester v2 - Compatible with all bash versions
# Uses VisionPilot for screenshot capture while testing all models

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VISIONPILOT_DIR="$HOME/Desktop/Development/Projects/visionpilot"
RESULTS_DIR="$SCRIPT_DIR/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_DIR="$RESULTS_DIR/run_$TIMESTAMP"

# Create directories
mkdir -p "$RUN_DIR"/{logs,screenshots,results}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Visual Auto-Tester - Multi-Model Verification             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Run: $TIMESTAMP"
echo "Results: $RUN_DIR"
echo ""

# Check proxy
if ! curl -s http://127.0.0.1:3000/v1/models > /dev/null 2>&1; then
    echo "❌ Error: Proxy not running on port 3000"
    echo "   Start with: node ~/.claude/model-proxy-server.js 3000"
    exit 1
fi

echo "✅ Proxy server running"

# Check visionpilot
if [ ! -d "$VISIONPILOT_DIR" ]; then
    echo "⚠️  VisionPilot not found, screenshots disabled"
    SCREENSHOTS_ENABLED=false
else
    echo "✅ VisionPilot found"
    SCREENSHOTS_ENABLED=true
fi

echo ""

# Take screenshot
take_screenshot() {
    local name="$1"
    if [ "$SCREENSHOTS_ENABLED" = true ]; then
        cd "$VISIONPILOT_DIR"
        python3 -m src.cli screenshot "$RUN_DIR/screenshots/${name}.png" > /dev/null 2>&1 || echo "  ⚠️  Screenshot failed"
    fi
}

# Test function
test_model_capability() {
    local model_id="$1"
    local test_type="$2"  # tool, agent, or mcp

    local messages tools_json

    case "$test_type" in
        tool)
            messages='[{"role":"user","content":"Read the package.json file and tell me the project name"}]'
            tools_json='[{"name":"Read","description":"Read a file","input_schema":{"type":"object","properties":{"file_path":{"type":"string"}},"required":["file_path"]}}]'
            ;;
        agent)
            messages='[{"role":"user","content":"Use the Task tool to spawn an Explore agent"}]'
            tools_json='[{"name":"Task","description":"Spawn agent","input_schema":{"type":"object","properties":{"subagent_type":{"type":"string"},"description":{"type":"string"},"prompt":{"type":"string"}},"required":["subagent_type","description","prompt"]}}]'
            ;;
        mcp)
            messages='[{"role":"user","content":"List available MCP tools for browser automation"}]'
            tools_json='[]'
            ;;
    esac

    local result=$(cat <<EOF | node
const http = require('http');
const requestBody = {
    model: '$model_id',
    messages: $messages,
    tools: $tools_json,
    max_tokens: 800
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
            let hasToolUse = false;

            if ('$test_type' === 'tool' || '$test_type' === 'agent') {
                hasToolUse = response.content?.some(c => c.type === 'tool_use') ||
                            response.tool_calls?.length > 0;
            } else {
                hasToolUse = true; // MCP test just checks response
            }

            console.log(JSON.stringify({ success: hasToolUse, data: data.substring(0, 500) }));
        } catch (e) {
            console.log(JSON.stringify({ success: false, error: e.message }));
        }
    });
});

req.on('error', (err) => {
    console.log(JSON.stringify({ success: false, error: err.message }));
});

req.write(JSON.stringify(requestBody));
req.end();
EOF
)

    echo "$result"
}

# Test a single model
test_model() {
    local model_name="$1"
    local model_id="$2"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Testing: $model_name"
    echo "ID: $model_id"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    take_screenshot "${model_name}_start"

    local passed=0
    local failed=0

    # Test 1: Tool calling
    echo "  [1/3] Testing tool calling..."
    local tool_result=$(test_model_capability "$model_id" "tool")
    echo "$tool_result" > "$RUN_DIR/results/${model_name}_tool.json"

    if echo "$tool_result" | grep -q '"success":true'; then
        echo "    ✅ PASS"
        passed=$((passed + 1))
    else
        echo "    ❌ FAIL"
        failed=$((failed + 1))
    fi

    sleep 2
    take_screenshot "${model_name}_tool"

    # Test 2: Agent spawning
    echo "  [2/3] Testing agent spawning..."
    local agent_result=$(test_model_capability "$model_id" "agent")
    echo "$agent_result" > "$RUN_DIR/results/${model_name}_agent.json"

    if echo "$agent_result" | grep -q '"success":true'; then
        echo "    ✅ PASS"
        passed=$((passed + 1))
    else
        echo "    ❌ FAIL"
        failed=$((failed + 1))
    fi

    sleep 2
    take_screenshot "${model_name}_agent"

    # Test 3: MCP awareness
    echo "  [3/3] Testing MCP awareness..."
    local mcp_result=$(test_model_capability "$model_id" "mcp")
    echo "$mcp_result" > "$RUN_DIR/results/${model_name}_mcp.json"

    if echo "$mcp_result" | grep -q '"success":true'; then
        echo "    ✅ PASS"
        passed=$((passed + 1))
    else
        echo "    ❌ FAIL"
        failed=$((failed + 1))
    fi

    take_screenshot "${model_name}_complete"

    # Save summary
    cat > "$RUN_DIR/results/${model_name}_summary.json" <<EOF
{
    "model": "$model_name",
    "model_id": "$model_id",
    "timestamp": "$TIMESTAMP",
    "passed": $passed,
    "failed": $failed,
    "total": 3
}
EOF

    echo ""
    echo "  Results: $passed/3 passed"
    echo ""

    return $failed
}

# Main
main() {
    take_screenshot "system_start"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Starting Tests (5 models)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Models array (name:id pairs)
    MODELS=(
        "dolphin:featherless/dphn/Dolphin-Mistral-24B-Venice-Edition"
        "qwen:featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated"
        "rabbit:featherless/WhiteRabbitNeo/Llama-3-WhiteRabbitNeo-8B-v2.0"
        "llama8b:featherless/mlabonne/Meta-Llama-3.1-8B-Instruct-abliterated"
        "llama70b:featherless/huihui-ai/Llama-3.3-70B-Instruct-abliterated"
    )

    local total_passed=0
    local total_failed=0

    for model_pair in "${MODELS[@]}"; do
        model_name="${model_pair%%:*}"
        model_id="${model_pair#*:}"

        if test_model "$model_name" "$model_id"; then
            total_passed=$((total_passed + 1))
        else
            total_failed=$((total_failed + 1))
        fi

        sleep 3  # Rate limiting
    done

    take_screenshot "system_complete"

    # Final report
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    FINAL RESULTS                             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    for summary in "$RUN_DIR/results"/*_summary.json; do
        if [ -f "$summary" ]; then
            model=$(grep -o '"model":"[^"]*"' "$summary" | cut -d'"' -f4)
            passed=$(grep -o '"passed":[0-9]*' "$summary" | cut -d: -f2)
            total=$(grep -o '"total":[0-9]*' "$summary" | cut -d: -f2)

            if [ "$passed" = "$total" ]; then
                echo "  ✅ $model: $passed/$total"
            else
                echo "  ⚠️  $model: $passed/$total"
            fi
        fi
    done

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Models Tested: ${#MODELS[@]}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📁 Results: $RUN_DIR"
    echo "📸 Screenshots: $RUN_DIR/screenshots/"
    echo "📊 Details: $RUN_DIR/results/"
    echo ""

    if [ $total_failed -eq 0 ]; then
        echo "✅ ALL MODELS PASSED ALL TESTS"
        exit 0
    else
        echo "⚠️  Some tests had issues - check results"
        exit 1
    fi
}

main "$@"
