# Alternative Solution: Custom Model Commands

**Date:** 2026-01-12  
**Status:** Recommended Approach  
**Autonomous Mode:** Episode ep_1768257886170

---

## Problem Analysis

After extensive investigation (3 patch attempts, GitHub research, claudish analysis), the conclusion is:

**Claude Code's `/model` picker CANNOT be reliably modified:**
- The CLI is heavily minified (10MB+ obfuscated JavaScript)
- The RU3() function that returns models is deeply embedded
- Any patches break on CLI updates
- claudish (similar proxy) doesn't modify the picker at all

---

## Recommended Solution: Use `--model` Flag

Instead of modifying the picker, use the `--model` flag when starting clauded:

```bash
# Start with specific model
clauded --model glm/glm-4.7

# Or use environment variable
ANTHROPIC_MODEL=google/gemini-3-pro clauded
```

This is how claudish works - they never modify the `/model` picker.

---

## Alternative: Create Custom Slash Commands

Since you have 15 models available through the proxy, create dedicated slash commands:

### 1. Update `/usr/local/bin/clauded` wrapper

Add model-specific shortcuts:

```bash
#!/bin/bash
# clauded - with model shortcuts

case "${1:-}" in
  --glm|--glm47)
    shift
    export ANTHROPIC_MODEL="glm/glm-4.7"
    ;;
  --gemini|--gemini3)
    shift
    export ANTHROPIC_MODEL="google/gemini-3-pro"
    ;;
  --dolphin)
    shift
    export ANTHROPIC_MODEL="featherless/dphn/Dolphin-Mistral-24B-Venice-Edition"
    ;;
  --qwen)
    shift
    export ANTHROPIC_MODEL="featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated"
    ;;
  --help-models)
    cat << MODELS
Available models:
  clauded --glm47      # GLM-4.7 (Orchestrator)
  clauded --gemini3    # Gemini 3 Pro (Frontend)
  clauded --dolphin    # Dolphin-3 (Security/RE)
  clauded --qwen       # Qwen 72B (Unrestricted)
  
  Or use: clauded --model <full-model-id>
MODELS
    exit 0
    ;;
esac

# Start proxy if not running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
  sleep 2
fi

# Run Claude Code
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node ~/.claude/clauded-cli/cli.js "$@"
```

### 2. Usage

```bash
# Quick model selection
clauded --glm47 "Build the authentication system"
clauded --gemini3 "Design the frontend for dashboard"
clauded --dolphin "Reverse engineer this API"

# List available models
clauded --help-models

# Use default (Opus)
clauded
```

---

## Benefits of This Approach

✅ **No CLI modification needed** - Works with any Claude Code version  
✅ **Survives updates** - Wrapper script is separate from CLI  
✅ **Simple to maintain** - Just bash aliases  
✅ **Fast** - No proxy fetch delays  
✅ **Explicit** - Clear which model you're using  
✅ **Documented** - `--help-models` shows all options

---

## Implementation Script

```bash
#!/bin/bash
# Apply the alternative solution

cat > /tmp/clauded-with-models << 'WRAPPER'
#!/bin/bash
# clauded - Claude Code with multi-model support

GREEN='\033[38;5;46m'
CYAN='\033[38;5;51m'
RESET='\033[0m'

case "${1:-}" in
  --glm|--glm47)
    shift
    export ANTHROPIC_MODEL="glm/glm-4.7"
    echo -e "${CYAN}Using: GLM-4.7 (Orchestrator)${RESET}"
    ;;
  --gemini|--gemini3)
    shift
    export ANTHROPIC_MODEL="google/gemini-3-pro"
    echo -e "${CYAN}Using: Gemini 3 Pro (Frontend/Research)${RESET}"
    ;;
  --dolphin)
    shift
    export ANTHROPIC_MODEL="featherless/dphn/Dolphin-Mistral-24B-Venice-Edition"
    echo -e "${CYAN}Using: Dolphin-3 (Security/RE)${RESET}"
    ;;
  --qwen)
    shift
    export ANTHROPIC_MODEL="featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated"
    echo -e "${CYAN}Using: Qwen 72B (Unrestricted)${RESET}"
    ;;
  --rabbit)
    shift
    export ANTHROPIC_MODEL="featherless/WhiteRabbitNeo/Llama-3.1-WhiteRabbitNeo-2-70B"
    echo -e "${CYAN}Using: WhiteRabbitNeo (Unrestricted Coding)${RESET}"
    ;;
  --help-models)
    echo -e "${GREEN}Available Models:${RESET}"
    echo ""
    echo "  clauded --glm47      # 🚀 GLM-4.7 (Orchestrator/Builder)"
    echo "  clauded --gemini3    # 🎨 Gemini 3 Pro (Frontend/Research)"
    echo "  clauded --dolphin    # 🔐 Dolphin-3 (Security/RE)"
    echo "  clauded --qwen       # 🔓 Qwen 72B (Unrestricted)"
    echo "  clauded --rabbit     # 🐰 WhiteRabbitNeo (Unrestricted Coding)"
    echo ""
    echo "Or use: clauded --model <full-model-id>"
    echo ""
    echo "Default (no flag): Claude Opus 4.5"
    exit 0
    ;;
esac

# Start proxy if not running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
  sleep 2
fi

# Run Claude Code
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node ~/.claude/clauded-cli/cli.js "$@"
WRAPPER

sudo mv /tmp/clauded-with-models /usr/local/bin/clauded
sudo chmod +x /usr/local/bin/clauded

echo "✅ Alternative solution installed!"
echo ""
echo "Test with:"
echo "  clauded --help-models"
echo "  clauded --glm47 'your task'"
```

---

## Why This is Better

1. **Reliable** - No minified code modification
2. **Maintainable** - Simple bash wrapper
3. **Future-proof** - Works with all Claude Code versions
4. **User-friendly** - Clear model selection
5. **Fast** - No model fetch delays on startup

---

## Conclusion

**Stop trying to modify the `/model` picker.**  
**Use the `--model` flag approach instead.**

This is the industry standard (claudish uses it, it's documented, it's reliable).

---

**Saved to memory:** ep_1768257886170
