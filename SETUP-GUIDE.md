# Komplete Kontrol CLI - Setup Guide

Quick setup guide to get the CLI running with GLM 4.7 integration.

## Prerequisites

- Bun runtime installed
- GLM API key from Z.AI (BigModel)
- Multi-model MCP proxy server (automatically configured)

## Setup Steps

### 1. Get API Key

Get your GLM API key from: https://open.bigmodel.cn/

### 2. Set Environment Variable

```bash
export BIGMODEL_API_KEY="your-api-key-here"
```

To make it persistent, add to your shell config:

```bash
# For bash
echo 'export BIGMODEL_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc

# For zsh
echo 'export BIGMODEL_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc

# For fish
echo 'set -gx BIGMODEL_API_KEY "your-api-key-here"' >> ~/.config/fish/config.fish
```

### 2a. Optional: Anthropic Fallback

If you want Anthropic as a fallback provider:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### 3. Build the CLI

```bash
bun run build
```

### 4. Verify Installation

```bash
bun run dist/index.js --help
```

You should see all 6 commands listed.

### 5. Run Quick Test

```bash
bun run dist/index.js auto "Create a hello world function" -i 1
```

Expected output:
```
🤖 Autonomous mode activated
Goal: Create a hello world function

⠋ Starting autonomous loop...
[LLM response and execution]
✅ Goal achieved in 1 iteration
```

## Available Commands

### /auto - Autonomous Mode

Execute tasks autonomously with ReAct + Reflexion loop.

```bash
bun run dist/index.js auto "Your goal here" [options]

Options:
  -m, --model <model>         Model to use (default: auto-routed)
  -i, --iterations <number>   Max iterations (default: 50)
  -c, --checkpoint <number>   Checkpoint every N iterations (default: 10)
  -v, --verbose              Verbose output
```

**Examples**:
```bash
# Simple task
bun run dist/index.js auto "Create a fibonacci function"

# With specific model
bun run dist/index.js auto "Refactor the auth logic" -m "claude-opus-4.5"

# Limited iterations with verbose output
bun run dist/index.js auto "Debug the API error" -i 10 -v
```

### /sparc - SPARC Methodology

Execute tasks using the SPARC methodology (Specification → Pseudocode → Architecture → Refinement → Completion).

```bash
bun run dist/index.js sparc "Task description" [options]

Options:
  -r, --requirements <items...>  Requirements list
  -c, --constraints <items...>   Constraints list
  -v, --verbose                  Verbose output
```

**Examples**:
```bash
# Basic workflow
bun run dist/index.js sparc "Build a REST API for user management"

# With requirements and constraints
bun run dist/index.js sparc "Design a caching system" \
  -r "Must handle 10k requests/sec" \
  -r "Support TTL expiration" \
  -c "Memory budget: 1GB" \
  -c "No external dependencies"
```

### /swarm - Distributed Agents

Spawn and manage distributed agent swarms for parallel execution.

```bash
bun run dist/index.js swarm <action> [task] [options]

Actions:
  spawn     Spawn a new swarm
  status    Check swarm status
  collect   Collect and merge results
  clear     Clear swarm data

Options:
  -n, --count <number>    Number of agents (default: 5)
  -id, --swarm-id <id>    Swarm ID (for status/collect)
  -d, --dir <directory>   Working directory
  -v, --verbose           Verbose output
```

**Examples**:
```bash
# Spawn swarm
bun run dist/index.js swarm spawn "Implement authentication" -n 5

# Check status
bun run dist/index.js swarm status -id <swarm-id>

# Collect results
bun run dist/index.js swarm collect -id <swarm-id>
```

### /reflect - Reflexion Loops

Run ReAct + Reflexion cycles (Think → Act → Observe → Reflect).

```bash
bun run dist/index.js reflect "Goal" [options]

Options:
  -i, --iterations <number>  Number of cycles (default: 3)
  -v, --verbose              Verbose output
```

**Examples**:
```bash
# Basic reflexion
bun run dist/index.js reflect "Optimize database queries" -i 3

# Single cycle for quick test
bun run dist/index.js reflect "Improve error handling" -i 1
```

### /research - Code Research

Research code patterns, solutions, and best practices.

```bash
bun run dist/index.js research "Query" [options]

Options:
  -s, --sources <sources...>   Sources: github, memory, web
  -l, --limit <number>         Result limit (default: 10)
  --lang <languages...>        Filter by languages
  -v, --verbose                Verbose output
```

**Examples**:
```bash
# Basic research
bun run dist/index.js research "How to implement OAuth2"

# With filters
bun run dist/index.js research "async/await patterns" \
  --lang typescript javascript -l 20

# Specific sources
bun run dist/index.js research "Redis caching" -s github memory
```

### /rootcause - Root Cause Analysis

Perform root cause analysis with regression detection.

```bash
bun run dist/index.js rootcause <action> [options]

Actions:
  analyze   Analyze a bug
  verify    Verify a fix

Options:
  -b, --bug <description>      Bug description
  -t, --type <type>            Bug type
  --test <command>             Test command
  --snapshot <id>              Before snapshot ID
  -f, --fix <description>      Fix description
  -v, --verbose                Verbose output
```

**Examples**:
```bash
# Analyze bug
bun run dist/index.js rootcause analyze \
  -b "Authentication fails on refresh" \
  -t "security"

# Verify fix
bun run dist/index.js rootcause verify \
  --test "npm test" \
  --snapshot <id> \
  -f "Updated token refresh logic"
```

## Troubleshooting

### "BIGMODEL_API_KEY not set"

**Solution**: Export your GLM API key:
```bash
export BIGMODEL_API_KEY="your-api-key-here"
```

### "Provider not available: mcp"

**Cause**: Multi-model MCP proxy is not running.

**Solution**:
1. Verify proxy is running: `curl http://127.0.0.1:3000/v1/messages`
2. Start proxy if needed: `node ~/.claude/multi-model-mcp-server.js`
3. Check API key is set correctly

### "Unknown MCP model: glm-4.7"

**Cause**: Model configuration not synced between MCPProvider and proxy.

**Solution**:
1. Verify GLM MCP server is configured: `grep -A 5 "glm" ~/.claude/multi-model-mcp-server.js`
2. Rebuild CLI: `bun run build`
3. Restart proxy server

### Commands are slow

**Expected Behavior**:
- First request: 5-15 seconds (model initialization)
- Subsequent requests: 2-5 seconds

**If slower**:
- Check network connection
- Verify API rate limits not exceeded
- Try with `-v` flag to see detailed progress

### Build errors

```bash
# Clean and rebuild
rm -rf dist node_modules
bun install
bun run build
```

## Advanced Features

### Multi-Model Support

The CLI supports multiple LLM providers and models. Specify with `-m` flag:

```bash
# Use specific provider/model
bun run dist/index.js auto "task" -m "glm/glm-4.7"

# Use model name (auto-routes to correct provider)
bun run dist/index.js auto "task" -m "claude-opus-4.5"
```

### Memory System

The CLI integrates with the bash memory system. Commands automatically:
- Record task completions to episodic memory
- Store patterns and learnings to semantic memory
- Track context in working memory
- Auto-checkpoint progress every 10 iterations

### Context Auto-Compaction

When context reaches 80% of the limit (128k tokens for Claude):
- Automatically compacts conversation history
- Preserves critical information
- Reduces token count by 50-80%
- Continues execution seamlessly

## Next Steps

1. **Run Smoke Tests**: Execute `./smoke-test.sh` for comprehensive validation
2. **Try Each Command**: Test all 6 commands with simple tasks
3. **Read TESTING-GUIDE.md**: Detailed testing instructions
4. **Check TEST-EXECUTION-REPORT.md**: Full test results

## Support

For issues or questions:
- Check TESTING-GUIDE.md for detailed examples
- Review TEST-EXECUTION-REPORT.md for known issues
- See project CLAUDE.md for architecture details
