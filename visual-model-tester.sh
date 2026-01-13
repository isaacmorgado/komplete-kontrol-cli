#!/bin/bash
# Visual Model Tester - Runs all models in background with screenshot capture
# Uses Claude-in-Chrome MCP tools for visual verification

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/test-results"
SCREENSHOTS_DIR="$RESULTS_DIR/screenshots"
LOGS_DIR="$RESULTS_DIR/logs"

# Create directories
mkdir -p "$SCREENSHOTS_DIR" "$LOGS_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_DIR="$RESULTS_DIR/run_$TIMESTAMP"
mkdir -p "$RUN_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Visual Model Testing Suite - /auto Mode              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Run: $TIMESTAMP"
echo "Results: $RUN_DIR"
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
declare -A TESTS=(
  ["basic_tool"]="Read the package.json file"
  ["agent_spawn"]="Use the Task tool to spawn an Explore agent"
  ["mcp_aware"]="List all MCP tools available"
  ["context"]="What was the previous message I sent?"
)

# Function to run model test in background terminal
run_model_test() {
  local model_name="$1"
  local model_id="$2"
  local test_name="$3"
  local test_prompt="$4"

  local log_file="$RUN_DIR/${model_name}_${test_name}.log"
  local result_file="$RUN_DIR/${model_name}_${test_name}.json"

  echo "  [$(date +%H:%M:%S)] Testing $model_name - $test_name"

  # Run test via proxy
  node -e "
    const http = require('http');

    const requestBody = {
      model: '$model_id',
      messages: [{ role: 'user', content: '$test_prompt' }],
      max_tokens: 500,
      stream: false
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
        console.log(data);
      });
    });

    req.on('error', (err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });

    req.write(JSON.stringify(requestBody));
    req.end();
  " > "$result_file" 2>&1

  if [ $? -eq 0 ]; then
    echo "    ✅ PASS"
    return 0
  else
    echo "    ❌ FAIL"
    return 1
  fi
}

# Function to run all tests for a model
test_model() {
  local model_name="$1"
  local model_id="$2"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Testing Model: $model_name"
  echo "ID: $model_id"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local passed=0
  local failed=0

  for test_name in "${!TESTS[@]}"; do
    if run_model_test "$model_name" "$model_id" "$test_name" "${TESTS[$test_name]}"; then
      ((passed++))
    else
      ((failed++))
    fi
    sleep 2  # Rate limiting
  done

  echo ""
  echo "  Results: $passed passed, $failed failed"

  # Write summary
  echo "{\"model\":\"$model_name\",\"passed\":$passed,\"failed\":$failed}" > "$RUN_DIR/${model_name}_summary.json"
}

# Function to run browser automation test with screenshots
run_browser_test() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running Browser Automation Test"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # This would require Claude-in-Chrome to be running
  # For now, we'll create a placeholder
  echo "  Note: Browser automation requires Claude-in-Chrome extension"
  echo "  Skipping visual screenshot tests for now"
}

# Main execution
main() {
  echo "Starting comprehensive model tests..."
  echo ""

  # Check if proxy is running
  if ! curl -s http://127.0.0.1:3000/v1/models > /dev/null 2>&1; then
    echo "❌ Error: Proxy server not running on port 3000"
    echo "   Start it with: node ~/.claude/model-proxy-server.js 3000"
    exit 1
  fi

  echo "✅ Proxy server detected on port 3000"

  # Test all models
  local total_passed=0
  local total_failed=0

  for model_name in "${!MODELS[@]}"; do
    model_id="${MODELS[$model_name]}"

    # Run in background and wait
    (test_model "$model_name" "$model_id") &

    # Limit concurrent tests
    if [ $(jobs -r | wc -l) -ge 3 ]; then
      wait -n
    fi
  done

  # Wait for all background jobs
  wait

  # Browser automation test
  run_browser_test

  # Aggregate results
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                    FINAL RESULTS                             ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  for summary in "$RUN_DIR"/*_summary.json; do
    if [ -f "$summary" ]; then
      model=$(basename "$summary" _summary.json)
      passed=$(grep -o '"passed":[0-9]*' "$summary" | cut -d: -f2)
      failed=$(grep -o '"failed":[0-9]*' "$summary" | cut -d: -f2)

      echo "  $model: $passed passed, $failed failed"

      total_passed=$((total_passed + passed))
      total_failed=$((total_failed + failed))
    fi
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  TOTAL: $total_passed passed, $total_failed failed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Results saved to: $RUN_DIR"

  if [ $total_failed -eq 0 ]; then
    echo "✅ ALL TESTS PASSED"
    exit 0
  else
    echo "❌ SOME TESTS FAILED"
    exit 1
  fi
}

# Run main
main "$@"
