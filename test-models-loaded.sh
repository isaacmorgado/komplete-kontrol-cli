#!/bin/bash
# Quick test to verify models are loaded

echo "Testing if models load with HTTP patch..."
echo ""

RESULT=$(ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node -e "
let loaded = false;
Object.defineProperty(global, '__CLAUDED_PROXY_MODELS', {
  set: function(value) { loaded = true; this._CLAUDED_PROXY_MODELS = value; },
  get: function() { return this._CLAUDED_PROXY_MODELS; }
});
require(process.env.HOME + '/.claude/clauded-cli/cli.js');
setTimeout(() => {
  console.log(loaded ? global.__CLAUDED_PROXY_MODELS.length : '0');
  process.exit(0);
}, 4000);
" 2>/dev/null)

if [ "$RESULT" = "15" ]; then
  echo "✅ SUCCESS! Models are loaded: $RESULT"
  echo ""
  echo "The fix is working. Now:"
  echo "  1. Close VS Code completely"
  echo "  2. Open fresh terminal"
  echo "  3. Run: clauded"
  echo "  4. Type: /model"
  echo "  5. See all 15 models!"
else
  echo "❌ FAILED: Only $RESULT models loaded"
  echo ""
  echo "Re-apply patch:"
  echo "  node ~/Desktop/Projects/komplete-kontrol-cli/patch-model-picker-http.cjs"
fi
