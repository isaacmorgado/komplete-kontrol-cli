#!/bin/bash
# Test coordinator.sh fixes for Issues #13, #18, #19
# Tests: parameter passing, quality threshold, context budget check

set -euo pipefail

COORDINATOR="${HOME}/.claude/hooks/coordinator.sh"
AGENT_LOOP="${HOME}/.claude/hooks/agent-loop.sh"
MEMORY_MANAGER="${HOME}/.claude/hooks/memory-manager.sh"

TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "${YELLOW}Test $TEST_COUNT: $1${NC}"
}

log_pass() {
    PASS_COUNT=$((PASS_COUNT + 1))
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

log_fail() {
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo -e "${RED}✗ FAIL${NC}: $1"
}

# ============================================================================
# ISSUE #13: Parameter Passing Fix
# ============================================================================

log_test "Verify coordinator builds structured context for agent-loop"
# Check that line 544 has the new format (not key:value pairs)
if grep -q 'local agent_context="Execution strategy:' "$COORDINATOR"; then
    log_pass "Coordinator uses structured context format"
else
    log_fail "Coordinator still uses old key:value format"
fi

log_test "Verify agent-loop receives context as readable string"
# The context should be passed as second parameter to agent-loop start
if grep -q 'agent_id=$("$AGENT_LOOP" start "$task" "$agent_context"' "$COORDINATOR"; then
    log_pass "Agent-loop receives context as separate parameter"
else
    log_fail "Agent-loop parameter passing incorrect"
fi

log_test "Verify context includes all metadata (strategy, risk, plan, agent, mode, parallel)"
if grep -q 'Execution strategy: $strategy | Risk level: $risk_level | Plan: $plan_id | Agent: $assigned_agent | Mode: $reasoning_mode | Parallel: $can_parallelize' "$COORDINATOR"; then
    log_pass "Context includes all 6 metadata fields"
else
    log_fail "Context missing metadata fields"
fi

# ============================================================================
# ISSUE #18: Quality Threshold Fix
# ============================================================================

log_test "Verify quality_score default handling logic exists"
if grep -q 'if \[\[ -n "$quality_score" && "$quality_score" != "null" && "$quality_score" != "7.0" \]\]' "$COORDINATOR"; then
    log_pass "Quality score has proper default handling"
else
    log_fail "Quality score default handling missing"
fi

log_test "Verify failed execution triggers low score (5.0)"
if grep -q 'elif \[\[ "$execution_result" =~ (failed|error|incomplete) \]\]; then' "$COORDINATOR" && \
   grep -q 'eval_score=5.0' "$COORDINATOR"; then
    log_pass "Failed execution sets eval_score=5.0"
else
    log_fail "Failed execution doesn't trigger low score"
fi

log_test "Verify missing quality_score triggers conservative score (6.5)"
if grep -q 'elif \[\[ -z "$quality_score" || "$quality_score" == "null" \]\]; then' "$COORDINATOR" && \
   grep -q 'eval_score=6.5' "$COORDINATOR"; then
    log_pass "Missing quality_score sets eval_score=6.5"
else
    log_fail "Missing quality_score doesn't trigger conservative score"
fi

log_test "Verify threshold condition can now trigger (< 7.0)"
# With scores of 5.0 and 6.5, the condition should be reachable
if grep -q 'if (( $(echo "$eval_score < 7.0"' "$COORDINATOR"; then
    log_pass "Threshold condition unchanged (< 7.0)"
else
    log_fail "Threshold condition modified unexpectedly"
fi

# ============================================================================
# ISSUE #19: Context Budget Check
# ============================================================================

log_test "Verify context budget check exists before agent launch"
if grep -q "# 2.4: Check context budget before launching agents" "$COORDINATOR"; then
    log_pass "Context budget check section exists"
else
    log_fail "Context budget check section missing"
fi

log_test "Verify budget check calls memory-manager context-check"
if grep -q 'budget_status=$("$MEMORY_MANAGER" context-check' "$COORDINATOR"; then
    log_pass "Calls memory-manager context-check"
else
    log_fail "Doesn't call memory-manager context-check"
fi

log_test "Verify auto-compact called before agent launch"
if grep -q '"$MEMORY_MANAGER" auto-compact-if-needed' "$COORDINATOR" | head -1; then
    log_pass "Auto-compact called before agent launch"
else
    log_fail "Auto-compact not called before agent launch"
fi

log_test "Verify budget check happens before agent-loop start (ordering)"
# Extract line numbers
budget_line=$(grep -n "Check context budget before launching agents" "$COORDINATOR" | cut -d: -f1)
agent_line=$(grep -n "Start agent loop with specialist context" "$COORDINATOR" | cut -d: -f1)

if [[ -n "$budget_line" && -n "$agent_line" && "$budget_line" -lt "$agent_line" ]]; then
    log_pass "Budget check (line $budget_line) before agent launch (line $agent_line)"
else
    log_fail "Budget check ordering incorrect"
fi

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

log_test "Verify coordinator has executable permissions"
if [[ -x "$COORDINATOR" ]]; then
    log_pass "Coordinator is executable"
else
    log_fail "Coordinator is not executable"
fi

log_test "Verify coordinator syntax is valid"
if bash -n "$COORDINATOR" 2>/dev/null; then
    log_pass "Coordinator syntax valid"
else
    log_fail "Coordinator has syntax errors"
fi

log_test "Verify no duplicate section numbers (2.4 should become 2.4 and 2.5)"
section_count=$(grep -c "# 2\." "$COORDINATOR" || echo 0)
if [[ "$section_count" -ge 5 ]]; then
    log_pass "Has at least 5 sections in Phase 2 (including new 2.4 and 2.5)"
else
    log_fail "Section numbering may be incorrect (found $section_count sections)"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ All coordinator fixes verified!${NC}"
    echo ""
    echo "Fixed Issues:"
    echo "  #13: Parameter passing - structured context format"
    echo "  #18: Quality threshold - now reachable with scores 5.0, 6.5"
    echo "  #19: Context budget - checked before agent launch"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
