# Rate Limit Quick Start - Immediate Solutions

**TL;DR:** Use different models for different agents to avoid rate limits.

---

## The Problem

```
Error: API Error: Rate Limit reached
429 Too Many Requests
```

This happens when spawning multiple agents or making too many API calls to the same provider.

---

## Immediate Solutions (No Setup Required)

### Solution 1: Use `clauded` for Some Agents

Instead of all agents using Anthropic Claude (and hitting your Anthropic rate limit), use `clauded` which connects to GLM-4.7 via Z.AI:

```bash
# Agent 1: Regular claude (Anthropic quota)
claude /auto "Implement feature A"

# Agent 2: clauded (Z.AI quota - separate!)
clauded /auto "Implement feature B"

# Agent 3: Different Anthropic model
claude --model claude-haiku-4-5-20250919 /auto "Implement feature C"
```

**Why this works:** Anthropic and Z.AI have separate rate limit quotas. Using both = 2x capacity.

---

### Solution 2: Use Model Switcher for Distribution

Use the `m` command to distribute across all providers:

```bash
# Agent 1: GLM (Z.AI - 60 req/min)
m glm /auto "Task A" &

# Agent 2: Dolphin (Featherless - 100 req/min!)
m dolphin /auto "Task B" &

# Agent 3: Qwen (Featherless - different model)
m qwen /auto "Task C" &

# Agent 4: Gemini (Google - 60 req/min)
m gemini /auto "Task D" &

# Agent 5: Sonnet (Anthropic - 50 req/min)
m sonnet /auto "Task E" &

wait  # Wait for all to complete
```

**Why this works:** Each provider has its own rate limit. Using all 4 providers = 270 requests/min vs 50 with just Anthropic!

---

### Solution 3: Featherless Has Higher Limits

Featherless offers **100 req/min** vs Anthropic's 50 req/min (tier 1). Use Featherless for bulk tasks:

```bash
# Bulk processing: Use Featherless models
m dolphin /auto "Process all files in directory"

# Complex reasoning: Use Qwen (also Featherless)
m qwen /auto "Analyze and refactor codebase"

# Fast tasks: Use Llama 8B (Featherless)
m llama8b /auto "Generate docs for all functions"
```

---

## Automatic Retry (Already Works)

Your error handler (`~/.claude/hooks/error-handler.sh`) **already handles rate limits automatically**:

- Detects 429 errors
- Waits 5-60 seconds (exponential backoff)
- Retries up to 3 times
- Logs to `~/.claude/error-handler.log`

**You don't need to do anything** - it's already working! But if you still hit limits, use the solutions above to distribute load.

---

## Provider Comparison

| Provider | Free Tier | Models Available | Best For |
|----------|-----------|------------------|----------|
| **Featherless** | 100 req/min | Dolphin, Qwen, Llama | Bulk tasks, security, unrestricted |
| **Z.AI (GLM)** | 60 req/min | GLM-4.7, GLM-4-Flash | Chinese content, multilingual |
| **Google** | 60 req/min | Gemini 2.0 Flash | Multimodal, search grounding |
| **Anthropic** | 50 req/min (tier 1) | Opus, Sonnet, Haiku | Complex reasoning, quality |

---

## Quick Commands Reference

```bash
# Check which alias does what
type claude     # Standard Anthropic
type clauded    # GLM-4.7 via proxy
type m          # Model switcher

# Start agents with different providers
clauded /auto "Task 1" &          # Z.AI quota
m dolphin /auto "Task 2" &        # Featherless quota
m gemini /auto "Task 3" &         # Google quota
claude /auto "Task 4" &           # Anthropic quota

# Check error logs
tail -f ~/.claude/error-handler.log
```

---

## When You'll Still Hit Limits

Even with distribution, you can still hit limits if:

1. **Too many agents** - Don't spawn 20+ agents simultaneously
2. **Single provider overload** - All using same model
3. **Free tier caps** - Upgrade to paid tier for higher limits

**Solution:** Reduce concurrent agents or upgrade API tiers.

---

## Advanced: Upgrade API Tiers

If you frequently hit rate limits:

### Anthropic Tiers
- **Tier 1** (default): 50 req/min - Free after $5 spent
- **Tier 2**: 1000 req/min - Requires $40 spent
- **Tier 3**: 2000 req/min - Requires $200 spent
- **Tier 4**: 4000 req/min - Requires $1000 spent

### Featherless
- **Free**: 100 req/min (very generous!)
- **Paid**: Contact for enterprise limits

### Google Gemini
- **Free** (OAuth): 60 req/min
- **Free** (API key): 15 req/min
- **Paid**: 2000 req/min

---

## Summary

**Immediate fix:** Use `clauded` for some agents, `m [model]` for others.

**Why it works:** Each provider = separate rate limit quota.

**How many models can you use at once?**
- Anthropic: 3 models (Opus, Sonnet, Haiku) - share same quota
- Z.AI: 4 GLM models - share same quota
- Featherless: 5 models - share same quota
- Google: 2 Gemini models - share same quota

**Total unique quotas: 4** (Anthropic + Z.AI + Featherless + Google)

**Maximum parallel capacity:** ~270 requests/min across all providers (vs 50 with just Anthropic)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
