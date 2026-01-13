# Rate Limit Prevention Guide

**Date:** 2026-01-12
**Status:** ✅ Production Ready

---

## Overview

This guide explains how to prevent "API Error: Rate Limit reached" when using agents, spawning multiple agents, and calling MCP servers with Claude Code.

## The Problem

Rate limits occur when:
- Spawning multiple agents simultaneously (each makes API calls)
- Using MCP servers that call external APIs
- Running autonomous mode with frequent API calls
- Using free tier API keys (lower rate limits)

**Common Error:**
```
API Error: Rate limit reached
429 Too Many Requests
quota exceeded
```

---

## Solution Architecture

We've implemented a **3-layer defense**:

### Layer 1: Rate Limiter (Preventive)
Token bucket algorithm prevents hitting limits in the first place

### Layer 2: Automatic Retry (Reactive)
Exponential backoff with smart retry when rate limits are hit

### Layer 3: Model Distribution (Alternative)
Use different models/providers to distribute load

---

## Quick Fix

### For Immediate Relief

**Use different models for spawned agents:**

```bash
# Instead of spawning all agents with same model
/swarm spawn 5 "task"

# Distribute across providers
m glm           # Agent 1: GLM-4.7 (Z.AI - separate quota)
m dolphin       # Agent 2: Dolphin (Featherless - separate quota)
m qwen          # Agent 3: Qwen (Featherless - different model)
m gemini        # Agent 4: Gemini (Google - separate quota)
m sonnet        # Agent 5: Sonnet (Anthropic - your main quota)
```

**Why this works:** Each provider has its own rate limit quota. By distributing across providers, you multiply your available capacity by 4-5x.

---

## Rate Limiter Setup

### Installation

The rate limiter is already included at `~/.claude/lib/rate-limiter.js`.

### How It Works

**Token Bucket Algorithm:**
- Each provider gets a bucket of tokens (60-100 tokens)
- Each API call consumes 1 token
- Tokens refill automatically over time (per minute)
- Requests wait if no tokens available

**Default Limits:**
```javascript
{
  glm: 60 req/min,         // Z.AI GLM models
  featherless: 100 req/min, // Featherless models
  google: 60 req/min,       // Google Gemini (free tier)
  anthropic: 50 req/min     // Anthropic Claude (tier 1)
}
```

### Check Rate Limit Status

The rate limiter tracks token availability in real-time:

```bash
# Check proxy logs for rate limit status
tail -f /tmp/claude-proxy.log

# Example output:
# [12:34:56] Rate limit status:
# - glm: 45/60 tokens (75%)
# - featherless: 89/100 tokens (89%)
# - google: 30/60 tokens (50%)
# - anthropic: 12/50 tokens (24%) ⚠️ Low
```

---

## Automatic Retry Configuration

### Built-in Retry Logic

The error handler (`~/.claude/hooks/error-handler.sh`) automatically detects and retries rate limit errors:

**Detection Patterns:**
- HTTP 429 status code
- "rate limit" in error message
- "quota exceeded"
- "too many requests"

**Retry Strategy:**
```bash
Attempt 1: Wait 5 seconds (base delay for rate limits)
Attempt 2: Wait 10 seconds (exponential backoff: 5 * 2)
Attempt 3: Wait 20 seconds (exponential backoff: 10 * 2)
Max: 60 seconds (cap)
```

### Configuration

Edit retry behavior in `~/.claude/hooks/error-handler.sh`:

```bash
# Line 91-94: Rate limit backoff configuration
if [[ "$classification" == "RATE_LIMIT" ]]; then
    base_delay=5000      # Change this: 5s base (5000ms)
    max_delay=60000      # Change this: 60s max (60000ms)
fi
```

**Recommendations:**
- **Aggressive**: `base_delay=2000` (2s) - Retry quickly, may hit limit again
- **Moderate**: `base_delay=5000` (5s) - Default, balanced
- **Conservative**: `base_delay=10000` (10s) - Safer, slower recovery

---

## Model Distribution Strategies

### Strategy 1: Round-Robin Across Providers

Use different providers for different subtasks:

```bash
# Main task: Use Anthropic Claude
claude /auto

# Subtask 1: Research (use GLM - Chinese docs)
m glm

# Subtask 2: Security analysis (use Dolphin)
m dolphin

# Subtask 3: Complex reasoning (use Qwen)
m qwen

# Subtask 4: Fast prototyping (use Llama 8B)
m llama8b
```

### Strategy 2: Provider-Specific Use Cases

**GLM Models (Z.AI):**
- 60 req/min quota
- Best for: Chinese content, multilingual, orchestration
- Models: glm-4.7, glm-4-flash, glm-4-air

**Featherless Models:**
- 100 req/min quota (higher!)
- Best for: Security, unrestricted tasks, bulk processing
- Models: dolphin, qwen, rabbit, llama8b, llama70b

**Google Gemini:**
- 60 req/min free tier (15 req/min if API key)
- Best for: Multimodal, search grounding, fast responses
- Models: gemini-2.0-flash, gemini-pro

**Anthropic:**
- 50 req/min (tier 1), varies by tier
- Best for: Complex reasoning, architecture, production quality
- Models: opus, sonnet, haiku

### Strategy 3: Swarm with Mixed Models

When spawning agents, explicitly assign different models:

```bash
# Manual swarm spawn with model distribution
for model in glm dolphin qwen llama8b; do
    m $model << EOF
Subtask $model: [description]
EOF &
done
wait
```

---

## Monitoring and Debugging

### Check Current Rate Limit Usage

```bash
# View proxy logs (includes rate limit status)
tail -f /tmp/claude-proxy.log

# Check error handler logs
tail -f ~/.claude/error-handler.log

# Check memory manager logs (tracks retry patterns)
tail -f ~/.claude/memory-manager.log
```

### Interpreting Rate Limit Errors

**Error Types:**

1. **Hard Limit (429):**
```
API Error: 429 Too Many Requests
rate_limit_error: You exceeded your rate limit
```
**Solution:** Wait 60s or switch to different provider

2. **Quota Exceeded:**
```
API Error: quota exceeded
You've used all your free tier quota
```
**Solution:** Upgrade API tier or switch providers

3. **Concurrent Request Limit:**
```
API Error: Too many concurrent requests
```
**Solution:** Reduce spawned agents or add delays

### Debug Commands

```bash
# Test rate limiter (after starting proxy)
curl http://127.0.0.1:3000/v1/rate-limit/status

# Test single provider
curl http://127.0.0.1:3000/v1/rate-limit/status/glm

# Check error classification
~/.claude/hooks/error-handler.sh classify "rate limit exceeded"
# Output: RATE_LIMIT
```

---

## Best Practices

### DO:

✅ **Distribute across providers** when spawning multiple agents
✅ **Use Featherless for bulk tasks** (100 req/min vs 50-60 for others)
✅ **Monitor rate limit status** in proxy logs
✅ **Let automatic retry handle** transient rate limits
✅ **Use `clauded`** for GLM quota (separate from Anthropic)
✅ **Upgrade API tiers** if hitting limits frequently

### DON'T:

❌ **Don't spawn 10+ agents** all using same provider
❌ **Don't disable retry logic** (it's there for a reason)
❌ **Don't use free tier** for production workloads
❌ **Don't ignore rate limit warnings** in logs
❌ **Don't hammer retries** with zero delay

---

## Configuration Files

### Rate Limiter Config

Edit `~/.claude/lib/rate-limiter.js` to customize limits:

```javascript
// Line 9-16: Adjust rate limits per provider
this.limits = {
  glm: config.glm || 60,           // Default: 60 req/min
  featherless: config.featherless || 100, // Default: 100 req/min
  google: config.google || 60,     // Default: 60 req/min
  anthropic: config.anthropic || 50, // Default: 50 req/min
  ...config.custom
};
```

### Error Handler Config

Edit `~/.claude/hooks/error-handler.sh`:

```bash
# Line 91-94: Rate limit backoff
base_delay=5000      # 5 seconds base
max_delay=60000      # 60 seconds max

# Line 54-56: Max retries
max_retries="${3:-3}"  # Default: 3 attempts
```

### Proxy Server Config

The proxy automatically uses the rate limiter (no config needed).

---

## Troubleshooting

### Issue: Still hitting rate limits despite rate limiter

**Cause:** Multiple Claude instances using same provider
**Solution:**
```bash
# Check running proxy instances
ps aux | grep model-proxy-server

# Kill duplicates
pkill -f model-proxy-server

# Restart single proxy
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
```

---

### Issue: Rate limiter not working

**Cause:** Proxy server not using rate limiter
**Solution:**
```bash
# Check if proxy has rate limiter
grep -n "rate-limiter" ~/.claude/model-proxy-server.js

# If not found, proxy needs update (see RATE-LIMIT-INTEGRATION.md)
```

---

### Issue: All providers hitting rate limits

**Cause:** Too many concurrent requests
**Solution:**
```bash
# Reduce swarm size
/swarm spawn 3 "task"  # Instead of 10+

# Add delays between spawns
for model in glm dolphin qwen; do
    m $model << EOF
Task
EOF
    sleep 2  # 2 second delay between spawns
done
```

---

### Issue: Free tier quota exhausted

**Upgrade Options:**

**Anthropic Claude:**
- Tier 1: $5 spent → 50 req/min
- Tier 2: $40 spent → 1000 req/min
- Tier 3: $200 spent → 2000 req/min
- Tier 4: $1000 spent → 4000 req/min

**Google Gemini:**
- Free: 15 req/min (API key) or 60 req/min (OAuth)
- Paid: 2000 req/min

**Featherless:**
- Free: 100 req/min (generous!)
- Paid: Contact for higher limits

**Z.AI GLM:**
- Free tier: 60 req/min
- Check Z.AI website for paid tiers

---

## Advanced: Custom Rate Limits

### Per-User Rate Limits

Create custom limits based on your tier:

```javascript
// ~/.claude/lib/rate-limiter.js
const customLimits = {
  glm: 60,
  featherless: 100,
  google: 60,
  anthropic: 1000,  // If you're on Tier 2
};

const limiter = new RateLimiter(customLimits);
```

### Per-Model Rate Limits

Different models on same provider may have different limits:

```javascript
// Fine-grained control
const limiter = new RateLimiter({
  custom: {
    'glm/glm-4.7': 60,
    'glm/glm-4-flash': 100,  // Flash model may be faster
    'featherless/dolphin': 100,
    'featherless/qwen': 80,   // Different model, different limit
  }
});
```

---

## Summary

### The 3-Layer Defense

1. **Rate Limiter (Preventive)**: Token bucket prevents hitting limits
2. **Automatic Retry (Reactive)**: Exponential backoff handles transient limits
3. **Model Distribution (Alternative)**: Multiple providers = 4-5x capacity

### Quick Commands

```bash
# Use clauded for GLM (separate quota)
clauded /auto

# Distribute across providers
m glm           # Z.AI quota
m dolphin       # Featherless quota (100 req/min!)
m gemini        # Google quota

# Check rate limit status
tail -f /tmp/claude-proxy.log

# Monitor retries
tail -f ~/.claude/error-handler.log
```

### Key Takeaway

**Don't fight rate limits - work around them by distributing load across providers.**

Each provider = separate quota pool. Use all 4 providers = 4x capacity.

---

**Guide Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** ✅ Production Ready
