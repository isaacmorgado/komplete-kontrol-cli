# How to Use the `/auto` Command

## Two Ways to Use `/auto`

### Method 1: Claude Code (Shell Hook) - Recommended for Development

This is the easiest method if you're already in Claude Code:

```bash
# In Claude Code, just type:
/auto start

# Then provide a goal, for example:
```

**What happens:**
1. Autonomous mode activates automatically
2. Claude will work fully autonomously on the goal
3. Auto-checkpoint every 10 file changes
4. Auto-compact memory at 40% context
5. Continue until goal is complete

**Stop anytime:**
```bash
/auto stop
```

**Check status:**
```bash
/auto status
```

---

### Method 2: CLI Command - For Terminal/Batch Scripts

Use this from terminal or in scripts:

```bash
# Navigate to project directory
cd /Users/imorgado/Desktop/Projects/komplete-kontrol-cli

# Run auto command with a goal
node dist/index.js auto "Your goal here" [options]

# Example:
node dist/index.js auto "Implement user authentication" -v

# Example with custom options:
node dist/index.js auto "Refactor code" -m anthropic/claude-3-5-sonnet -i 100 -c 20 -v
```

**Options:**
- `-m, --model <model>` - Model to use (default: auto-routed)
- `-i, --iterations <number>` - Max iterations (default: 50)
- `-c, --checkpoint <number>` - Checkpoint every N iterations (default: 10)
- `-v, --verbose` - Verbose output
- `-h, --help` - Show help

**Or make it easier with an alias:**

Add to `~/.zshrc` or `~/.bashrc`:
```bash
alias komplete='node /Users/imorgado/Desktop/Projects/komplete-kontrol-cli/dist/index.js'
```

Then use:
```bash
komplete auto "Your goal here" -v
```

---

## Quick Start Examples

### In Claude Code (Recommended)

```
/auto start

Claude: 🤖 AUTONOMOUS MODE ACTIVATED

User: Implement user authentication
```

Claude will then work autonomously on authentication.

---

### In Terminal

```bash
# Simple test
node dist/index.js auto "Create a README file" -v

# Real task
node dist/index.js auto "Add API endpoint for user registration" -v

# With specific model and iterations
node dist/index.js auto "Refactor the codebase to use TypeScript" \
  -m anthropic/claude-3-5-sonnet \
  -i 100 \
  -c 15 \
  -v
```

---

## Which Method Should You Use?

| Use This Method | When | Example |
|----------------|-------|----------|
| **Claude Code `/auto`** | Working in Claude Code IDE | Interactive coding sessions |
| **CLI `komplete auto`** | Running scripts, CI/CD, batch jobs | Automated workflows |

---

## Common Use Cases

### 1. Building a Feature (Claude Code)
```bash
/auto start
User: Implement a REST API with authentication
```

### 2. Refactoring Code (CLI)
```bash
node dist/index.js auto "Refactor the codebase to use TypeScript" -v
```

### 3. Writing Tests (CLI)
```bash
node dist/index.js auto "Write comprehensive tests for the auth module" -v
```

### 4. Documentation (Claude Code)
```bash
/auto start
User: Document all API endpoints with examples
```

---

## What to Expect

When you run `/auto start` or `komplete auto "goal"`:

1. **Activation Message:**
   ```
   🤖 AUTONOMOUS MODE ACTIVATED
   
   I will now work fully autonomously:
   - Execute tasks without asking for confirmation
   - Auto-checkpoint progress every 10 changes
   - Auto-fix errors (retry up to 3 times)
   - Continue until task is complete or blocked
   ```

2. **Working Phase:**
   - Claude analyzes the goal
   - Detects task type (reverse-engineering, research, debugging, etc.)
   - Uses ReAct + Reflexion pattern for every action
   - Auto-checkpoints at thresholds
   - Auto-compacts memory when needed

3. **Completion:**
   ```
   ✅ Goal achieved in 5 iterations
   ```

4. **Stop Anytime:**
   ```bash
   /auto stop  # In Claude Code
   # Or just say "stop"
   ```

---

## Troubleshooting

### "command not found: komplete"
**Solution:** Use the full path or create an alias:
```bash
# Use full path
node /Users/imorgado/Desktop/Projects/komplete-kontrol-cli/dist/index.js auto "goal"

# Or create alias
echo "alias komplete='node /Users/imorgado/Desktop/Projects/komplete-kontrol-cli/dist/index.js'" >> ~/.zshrc
source ~/.zshrc
```

### "permission denied: ./hooks/auto.sh"
**Solution:** Make the hook executable:
```bash
chmod +x hooks/auto.sh
```

### "zsh: no such file or directory: ~/.claude/hooks/auto.sh"
**Solution:** Create the symlink:
```bash
mkdir -p ~/.claude/hooks
ln -sf "$(pwd)/hooks/auto.sh" ~/.claude/hooks/auto.sh
```

---

## Recommended Workflow

For **development** with Claude Code:
```bash
# Just use the shell hook - easiest method
/auto start
[provide your goal]
```

For **automation** or **CI/CD**:
```bash
# Use the CLI in scripts
node dist/index.js auto "goal" [options]
```

---

## Summary

**Claude Code (Easiest):**
```bash
/auto start
[then provide your goal]
```

**CLI (For scripts/automation):**
```bash
node dist/index.js auto "Your goal here" -v
```

**Both methods are fully functional and tested!** ✅
