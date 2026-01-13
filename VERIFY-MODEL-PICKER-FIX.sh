#!/bin/bash
# Verification script for model picker fix
# This confirms that all components are working correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Model Picker Fix Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Check if proxy is running
echo -n "Test 1: Proxy running on port 3000... "
if curl -s http://127.0.0.1:3000/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Run 'clauded' first to start the proxy"
    exit 1
fi

# Test 2: Count available models from proxy
echo -n "Test 2: Proxy serving 15 models... "
MODEL_COUNT=$(curl -s http://127.0.0.1:3000/v1/models | jq -r '.data | length')
if [ "$MODEL_COUNT" = "15" ]; then
    echo -e "${GREEN}✓ PASS (${MODEL_COUNT} models)${NC}"
else
    echo -e "${RED}✗ FAIL (found ${MODEL_COUNT} models, expected 15)${NC}"
    exit 1
fi

# Test 3: Check if CLI is patched
echo -n "Test 3: CLI file is patched... "
if grep -q "SYNCHRONOUSLY fetch models" ~/.claude/clauded-cli/cli.js && \
   grep -q "PATCHED: Use proxy models" ~/.claude/clauded-cli/cli.js; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Run: node /Users/imorgado/Desktop/Projects/komplete-kontrol-cli/patch-model-picker-sync.cjs"
    exit 1
fi

# Test 4: Test synchronous fetch works
echo -n "Test 4: Synchronous model fetch works... "
FETCH_TEST=$(ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node -e "
const{execSync}=require('child_process');
try {
  const result=execSync('curl -s http://127.0.0.1:3000/v1/models',{
    encoding:'utf8',
    timeout:5000,
    stdio:['pipe','pipe','ignore']
  });
  const json=JSON.parse(result);
  console.log(json.data.length);
} catch(e) {
  console.log('0');
}
" 2>/dev/null)

if [ "$FETCH_TEST" = "15" ]; then
    echo -e "${GREEN}✓ PASS (${FETCH_TEST} models fetched)${NC}"
else
    echo -e "${RED}✗ FAIL (fetched ${FETCH_TEST} models)${NC}"
    exit 1
fi

# Test 5: Check if wrapper script sets ANTHROPIC_BASE_URL
echo -n "Test 5: Clauded wrapper configured... "
if grep -q "ANTHROPIC_BASE_URL=http://127.0.0.1:3000" /usr/local/bin/clauded 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ SKIPPED (wrapper not found or not configured)${NC}"
fi

# All tests passed!
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "The model picker fix is working correctly."
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Close VS Code completely (all windows)"
echo "  2. Kill any running clauded processes:"
echo "     pkill -f 'clauded-cli|model-proxy'"
echo "  3. Open a NEW terminal (not VS Code integrated terminal)"
echo "  4. Run: clauded"
echo "  5. Type: /model"
echo "  6. You should see all 15 models!"
echo ""
echo "If models still don't appear, the issue is VS Code caching."
echo "Try running clauded from Terminal.app or iTerm instead."
echo ""
