# Clauded Wrapper - Quick Reference

**Date:** 2026-01-12
**Status:** ✅ Production Ready

---

## Overview

`clauded` is a lightweight wrapper that provides Claude Code with GLM-4.7 access through the proxy server, while keeping regular `claude` command unchanged.

## Key Differences

| Command | Behavior | Models Available |
|---------|----------|------------------|
| `claude` | Standard Claude Code | Anthropic only (Opus, Sonnet, Haiku) |
| `clauded` | Claude Code with GLM | GLM-4.7 by default + all 14 models via proxy |
| `m [model]` | Model switcher | Start Claude with any of 14 models |

---

## Installation

Already installed! The aliases are in your `~/.bashrc`:

```bash
alias m='~/.claude/scripts/claude-model-switcher.sh'
alias clauded='~/.claude/scripts/clauded.sh'
```

To activate in current terminal:
```bash
source ~/.bashrc
```

---

## Usage

### Basic Commands

```bash
# Start with GLM-4.7 (default)
clauded

# Start with autonomous mode
clauded /auto

# Use any Claude Code flags
clauded --dangerously-skip-permissions
clauded --verbose
clauded /checkpoint

# All your /commands work the same
clauded /re [target]
clauded /research-api
clauded /build
```

### Switching Models

While `clauded` defaults to GLM-4.7, you can use it with any model:

```bash
# Override model via --model flag
clauded --model dolphin
clauded --model featherless/qwen

# Or use 'm' command for quick switching
m list          # Show all models
m glm           # Start with GLM-4.7
m dolphin       # Start with Dolphin (security)
m qwen          # Start with Qwen (reasoning)
```

---

## Context Efficiency

The wrapper is designed to be **context-efficient**:

- **Lightweight script**: ~30 lines of bash
- **No extra processing**: Direct passthrough to Claude
- **Auto-proxy management**: Starts proxy only if needed
- **No token overhead**: Wrapper doesn't send any prompts

The only overhead is:
1. Bash script execution (~0.1s)
2. Proxy startup if not running (~1s first time only)

**Total context impact: 0 tokens** (wrapper doesn't interact with Claude API)

---

## How It Works

```
┌──────────────────────────────────────────────────┐
│  User: clauded /auto                             │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  clauded.sh wrapper                              │
│  - Checks if proxy is running                    │
│  - Auto-starts proxy if needed                   │
│  - Sets ANTHROPIC_BASE_URL=http://127.0.0.1:3000 │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  claude --model glm/glm-4.7 "$@"                 │
│  (All your arguments passed through)             │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Proxy Server (port 3000)                        │
│  Routes to Z.AI GLM endpoint                     │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Claude Code starts with GLM-4.7                 │
│  All features work: /auto, /commands, tools, etc │
└──────────────────────────────────────────────────┘
```

---

## Examples

### Example 1: Autonomous Development with GLM

```bash
clauded /auto
# Now you're in autonomous mode with GLM-4.7
# All hooks and features work exactly the same
```

### Example 2: Reverse Engineering with Dolphin

```bash
m dolphin
# Start Claude with Dolphin (unrestricted security model)
```

### Example 3: Chinese Language Tasks

```bash
clauded
# GLM-4.7 has native Chinese support
# Use for bilingual development or Chinese documentation
```

### Example 4: Regular Claude (No Proxy)

```bash
claude
# This remains unchanged - standard Anthropic models only
# No proxy, no GLM, just pure Claude Code
```

---

## Proxy Management

The proxy is **automatically managed** by the wrapper:

```bash
# Check if proxy is running
ps aux | grep model-proxy-server

# View proxy logs
tail -f /tmp/claude-proxy.log

# Manual proxy start (usually not needed)
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &

# Stop proxy
pkill -f model-proxy-server
```

---

## All Available Models

When using `clauded` or `m`, you have access to:

### 🏛️ Anthropic (Native API)
1. Opus 4.5 - Architecture & Deep Thinking
2. Sonnet 4.5 - Coding & Development
3. Haiku 4.5 - Fast & Efficient

### 🚀 GLM (Z.AI)
4. **GLM-4.7** - Orchestrator/Builder (Chinese Native) ⭐ Default for `clauded`
5. GLM-4 Flash - Fast Response
6. GLM-4 Air - Balanced Performance
7. GLM-4 - Standard Model

### 🔐 Featherless (Unrestricted)
8. Dolphin-3 Venice - Security/RE
9. Qwen 2.5 72B - Reasoning
10. WhiteRabbitNeo 8B - Creative Coding
11. Llama 3.1 8B - Fast
12. Llama 3.3 70B - Quality

### 🔷 Google
13. Gemini 2.0 Flash - Google AI
14. Gemini Pro - Google AI

---

## Verification

Test that everything works:

```bash
# Test model switcher
m list

# Test clauded wrapper
clauded --help

# Test proxy connection (should show 14 models)
curl http://127.0.0.1:3000/v1/models
```

---

## Troubleshooting

### Issue: `clauded: command not found`

```bash
# Reload shell config
source ~/.bashrc

# Or check if alias exists
type clauded
```

### Issue: Proxy not starting

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process if needed
pkill -f model-proxy-server

# Try again
clauded
```

### Issue: Want to use different default model

Edit `~/.claude/scripts/clauded.sh` and change line:
```bash
MODEL="glm/glm-4.7"  # Change to any model ID
```

---

## Files

```
~/.claude/scripts/
├── clauded.sh                      # Wrapper script (30 lines)
├── claude-model-switcher.sh        # Model switcher (234 lines)
└── install-model-switcher.sh       # Installer

~/.bashrc
├── alias m='...'                   # Model switcher alias
└── alias clauded='...'             # Wrapper alias

~/.claude/
├── model-proxy-server.js           # Proxy server
└── multi-model-mcp-server.js       # MCP server config
```

---

## Summary

✅ **`claude`** - Unchanged, Anthropic models only
✅ **`clauded`** - GLM-4.7 by default, all features work
✅ **`m [model]`** - Quick switch to any of 14 models
✅ **0 context overhead** - Wrapper doesn't use tokens
✅ **All /commands work** - /auto, /re, /build, etc.
✅ **Production ready** - Tested and verified

---

**Guide Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** ✅ Production Ready
