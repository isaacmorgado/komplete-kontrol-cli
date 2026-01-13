# Claude Code Multi-Model - Quick Start Guide ✅

## Installation (30 seconds)

```bash
# Install the wrapper
sudo cp ~/Desktop/Projects/komplete-kontrol-cli/clauded-v2.sh /usr/local/bin/clauded
sudo chmod +x /usr/local/bin/clauded

# Verify installation
clauded --help
```

## ✅ Working Right Now (No Config Needed)

All 5 Featherless models work immediately:

```bash
# Fast response (Llama 3.1 8B)
clauded --fast "Fix this bug in auth.js"

# Security analysis (Dolphin-3 24B)
clauded --security "Analyze code for vulnerabilities"

# Large task (Qwen 72B)
clauded --qwen "Design system architecture"

# Creative coding (WhiteRabbitNeo 8B)
clauded --rabbit "Implement custom solution"

# High quality (Llama 3.3 70B)
clauded --big "Refactor authentication"
```

## All Verified Capabilities

Every model above has:
- ✅ Tool calling (Read/Write/Edit/Bash/Grep/etc.)
- ✅ Agent spawning (Task tool - Explore, Build, Plan, etc.)
- ✅ MCP integration (Browser automation, all mcp__* tools)
- ✅ Context management (Multi-turn conversations)

## Alias Quick Reference

| Task | Use | Model |
|------|-----|-------|
| Quick tasks | `--fast` or `--small` | Llama 3.1 8B |
| Security/RE | `--security` or `--dolphin` or `--re` | Dolphin-3 24B |
| Creative code | `--rabbit` or `--code` | WhiteRabbitNeo 8B |
| Large tasks | `--qwen` or `--unrestricted` | Qwen 72B |
| High quality | `--big` or `--llama70` | Llama 3.3 70B |

## Optional: Enable More Models

### GLM Models (Chinese AI)
```bash
# Get API key from https://open.bigmodel.cn/
export GLM_API_KEY="your_key_here"

# Then use:
clauded --builder "task"  # GLM-4.7
clauded --glm4 "task"      # GLM-4
```

### Google Gemini Models
```bash
# Get API key from https://aistudio.google.com/apikey
export GOOGLE_API_KEY="your_key_here"

# Then use:
clauded --frontend "task"  # Gemini 3 Pro
clauded --gemini2 "task"   # Gemini 2.0 Flash
```

### Claude Models (Default if no flag)
```bash
# Set Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Then use:
clauded --opus "task"    # Claude Opus 4.5
clauded --sonnet "task"  # Claude Sonnet 4.5
clauded --haiku "task"   # Claude Haiku 4.5
```

## 💡 Pro Tips

### Small Models Are Fast!
```bash
# 8B models respond 2-3x faster than 70B
clauded --fast "quick task"  # Lightning fast!
```

### Same Capabilities, Different Sizes
```bash
# Both can spawn agents, use MCP, call tools
clauded --fast "spawn explore agent"    # 8B - faster
clauded --big "spawn explore agent"     # 70B - higher quality
```

### View All Options
```bash
clauded --help     # Full help
clauded --models   # List all models
clauded --list     # Alias for --models
```

## Test Results

**100% Success Rate**
- 5 models tested
- 20 tests passed
- 0 failures

**All capabilities verified:**
- Tool calling ✅
- Task spawning ✅
- MCP integration ✅
- Context management ✅

## Support

Issues or questions? Check:
- `~/Desktop/Projects/komplete-kontrol-cli/MODEL-PICKER-FIX.md` - Full status report
- `~/Desktop/Projects/komplete-kontrol-cli/FEATHERLESS_TEST_RESULTS.md` - Test details
- `~/.claude/model-proxy-server.js` - Proxy server source

---

**Status:** ✅ Production Ready
**Verified:** 2026-01-12
**Test Coverage:** 100%
