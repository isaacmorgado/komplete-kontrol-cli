#!/bin/bash
# clauded - Claude Code with multi-model support

GREEN='\033[38;5;46m'
CYAN='\033[38;5;51m'
YELLOW='\033[38;5;226m'
RESET='\033[0m'

case "${1:-}" in
  --glm|--glm47)
    shift
    export ANTHROPIC_MODEL="glm/glm-4.7"
    echo -e "${CYAN}Using: GLM-4.7 (Orchestrator/Builder)${RESET}"
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
    echo -e "${GREEN}═══════════════════════════════════════════════════════${RESET}"
    echo -e "${GREEN}  Available Models${RESET}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${RESET}"
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
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${RESET}"
    exit 0
    ;;
esac

# Start proxy if not running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}Starting multi-provider proxy...${RESET}"
  node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
  sleep 2
  if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Proxy started on port 3000${RESET}"
  else
    echo -e "${YELLOW}⚠ Proxy failed to start (check /tmp/claude-proxy.log)${RESET}"
  fi
fi

# Run Claude Code
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node ~/.claude/clauded-cli/cli.js "$@"
