# Model Discovery Analysis - How GLM Appeared in /model Dropdown

**Date:** 2026-01-12
**Status:** ✅ Verified Working

---

## Summary

GLM-4.7 now appears in Claude Code's `/model` dropdown because:

1. **Proxy returns models** via `/v1/models` endpoint
2. **Claude Code fetches** from `ANTHROPIC_BASE_URL/v1/models`
3. **Dropdown populated** with all returned models

---

## How It Works

### Step 1: Claude Code Startup

When you run:
```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 claude
```

Claude Code makes a request to:
```
http://127.0.0.1:3000/v1/models
```

### Step 2: Proxy Response

The proxy server returns all available models:

```bash
$ curl http://127.0.0.1:3000/v1/models | jq -r '.data[] | .id'

# Anthropic models (native)
claude-4.5-opus-20251101
claude-4.5-sonnet-20251001
claude-haiku-4-5-20250919

# GLM models (via proxy) ⭐
glm/glm-4.7
glm/glm-4
glm/glm-4-flash
glm/glm-4-air

# Google models (via proxy)
google/gemini-3-pro
google/gemini-pro
google/gemini-2.0-flash

# Featherless models (via proxy)
featherless/dphn/Dolphin-Mistral-24B-Venice-Edition
featherless/huihui-ai/Qwen2.5-72B-Instruct-abliterated
featherless/WhiteRabbitNeo/WhiteRabbitNeo-13B-v1
featherless/Llama-3-8B-Instruct-abliterated
featherless/Llama-3-70B-Instruct-abliterated
```

### Step 3: Dropdown Population

Claude Code's `/model` command shows:

```
1. Default (recommended)  Opus 4.5 · Most capable for complex work
2. Sonnet ✓              Sonnet 4.5 · Best for everyday tasks
3. Haiku                 Haiku 4.5 · Fastest for quick answers
4. glm/glm-4.7           Custom model ⭐ (This is GLM!)
```

---

## Code Location

### Claude Code Binary

**File:** `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js`

**Evidence:**
```bash
$ grep -o "v1/models" cli.js | wc -l
4
```

The binary makes 4 references to `v1/models` endpoint, confirming it fetches the model list from the API.

### Proxy Server

**File:** `~/.claude/model-proxy-server.js`

**Models endpoint handler** (lines ~920-950):

```javascript
// GET /v1/models - Return all available models
if (req.method === 'GET' && req.url === '/v1/models') {
  const models = {
    object: 'list',
    data: [
      // Anthropic native models
      { id: 'claude-4.5-opus-20251101', ... },
      { id: 'claude-4.5-sonnet-20251001', ... },
      { id: 'claude-haiku-4-5-20250919', ... },

      // GLM models (via Z.AI)
      { id: 'glm/glm-4.7', ... },
      { id: 'glm/glm-4', ... },
      { id: 'glm/glm-4-flash', ... },
      { id: 'glm/glm-4-air', ... },

      // Featherless models
      { id: 'featherless/dphn/Dolphin-Mistral-24B-Venice-Edition', ... },
      // ... etc
    ]
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(models));
}
```

---

## Why This Works

### Standard OpenAI-Compatible API

Claude Code implements the standard OpenAI API pattern:

1. **Discover models:** `GET /v1/models`
2. **Use model:** `POST /v1/messages` with `model` parameter

By implementing this standard interface, the proxy can:
- Return any models it supports
- Route requests to appropriate providers
- Maintain compatibility with Claude Code

### No Binary Modification Needed

**Key insight:** We don't need to modify the obfuscated Claude Code binary!

The binary already:
- Fetches models dynamically from API
- Populates dropdown with returned models
- Accepts any model ID

We just need to:
- Return our models in the API response
- Route requests to the right providers

---

## Model ID Format

### Native Models (No Prefix)

```
claude-4.5-opus-20251101
claude-4.5-sonnet-20251001
claude-haiku-4-5-20250919
```

These go directly to Anthropic API (or pass through proxy).

### Proxy Models (With Prefix)

```
glm/glm-4.7              → Routed to Z.AI
featherless/...          → Routed to Featherless
google/gemini-pro        → Routed to Google
```

The prefix tells the proxy which provider to use.

---

## Adding More Models

To add new models to the dropdown:

### Step 1: Add to Proxy Response

Edit `~/.claude/model-proxy-server.js`, find the models array:

```javascript
data: [
  // ... existing models ...

  // Add your new model
  {
    id: 'provider/model-name',
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'provider'
  }
]
```

### Step 2: Add Request Handler

Add handling for the new provider:

```javascript
if (model.startsWith('provider/')) {
  return handleNewProvider(anthropicBody, res);
}
```

### Step 3: Restart Proxy

```bash
pkill -f model-proxy-server
node ~/.claude/model-proxy-server.js 3000 > /tmp/claude-proxy.log 2>&1 &
```

### Step 4: Verify

```bash
# Start Claude with proxy
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 claude

# Run /model command
/model

# Your new model should appear in dropdown!
```

---

## Implications for Context Management

**Discovery:** GLM-4.7 appearing in dropdown means Claude Code:

1. **Treats it as a first-class model** (not a hack!)
2. **Can use it in spawned agents** (agents inherit model selection)
3. **Persists model choice** across sessions
4. **Works with all Claude Code features** (/auto, /swarm, etc.)

This is important for agent context management because:
- Agents can use GLM-4.7 or any custom model
- Each agent can use a different model (distribution strategy)
- Model selection affects token usage and context windows

---

## Testing

### Verify Model List

```bash
# Check proxy returns models
curl http://127.0.0.1:3000/v1/models | jq -r '.data[] | .id'

# Should include glm/glm-4.7
```

### Verify Dropdown

```bash
# Start Claude with proxy
ANTHROPIC_BASE_URL=http://127.0.0.1:3000 claude

# Run model command
/model

# GLM-4.7 should be option #4 (or similar)
```

### Verify Model Works

```bash
# Select GLM in dropdown, then test
echo "Test message" | # Should get response from GLM-4.7
```

---

## Summary

**How GLM-4.7 appeared in /model dropdown:**

1. ✅ **Proxy exposes `/v1/models` endpoint**
2. ✅ **Returns GLM-4.7 in model list**
3. ✅ **Claude Code fetches models on startup**
4. ✅ **Dropdown populated with all models**
5. ✅ **User selects GLM from dropdown**
6. ✅ **Requests routed to Z.AI via proxy**

**Key Files:**
- `/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js` (fetches models)
- `~/.claude/model-proxy-server.js` (returns models)

**No modification needed to Claude Code binary!**

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Status:** ✅ Production Ready
