#!/bin/bash
# Komplete Kontrol CLI - Smoke Test Suite
# Tests all 6 commands with minimal arguments

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo "Komplete Kontrol CLI - Smoke Test Suite"
echo "=================================================="
echo ""

# Check prerequisites
echo "📋 Prerequisites Check:"
echo ""

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}✗ ANTHROPIC_API_KEY not set${NC}"
    echo ""
    echo "Please set your API key:"
    echo "  export ANTHROPIC_API_KEY=\"sk-ant-...\""
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ ANTHROPIC_API_KEY set (${#ANTHROPIC_API_KEY} chars)${NC}"
fi

if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}✗ dist/index.js not found${NC}"
    echo "Run: bun run build"
    exit 1
else
    echo -e "${GREEN}✓ dist/index.js exists${NC}"
fi

echo ""
echo "=================================================="
echo "Starting Tests"
echo "=================================================="
echo ""

TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

run_test() {
    local name="$1"
    local cmd="$2"

    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "${YELLOW}Test $TEST_COUNT: $name${NC}"
    echo "Command: $cmd"
    echo ""

    if eval "$cmd"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ FAIL (exit code: $?)${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi

    echo ""
    echo "--------------------------------------------------"
    echo ""
}

# Test 1: /auto with minimal task
run_test "Auto Command (1 iteration)" \
    "bun run dist/index.js auto 'Create a hello world function' -i 1 -v"

# Test 2: /sparc with simple task
run_test "SPARC Command (basic workflow)" \
    "bun run dist/index.js sparc 'Build a simple API' -v"

# Test 3: /reflect with 1 iteration
run_test "Reflect Command (1 cycle)" \
    "bun run dist/index.js reflect 'Optimize code' -i 1 -v"

# Test 4: /research with simple query
run_test "Research Command (basic query)" \
    "bun run dist/index.js research 'TypeScript patterns' -v"

# Test 5: /rootcause analyze
run_test "RootCause Analyze" \
    "bun run dist/index.js rootcause analyze -b 'Sample bug' -t 'general' -v"

# Test 6: /swarm spawn (small swarm)
run_test "Swarm Spawn (2 agents)" \
    "bun run dist/index.js swarm spawn 'Test task' -n 2 -v"

# Summary
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""
echo "Total Tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
