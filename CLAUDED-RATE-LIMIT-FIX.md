# Clauded Rate Limit Prevention

**For:** `clauded` command (GLM-4.7 via Z.AI)
**Date:** 2026-01-12

---

## The Problem

When using `clauded`, you hit Z.AI's rate limits:

```bash
clauded /auto  # Spawns agents, calls MCP servers
# Error: API Error: Rate Limit reached (429)
# Z.AI: 60 requests per minute exceeded
```

**Why this happens:**
- `clauded` uses GLM-4.7 through Z.AI proxy
- Z.AI free tier: **60 requests/minute**
- Spawning 3+ agents = 3+ parallel request streams
- Each MCP server call = 1 request
- Total requests easily exceed 60/min

---

## Solutions for Clauded

### Solution 1: Rate Limiter (Already Patched!)

The proxy server now has rate limiting built-in. It automatically:
- Tracks token usage (60 tokens/min for GLM)
- Queues requests when no tokens available
- Waits for token refill instead of failing

**Status:** ✅ Already installed by patch script

**To activate:**
```bash
# Restart proxy to use rate limiter
pkill -f model-proxy-server
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &

# Test clauded
clauded /auto
```

---

### Solution 2: Use Multiple GLM Models

Z.AI offers multiple GLM models. Distribute load across them:

```bash
# Agent 1: GLM-4.7 (orchestrator)
clauded --model glm/glm-4.7 /auto "Main task" &

# Agent 2: GLM-4 Flash (faster, separate quota?)
clauded --model glm/glm-4-flash /auto "Subtask 1" &

# Agent 3: GLM-4 Air (balanced)
clauded --model glm/glm-4-air /auto "Subtask 2" &

wait
```

**Note:** May share same quota pool, but worth testing.

---

### Solution 3: Fallback to Other Models

When GLM rate limit is hit, automatically fall back to other providers:

**Edit `~/.claude/scripts/clauded.sh`:**

```bash
#!/bin/bash
# Clauded with automatic fallback

# Start with GLM-4.7
MODEL="glm/glm-4.7"

# Auto-start proxy if not running
if ! ps aux | grep -q "[m]odel-proxy-server.js"; then
    node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
    sleep 1
fi

# Try GLM first, fallback to Featherless on rate limit
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 claude --dangerously-skip-permissions --model "$MODEL" "$@" 2>&1 | tee /tmp/clauded-output.txt &
PID=$!

# Monitor for rate limit error
(
    sleep 5  # Give it a chance to start
    if grep -q "rate limit\|429" /tmp/clauded-output.txt 2>/dev/null; then
        echo "⚠️  GLM rate limit hit, falling back to Featherless Qwen..."
        kill $PID 2>/dev/null
        ANTHROPIC_BASE_URL=http://127.0.0.1:3000 claude --dangerously-skip-permissions --model "featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated" "$@"
    fi
) &

wait $PID 2>/dev/null
```

---

### Solution 4: Reduce Agent Spawn Rate

When spawning agents with `clauded`, add delays:

**Instead of:**
```bash
clauded /auto
# Spawns all agents immediately → rate limit
```

**Do this:**
```bash
# Configure agent spawn delay
export AGENT_SPAWN_DELAY=2000  # 2 seconds between spawns

clauded /auto
```

**Or manually control spawning:**
```bash
# Spawn agents with delay
for task in task1 task2 task3; do
    clauded /auto "$task" &
    sleep 3  # 3 second delay
done
wait
```

---

### Solution 5: Monitor Rate Limit in Real-Time

Watch proxy logs to see rate limit status:

```bash
# Terminal 1: Start proxy with logging
node ~/.claude/model-proxy-server.js 3000 2>&1 | tee /tmp/claude-proxy.log

# Terminal 2: Watch rate limits
tail -f /tmp/claude-proxy.log | grep -i "rate\|glm"

# You'll see:
# [12:34:56] Rate limits: glm: 45/60 (75%), featherless: 89/100 (89%)
# [12:34:57] Rate limits: glm: 30/60 (50%), featherless: 88/100 (88%)
# [12:34:58] Rate limits: glm: 15/60 (25%) ⚠️ Low
```

---

### Solution 6: Upgrade Z.AI Tier

If you frequently hit 60 req/min limit:

**Z.AI Pricing:**
- Free tier: 60 req/min
- Check https://api.z.ai/ for paid tiers

**Alternative:** Use Featherless for bulk work (100 req/min free)

---

## Configuration

### Adjust GLM Rate Limit

Edit `~/.claude/lib/rate-limiter.js`:

```javascript
// Line 10: Adjust GLM limit if you have paid tier
this.limits = {
  glm: config.glm || 60,           // Change to your tier limit
  featherless: config.featherless || 100,
  google: config.google || 60,
  anthropic: config.anthropic || 50
};
```

---

### Adjust Retry Backoff

Edit `~/.claude/hooks/error-handler.sh`:

```bash
# Line 91-94: GLM rate limit backoff
if [[ "$classification" == "RATE_LIMIT" ]]; then
    base_delay=5000      # 5 seconds (increase for less aggressive retry)
    max_delay=60000      # 60 seconds max
fi
```

**Recommendations for `clauded`:**
- Conservative: `base_delay=10000` (10s) - Less aggressive, fewer retries
- Moderate: `base_delay=5000` (5s) - Default
- Aggressive: `base_delay=2000` (2s) - Retry quickly, may hit limit again

---

## Testing

### Test Rate Limiter

```bash
# Start proxy
pkill -f model-proxy-server
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &

# Spam requests to test rate limiter
for i in {1..100}; do
    clauded "echo test $i" &
done

# Watch logs - should see rate limiting in action
tail -f /tmp/claude-proxy.log
```

**Expected output:**
```
[12:34:56] Rate limits: glm: 60/60 (100%)
[12:34:57] Rate limits: glm: 45/60 (75%)
[12:34:58] Rate limits: glm: 30/60 (50%)
[12:34:59] Rate limits: glm: 15/60 (25%)
[12:35:00] Rate limits: glm: 5/60 (8%) ⚠️ Low
[12:35:01] ⏳ Waiting for GLM token... (queue: 10)
[12:35:02] ✓ GLM token available
```

---

### Test Automatic Retry

```bash
# Simulate rate limit error
clauded /auto "spawn 5 agents"

# Check error handler logs
tail -f ~/.claude/error-handler.log

# Expected:
# [12:35:00] Analyzing error with error-handler...
# [12:35:00] Error classified as: RATE_LIMIT (retry: true, backoff: 5000ms)
# [12:35:05] Retrying... (attempt 2)
# [12:35:05] ✓ Success after retry
```

---

## Best Practices for Clauded

### DO:

✅ **Use rate limiter** (restart proxy after patching)
✅ **Monitor rate limit status** in proxy logs
✅ **Add delays** when spawning multiple agents (3s between spawns)
✅ **Use fallback models** when GLM is rate limited
✅ **Upgrade Z.AI tier** if hitting limits frequently

### DON'T:

❌ **Don't spawn 10+ agents** with clauded simultaneously
❌ **Don't disable retry logic** in error-handler.sh
❌ **Don't ignore "Low" warnings** in proxy logs
❌ **Don't use clauded for bulk processing** (use Featherless instead: 100 req/min)

---

## Troubleshooting

### Issue: Still hitting rate limits with rate limiter

**Check if proxy is using rate limiter:**
```bash
grep -n "rate-limiter" ~/.claude/model-proxy-server.js

# Should show import and usage
# If not found, re-run patch:
node ~/Desktop/Projects/komplete-kontrol-cli/patch-proxy-rate-limiter.cjs
```

**Restart proxy:**
```bash
pkill -f model-proxy-server
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
```

---

### Issue: Rate limiter not working

**Verify rate limiter exists:**
```bash
ls -la ~/.claude/lib/rate-limiter.js

# If missing:
# File is at: ~/Desktop/Projects/komplete-kontrol-cli/RATE-LIMIT-PREVENTION-GUIDE.md
# Copy rate-limiter.js code from guide
```

---

### Issue: Want faster retries

**Edit error-handler.sh:**
```bash
# Line 91: Reduce base delay
base_delay=2000  # 2 seconds instead of 5
```

**Trade-off:** Faster recovery, but more likely to hit rate limit again.

---

## Summary

**For `clauded` users hitting rate limits:**

1. **Rate Limiter** - Already patched (restart proxy to activate)
2. **Automatic Retry** - Already works (5-60s backoff)
3. **Monitor Status** - Watch proxy logs for token levels
4. **Add Delays** - 3s between agent spawns
5. **Fallback Models** - Use Featherless when GLM is limited

**Quick Fix:**
```bash
# Restart proxy with rate limiter
pkill -f model-proxy-server
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &

# Use clauded with monitoring
clauded /auto &
tail -f /tmp/claude-proxy.log
```

**Key Metric:** GLM tokens available
- 60/60 (100%) = Plenty of capacity
- 30/60 (50%) = Moderate usage
- 15/60 (25%) = High usage, be careful
- 5/60 (8%) = Very low, requests will queue
- 0/60 (0%) = Rate limited, waiting for refill

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**For:** clauded command only
