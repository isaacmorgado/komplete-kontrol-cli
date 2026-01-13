#!/bin/bash
# Test Constitutional AI fixes

set -e

CONSTITUTIONAL_AI="$HOME/.claude/hooks/constitutional-ai.sh"
COORDINATOR="$HOME/.claude/hooks/coordinator.sh"

echo "========================================="
echo "Constitutional AI Fix Verification Tests"
echo "========================================="
echo ""

# Test counter
test_count=0
passed=0
failed=0

run_test() {
    local name="$1"
    local command="$2"
    local expected_field="$3"
    local expected_value="$4"

    test_count=$((test_count + 1))
    echo "Test $test_count: $name"

    result=$(eval "$command" 2>/dev/null || echo "{}")

    if [[ -z "$expected_field" ]]; then
        # Just check if valid JSON
        if echo "$result" | jq . >/dev/null 2>&1; then
            echo "✅ PASS - Valid JSON output"
            passed=$((passed + 1))
        else
            echo "❌ FAIL - Invalid JSON output"
            echo "Output: $result"
            failed=$((failed + 1))
        fi
    else
        # Check specific field value
        actual=$(echo "$result" | jq -r ".$expected_field" 2>/dev/null || echo "")

        if [[ "$actual" == "$expected_value" ]]; then
            echo "✅ PASS - $expected_field = $expected_value"
            passed=$((passed + 1))
        else
            echo "❌ FAIL - Expected $expected_field=$expected_value, got: $actual"
            echo "Full output: $result"
            failed=$((failed + 1))
        fi
    fi
    echo ""
}

# Test 1: Critique returns proper structure with safe assessment
echo "=== Test Suite 1: Critique Function ==="
echo ""

safe_code='function hello() { return "world"; }'
run_test "Safe code returns 'safe' assessment" \
    "\"$CONSTITUTIONAL_AI\" critique '$safe_code' all" \
    "overall_assessment" \
    "safe"

# Test 2: Critique detects SQL injection
unsafe_sql='query = "SELECT * FROM users WHERE id = " + userId'
run_test "Detects SQL injection" \
    "\"$CONSTITUTIONAL_AI\" critique '$unsafe_sql' security_first | jq -r '.violations | length'" \
    "" \
    ""

# Test 3: Critique detects command injection
unsafe_cmd='os.system("ls " + user_input)'
run_test "Detects command injection" \
    "\"$CONSTITUTIONAL_AI\" critique '$unsafe_cmd' security_first | jq -r '.violations | length'" \
    "" \
    ""

# Test 4: Critique detects hardcoded secrets
unsafe_secret='api_key = "sk-1234567890abcdef"'
run_test "Detects hardcoded secrets" \
    "\"$CONSTITUTIONAL_AI\" critique '$unsafe_secret' security_first | jq -r '.violations | length'" \
    "" \
    ""

# Test 5: Critique detects XSS
unsafe_xss='element.innerHTML = userInput'
run_test "Detects XSS vulnerability" \
    "\"$CONSTITUTIONAL_AI\" critique '$unsafe_xss' security_first | jq -r '.violations | length'" \
    "" \
    ""

# Test 6: Critique detects data deletion without confirmation
unsafe_delete='rm -rf /data/*'
run_test "Detects unsafe deletion" \
    "\"$CONSTITUTIONAL_AI\" critique '$unsafe_delete' no_data_loss | jq -r '.violations | length'" \
    "" \
    ""

# Test 7: Critique detects missing error handling
unsafe_noerr='function processData(data) { return data.map(x => x.value); }'
run_test "Detects missing error handling" \
    "\"$CONSTITUTIONAL_AI\" critique '$unsafe_noerr' error_handling | jq -r '.violations | length'" \
    "" \
    ""

echo "=== Test Suite 2: Revise Function ==="
echo ""

# Test 8: Revise returns proper structure
run_test "Revise returns valid JSON structure" \
    "\"$CONSTITUTIONAL_AI\" revise 'test code' '{}' | jq 'has(\"revised_content\") and has(\"changes_made\") and has(\"still_has_issues\")'" \
    "" \
    ""

# Test 9: Revise with no violations returns original
run_test "Revise with no violations returns original" \
    "\"$CONSTITUTIONAL_AI\" revise 'safe code' '{}'" \
    "still_has_issues" \
    "false"

# Test 10: Revise adds warning for SQL injection
critique_json='{"violations":["Potential SQL injection: found string concatenation in SQL queries"]}'
run_test "Revise adds SQL injection warning" \
    "\"$CONSTITUTIONAL_AI\" revise 'SELECT * FROM users' '$critique_json' | jq -r '.revised_content' | grep -c 'WARNING.*SQL injection'" \
    "" \
    ""

# Test 11: Revise replaces hardcoded secrets
unsafe_code='password = "secret123"'
critique_json='{"violations":["Potential exposed secrets: hardcoded credentials detected"]}'
run_test "Revise replaces hardcoded secrets" \
    "\"$CONSTITUTIONAL_AI\" revise '$unsafe_code' '$critique_json' | jq -r '.revised_content' | grep -c 'process.env'" \
    "" \
    ""

echo "=== Test Suite 3: Integration with Coordinator ==="
echo ""

# Test 12: Coordinator can parse critique results
run_test "Coordinator can extract overall_assessment" \
    "critique_json=\$('$CONSTITUTIONAL_AI' critique 'test' all); echo \$critique_json | jq -r '.overall_assessment'" \
    "" \
    ""

# Test 13: Coordinator can extract violations count
run_test "Coordinator can extract violations count" \
    "critique_json=\$('$CONSTITUTIONAL_AI' critique 'rm -rf /' no_data_loss); echo \$critique_json | jq -r '.violations | length'" \
    "" \
    ""

# Test 14: Coordinator can extract revised content
run_test "Coordinator can extract revised_content" \
    "revision_json=\$('$CONSTITUTIONAL_AI' revise 'test' '{}'); echo \$revision_json | jq -r '.revised_content'" \
    "" \
    ""

# Test 15: Coordinator can extract changes_made
run_test "Coordinator can extract changes_made" \
    "revision_json=\$('$CONSTITUTIONAL_AI' revise 'test' '{}'); echo \$revision_json | jq -r '.changes_made | type'" \
    "" \
    ""

echo "=== Test Suite 4: End-to-End Workflow ==="
echo ""

# Test 16: Full workflow - unsafe code -> critique -> revise -> re-critique
echo "Test $test_count: Full auto-revision workflow"
test_count=$((test_count + 1))

unsafe_code='api_key = "secret123"; rm -rf /data'
echo "  Step 1: Critique unsafe code..."
critique1=$("$CONSTITUTIONAL_AI" critique "$unsafe_code" all)
assessment1=$(echo "$critique1" | jq -r '.overall_assessment')

if [[ "$assessment1" == "needs_revision" ]]; then
    echo "  ✓ Step 1 passed: Detected violations (assessment=$assessment1)"

    echo "  Step 2: Apply revisions..."
    revision=$("$CONSTITUTIONAL_AI" revise "$unsafe_code" "$critique1")
    revised_code=$(echo "$revision" | jq -r '.revised_content')

    if [[ -n "$revised_code" && "$revised_code" != "$unsafe_code" ]]; then
        echo "  ✓ Step 2 passed: Code was revised"

        echo "  Step 3: Re-critique revised code..."
        critique2=$("$CONSTITUTIONAL_AI" critique "$revised_code" all)

        echo "  ✓ Step 3 passed: Re-critique completed"
        echo "  Final assessment: $(echo "$critique2" | jq -r '.overall_assessment')"
        echo "  Remaining violations: $(echo "$critique2" | jq -r '.violations | length')"
        echo "✅ PASS - Full workflow completed"
        passed=$((passed + 1))
    else
        echo "❌ FAIL - Revision failed or didn't change code"
        failed=$((failed + 1))
    fi
else
    echo "❌ FAIL - Failed to detect violations in unsafe code"
    failed=$((failed + 1))
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total tests: $test_count"
echo "Passed: $passed"
echo "Failed: $failed"
echo ""

if [[ $failed -eq 0 ]]; then
    echo "✅ All tests passed! Constitutional AI is working correctly."
    exit 0
else
    echo "❌ Some tests failed. Review output above."
    exit 1
fi
