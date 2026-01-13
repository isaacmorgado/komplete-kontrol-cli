#!/bin/bash
# Fix clauded wrapper to handle port conflicts

echo "Updating /usr/local/bin/clauded..."

sudo tee /usr/local/bin/clauded > /dev/null << 'EOF'
#!/bin/bash
# clauded - Claude Code with custom models, ASCII art, and multi-provider proxy

GREEN='\033[38;5;46m'
CYAN='\033[38;5;51m'
YELLOW='\033[38;5;226m'
RED='\033[38;5;196m'
RESET='\033[0m'

echo -e "${GREEN}"
cat << 'ART'

     ▲                                        ▲
    ▐█▌                                      ▐█▌
   ▐███▌    ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
  ▐█████▌  ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
   ▐███▌   ██║     ██║     ███████║██║   ██║██║  ██║█████╗
    ▐█▌    ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
     ▲     ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
            ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝

ART
echo -e "${RESET}"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║   Custom Multi-Model Setup with Full Tool Support            ║${RESET}"
echo -e "${GREEN}║   ✓ 15 Models  ✓ Tool Calling  ✓ Agents  ✓ MCP  ✓ Memory    ║${RESET}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

CLAUDED_CLI="$HOME/.claude/clauded-cli/cli.js"
if [ ! -f "$CLAUDED_CLI" ]; then
    echo -e "${YELLOW}⚠️  Patched CLI not found. Falling back to regular claude...${RESET}"
    exec claude "$@"
fi

PROXY_SERVER="$HOME/.claude/model-proxy-server.js"
if [ ! -f "$PROXY_SERVER" ]; then
    echo -e "${YELLOW}⚠️  Proxy not found. Starting without proxy...${RESET}"
    exec node "$CLAUDED_CLI" "$@"
fi

# Smart port conflict handling
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    EXISTING_PID=$(lsof -ti :3000)
    EXISTING_CMD=$(ps -p $EXISTING_PID -o command= 2>/dev/null || echo "unknown")

    if echo "$EXISTING_CMD" | grep -q "model-proxy-server.js"; then
        echo -e "${CYAN}✓ Proxy already running (PID: $EXISTING_PID)${RESET}"
        PROXY_PID=""
    else
        echo -e "${RED}✗ Port 3000 in use by: $EXISTING_CMD${RESET}"
        echo -e "${YELLOW}  PID: $EXISTING_PID${RESET}"
        echo -e "${YELLOW}  Kill with: kill $EXISTING_PID${RESET}"
        exit 1
    fi
else
    echo "Starting proxy..."
    node "$PROXY_SERVER" 3000 > /tmp/claude-proxy.log 2>&1 &
    PROXY_PID=$!
    sleep 2

    if ! ps -p $PROXY_PID > /dev/null 2>/dev/null; then
        echo -e "${RED}✗ Proxy failed${RESET}"
        echo -e "${YELLOW}Last 20 lines:${RESET}"
        tail -20 /tmp/claude-proxy.log 2>/dev/null
        exit 1
    fi

    echo -e "${GREEN}✓ Proxy started (PID: $PROXY_PID)${RESET}"
fi

echo ""
echo -e "${CYAN}15 Models Available (use /model):${RESET}"
echo "  Claude: Opus 4.5, Sonnet 4.5, Haiku 4.5"
echo "  GLM: GLM-4.7, GLM-4, GLM-4 Flash, GLM-4 Air"
echo "  Google: Gemini 3 Pro, Gemini Pro, Gemini 2.0 Flash"
echo "  Uncensored: Dolphin-3, Qwen 72B, WhiteRabbitNeo, Llama 70B/8B"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

cleanup() {
    if [ ! -z "$PROXY_PID" ]; then
        echo "Stopping proxy..."
        kill $PROXY_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

ANTHROPIC_BASE_URL=http://127.0.0.1:3000 node "$CLAUDED_CLI" "$@"
EOF

sudo chmod +x /usr/local/bin/clauded

echo ""
echo "✓ Updated clauded wrapper"
echo ""
echo "Changes:"
echo "  - Smart port conflict detection"
echo "  - Shows what's using port 3000"
echo "  - Displays proxy logs on failure"
echo "  - Updated to show 15 models"
echo ""
