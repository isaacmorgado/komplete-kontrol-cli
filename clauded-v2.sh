#!/bin/bash
# clauded v2 - Intuitive model aliases with full tool support

GREEN='\033[38;5;46m'
CYAN='\033[38;5;51m'
YELLOW='\033[38;5;226m'
MAGENTA='\033[38;5;201m'
BLUE='\033[38;5;39m'
RESET='\033[0m'

# Parse arguments
MODEL_ARG=""
SHOW_HELP=false

case "${1:-}" in
  # Claude models
  --opus)
    shift
    export ANTHROPIC_MODEL="claude-4.5-opus-20251101"
    echo -e "${BLUE}🏛️  Using: Claude Opus 4.5 (Architect - Most Capable)${RESET}"
    ;;
  --sonnet|--default)
    shift
    export ANTHROPIC_MODEL="claude-4.5-sonnet-20250929"
    echo -e "${BLUE}🔧 Using: Claude Sonnet 4.5 (Fixer - Everyday Tasks)${RESET}"
    ;;
  --haiku)
    shift
    export ANTHROPIC_MODEL="claude-haiku-4-5-20251001"
    echo -e "${BLUE}⚡ Using: Claude Haiku 4.5 (Fast - Quick Answers)${RESET}"
    ;;

  # GLM models
  --builder|--glm|--orchestrator)
    shift
    export ANTHROPIC_MODEL="glm/glm-4.7"
    echo -e "${CYAN}🚀 Using: GLM-4.7 (Builder/Orchestrator)${RESET}"
    ;;
  --glm4)
    shift
    export ANTHROPIC_MODEL="glm/glm-4"
    echo -e "${CYAN}🌐 Using: GLM-4 (Free Tier)${RESET}"
    ;;

  # Google Gemini models
  --frontend|--gemini|--research)
    shift
    export ANTHROPIC_MODEL="google/gemini-3-pro"
    echo -e "${MAGENTA}🎨 Using: Gemini 3 Pro (Frontend/Research)${RESET}"
    ;;
  --gemini2|--flash)
    shift
    export ANTHROPIC_MODEL="google/gemini-2.0-flash"
    echo -e "${MAGENTA}💨 Using: Gemini 2.0 Flash (Fast & Free)${RESET}"
    ;;

  # Featherless (Unrestricted/Abliterated models)
  --security|--dolphin|--re)
    shift
    export ANTHROPIC_MODEL="featherless/dphn/Dolphin-Mistral-24B-Venice-Edition"
    echo -e "${GREEN}🔐 Using: Dolphin-3 (Security/Reverse Engineering)${RESET}"
    ;;
  --unrestricted|--qwen)
    shift
    export ANTHROPIC_MODEL="featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated"
    echo -e "${GREEN}🔓 Using: Qwen 72B (Unrestricted - Large)${RESET}"
    ;;
  --rabbit|--code)
    shift
    export ANTHROPIC_MODEL="featherless/WhiteRabbitNeo/Llama-3-WhiteRabbitNeo-8B-v2.0"
    echo -e "${GREEN}🐰 Using: WhiteRabbitNeo 8B (Unrestricted Coding)${RESET}"
    ;;
  --fast|--small)
    shift
    export ANTHROPIC_MODEL="featherless/mlabonne/Meta-Llama-3.1-8B-Instruct-abliterated"
    echo -e "${GREEN}⚡ Using: Llama 3.1 8B (Fast & Unrestricted)${RESET}"
    ;;
  --big|--llama70)
    shift
    export ANTHROPIC_MODEL="featherless/huihui-ai/Llama-3.3-70B-Instruct-abliterated"
    echo -e "${GREEN}🦙 Using: Llama 3.3 70B (Large & Unrestricted)${RESET}"
    ;;

  # Help and info
  --models|--list|--help)
    cat << 'HELP'

═══════════════════════════════════════════════════════════════════
  Available Models with Intuitive Aliases
═══════════════════════════════════════════════════════════════════

CLAUDE (Native, Full Tool Support):
  --opus              🏛️  Opus 4.5 - Most capable, complex work
  --sonnet, --default 🔧 Sonnet 4.5 - Best for everyday tasks
  --haiku             ⚡ Haiku 4.5 - Fastest for quick answers

GLM (Native Tool Support):
  --builder, --glm    🚀 GLM-4.7 - Orchestrator, autonomous building
  --orchestrator      (alias for --builder)
  --glm4              🌐 GLM-4 - Free tier, good quality

GOOGLE GEMINI (Native Tool Support):
  --frontend, --gemini 🎨 Gemini 3 Pro - Frontend, research, UI design
  --research          (alias for --frontend)
  --gemini2, --flash  💨 Gemini 2.0 Flash - Fast, free tier

FEATHERLESS - UNRESTRICTED (Tool Emulation):
  --security, --dolphin 🔐 Dolphin-3 - Security, reverse engineering
  --re                (alias for --security)
  --unrestricted, --qwen 🔓 Qwen 72B - Unrestricted, 72B params
  --rabbit, --code    🐰 WhiteRabbitNeo - Unrestricted coding
  --fast, --small     ⚡ Llama 8B - Fast, small, unrestricted
  --big, --llama70    🦙 Llama 70B - Large, unrestricted

═══════════════════════════════════════════════════════════════════

FEATURES (All Models):
  ✓ Full tool calling (native or emulated)
  ✓ MCP server integration
  ✓ Agent spawning (Task tool)
  ✓ Slash commands (Skill tool)
  ✓ Context management
  ✓ Browser automation (when available)

USAGE:
  clauded --builder "Build authentication system"
  clauded --frontend "Design dashboard UI"
  clauded --security "Analyze this codebase for vulnerabilities"
  clauded --rabbit "Write production code for XYZ"
  clauded --fast "Quick task"

ADVANCED:
  clauded --model <full-model-id>  # Use any model by ID
  clauded                          # Use default (Opus 4.5)

═══════════════════════════════════════════════════════════════════

HELP
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
    echo -e "${YELLOW}⚠  Proxy failed to start (check /tmp/claude-proxy.log)${RESET}"
  fi
fi

# Run Claude Code
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node ~/.claude/clauded-cli/cli.js "$@"
