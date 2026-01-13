#!/bin/bash
# Manual verification of Constitutional AI fixes

CONSTITUTIONAL_AI="$HOME/.claude/hooks/constitutional-ai.sh"

echo "========================================="
echo "Constitutional AI Fix - Manual Verification"
echo "========================================="
echo ""

# Test 1: Truly safe code (minimal, no issues)
echo "=== Test 1: Truly Safe Code ==="
safe_code='x = 1'
echo "Input: $safe_code"
critique=$("$CONSTITUTIONAL_AI" critique "$safe_code" all)
echo "$critique" | jq .
echo ""

# Test 2: SQL Injection Detection
echo "=== Test 2: SQL Injection Detection ==="
unsafe_sql='query = "SELECT * FROM users WHERE id = " + userId'
echo "Input: $unsafe_sql"
critique=$("$CONSTITUTIONAL_AI" critique "$unsafe_sql" security_first)
echo "$critique" | jq .
echo ""

# Test 3: Command Injection Detection
echo "=== Test 3: Command Injection Detection ==="
unsafe_cmd='os.system("ls " + user_input)'
echo "Input: $unsafe_cmd"
critique=$("$CONSTITUTIONAL_AI" critique "$unsafe_cmd" security_first)
echo "$critique" | jq .
echo ""

# Test 4: Hardcoded Secrets Detection
echo "=== Test 4: Hardcoded Secrets Detection ==="
unsafe_secret='api_key = "sk-1234567890"'
echo "Input: $unsafe_secret"
critique=$("$CONSTITUTIONAL_AI" critique "$unsafe_secret" security_first)
echo "$critique" | jq .
echo ""

# Test 5: Data Loss Detection
echo "=== Test 5: Data Loss Detection ==="
unsafe_delete='rm -rf /data/*'
echo "Input: $unsafe_delete"
critique=$("$CONSTITUTIONAL_AI" critique "$unsafe_delete" no_data_loss)
echo "$critique" | jq .
echo ""

# Test 6: Revision with Hardcoded Secrets
echo "=== Test 6: Apply Revision to Hardcoded Secrets ==="
unsafe_code='password = "secret123"'
echo "Input: $unsafe_code"
critique=$("$CONSTITUTIONAL_AI" critique "$unsafe_code" security_first)
echo "Critique:"
echo "$critique" | jq .
echo ""
echo "Applying revision..."
revision=$("$CONSTITUTIONAL_AI" revise "$unsafe_code" "$critique")
echo "Revision result:"
echo "$revision" | jq .
echo "Revised code:"
echo "$revision" | jq -r '.revised_content'
echo ""

# Test 7: Coordinator Integration
echo "=== Test 7: Coordinator Integration Format ==="
code='rm -rf /tmp/data'
echo "Input: $code"
critique=$("$CONSTITUTIONAL_AI" critique "$code" all)
echo "Critique JSON:"
echo "$critique" | jq .

assessment=$(echo "$critique" | jq -r '.overall_assessment')
violations=$(echo "$critique" | jq -r '.violations | length')
echo ""
echo "Extracted values (as coordinator would see them):"
echo "  overall_assessment: $assessment"
echo "  violations count: $violations"
echo ""

if [[ "$assessment" == "needs_revision" ]] && [[ "$violations" -gt 0 ]]; then
    echo "Applying revision..."
    revision_json=$("$CONSTITUTIONAL_AI" revise "$code" "$critique")
    revised=$(echo "$revision_json" | jq -r '.revised_content')
    changes=$(echo "$revision_json" | jq -r '.changes_made | join(", ")')

    echo "Revision JSON:"
    echo "$revision_json" | jq .
    echo ""
    echo "Extracted values (as coordinator would see them):"
    echo "  revised_content: $revised"
    echo "  changes_made: $changes"
fi

echo ""
echo "========================================="
echo "✅ Manual verification complete!"
echo "========================================="
