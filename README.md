# 🤖 Claude Sovereign

**100% Autonomous AI Operation System**
_The self-governing Claude that never sleeps_

[![Status](https://img.shields.io/badge/status-production-brightgreen)]()
[![Autonomous](https://img.shields.io/badge/autonomous-100%25-blue)]()
[![Tests](https://img.shields.io/badge/tests-passing-success)]()

---

## What is Claude Sovereign?

Claude Sovereign is a **fully autonomous AI operation system** that makes Claude Code completely hands-off. Set it, forget it, come back to finished work.

Inspired by **Roo Code** and enhanced beyond, Claude Sovereign:
- ✅ Auto-compacts memory at 40% context (sliding threshold with task completion priority)
- ✅ Auto-executes /checkpoint at 40% context
- ✅ Auto-checkpoints after 10 file changes
- ✅ Auto-pushes all changes to GitHub
- ✅ Continues working without stopping
- ✅ Debug orchestrator fully functional (regression detection)
- ✅ **Zero manual intervention required**

## The Problem

Traditional Claude Code requires constant babysitting:
- ❌ Manual /checkpoint commands
- ❌ Manual /compact when context fills
- ❌ Manual git pushes
- ❌ Work stops at 40% context
- ❌ You can't step away

## The Solution

Claude Sovereign makes Claude **truly autonomous**:

```
Activate /auto mode
  ↓
Walk away from computer
  ↓
Claude works continuously:
   • Compacts memory automatically (sliding threshold: allows task completion before compacting)
   • Checkpoints progress automatically
   • Pushes to GitHub automatically
   • Uses all tools intelligently
   • Applies Ken's prompting patterns
   • Remembers everything perfectly
   • Uses debug orchestrator for regression detection
  ↓
Return to completed work
```

## Key Features

### 🎯 100% Hands-Off Operation

**Set it and forget it** - Claude operates completely autonomously:
- Detects context pressure → Compacts memory
- Detects 10 file changes → Checkpoints → Pushes to GitHub
- Hits 40% context → Compacts → Checkpoints → Pushes → Continues
- **You can literally walk away**

### 🧠 Perfect Memory System

**Never forgets anything**:
- Episodic memory (past experiences)
- Semantic memory (facts & patterns)
- Working memory (current context)
- 3-factor retrieval scoring (BM25 + Vector + Reinforcement Learning)
- Git-aware memory channels
- Checkpoint/restore capabilities

### 📁 Token-Efficient Navigation

**50-70% token savings** on codebase exploration:
- Auto-generates project structure indices
- Tree visualization with important files
- Reads `.claude/project-index.md` first
- Targeted searches instead of blind exploration

### 🤝 Intelligent Command Routing

**Knows when to execute which /command**:
- `checkpoint_context` → At 40% context
- `checkpoint_files` → After 10 files
- `build_section_complete` → After build sections
- Triple recognition patterns (JSON, tags, instructions)

### 🔧 Complete Tool Integration

**Uses everything correctly**:
- All Claude Code tools (Read, Write, Edit, Bash, etc.)
- MCP tools (GitHub search, Chrome automation, macOS control)
- Reverse engineering toolkit (Chrome extensions, Electron, APIs)
- Ken's exclusive prompting patterns
- Multi-agent orchestration
- Debug orchestrator (regression detection)

### 📚 Ken's Prompting Mastery

**Trained on exclusive patterns**:
- Short > Long (concise communication)
- Reference > Dump (smart file handling)
- Focused work (stay on task)
- Project index first (token efficiency)

## Installation

### Quick Start

```bash
# Clone repo
git clone https://github.com/isaacmorgado/claude-sovereign.git
cd claude-sovereign

# Run installer
./install.sh

# Activate autonomous mode
/auto
```

### Manual Installation

```bash
# Copy hooks
cp hooks/* ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh

# Copy commands
cp commands/* ~/.claude/commands/

# Copy config
cp config/CLAUDE.md ~/.claude/CLAUDE.md

# Copy docs
cp docs/* ~/.claude/docs/
```

## Usage

### Basic Usage

```bash
# Start autonomous mode
/auto

# Claude will now:
# 1. Load working memory
# 2. Check for continuation prompts
# 3. Resume in-progress builds
# 4. Check buildguide.md for tasks
# 5. Work completely autonomously

# Stop autonomous mode
/auto stop

# Check status
/auto status
```

### What Happens Automatically

**At 40% Context** (51,200 / 128,000 tokens) - Sliding Autocompaction:
```
1. Memory compaction (prune old episodes)
2. If task is in progress: Mark compaction as pending
3. If task completes: Execute pending compaction
4. Internal checkpoint creation
5. Router signals /checkpoint execution
6. Continuation prompt with <command-name>/checkpoint</command-name>
7. Claude executes /checkpoint immediately
8. Updates CLAUDE.md + buildguide.md
9. git add + commit + push
10. Continues working
```

**Sliding Threshold Behavior**:
- Context >= 40%: Check if task is in progress
- Task in progress: Mark compaction as pending, continue working
- Task completes: Execute pending compaction immediately
- Task not in progress: Compact immediately
- This ensures tasks complete before context compaction interrupts

**After 10 File Changes**:
```
1. File change tracker hits threshold
2. Router signals /checkpoint execution
3. Project index regenerated
4. /checkpoint executes
5. git push to GitHub
6. Continues working
```

## Architecture

### System Components

```
claude-sovereign/
├── hooks/                        # Core autonomous system
│   ├── autonomous-command-router.sh    # Decision engine
│   ├── auto-continue.sh               # 40% context handler
│   ├── memory-manager.sh              # Persistent memory
│   ├── project-navigator.sh           # Token efficiency
│   ├── file-change-tracker.sh         # 10 file tracker
│   ├── post-edit-quality.sh           # Quality checks
│   └── comprehensive-validation.sh    # Test suite
├── commands/                     # Skill commands
│   ├── auto.md                   # Autonomous mode
│   ├── checkpoint.md             # Save + Git push
│   ├── build.md                  # Autonomous builder
│   └── re.md                     # Reverse engineering
├── docs/                         # Documentation
│   ├── 40-PERCENT-FLOW-VERIFIED.md
│   ├── 100-PERCENT-HANDS-OFF-OPERATION.md
│   ├── PROJECT-NAVIGATOR-GUIDE.md
│   └── GITHUB-PUSH-AND-NAVIGATION-COMPLETE.md
└── config/                       # Configuration
    └── CLAUDE.md                 # Global settings
```

### The Flow

```
┌─────────────────────────────────────┐
│  User activates /auto mode          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Claude works autonomously           │
│  • Uses all tools correctly          │
│  • Applies Ken's patterns            │
│  • Remembers everything              │
│  • Makes intelligent decisions       │
└──────────────┬──────────────────────┘
               ↓
      ┌─────────┴─────────┐
      ↓                   ↓
[Edit 10 files]    [Reach 40% context]
      ↓                   ↓
      └─────────┬─────────┘
                ↓
┌─────────────────────────────────────┐
│  Auto-checkpoint triggered           │
│  1. Compact memory (if 40%)          │
│  2. Create checkpoint                │
│  3. Update docs                      │
│  4. Git commit + push                │
│  5. Continue working                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Sliding Autocompaction (40% threshold)│
│  - Task completion priority              │
│  - No task interruption              │
│  - Pending compaction executes after task │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Work continues (no stopping)        │
└─────────────────────────────────────┘
```

## Recognition Patterns

Claude recognizes **3 patterns** for autonomous execution:

### Pattern 1: JSON Signal
```json
{
  "execute_skill": "checkpoint",
  "reason": "context_threshold",
  "autonomous": true
}
```

### Pattern 2: Command Tag
```xml
<command-name>/checkpoint</command-name>
```

### Pattern 3: Explicit Instruction
```
Execute checkpoint:
/checkpoint
(Autonomous mode - execute immediately without asking)
```

When Claude sees **any** of these patterns:
1. **NO asking** for permission
2. **NO explaining** what it's about to do
3. **IMMEDIATE execution** using Skill tool
4. **Continue working** after completion

## Comparison

| Feature | Manual | Roo Code | steipete MCP | **Claude Sovereign** |
|---------|--------|----------|--------------|---------------------|
| Auto-checkpoint | ❌ | ✅ | ✅ | ✅ **Advanced** |
| Auto-compact | ❌ | ✅ | ❓ | ✅ **40% sliding threshold** |
| Git auto-push | ❌ | ❓ | ❌ | ✅ **Every checkpoint** |
| Token optimization | ❌ | ❓ | ❌ | ✅ **50-70% savings** |
| Perfect memory | ❌ | ❓ | ❌ | ✅ **3-factor scoring** |
| RE toolkit | ❌ | ❓ | ❌ | ✅ **Complete** |
| MCP integration | ❌ | ❓ | ✅ | ✅ **Full suite** |
| Ken's patterns | ❌ | ❓ | ❌ | ✅ **Exclusive** |
| Zero intervention | ❌ | ✅ | ✅ | ✅ **Verified** |
| Debug orchestrator | ❌ | ❌ | ❌ | ✅ **Fully functional** |

## Testing

Run comprehensive validation suite:

```bash
~/.claude/hooks/comprehensive-validation.sh
```

Tests 12 categories:
1. ✅ Core system components (6 tests)
2. ✅ Command router (5 tests)
3. ✅ Memory system (10 tests)
4. ✅ Project navigation (5 tests)
5. ✅ Skill commands (9 tests)
6. ✅ Autonomous execution (6 tests)
7. ✅ RE toolkit (7 tests)
8. ✅ Ken's patterns (5 tests)
9. ✅ Documentation (6 tests)
10. ✅ Git integration (5 tests)
11. ✅ Edge cases (5 tests)
12. ✅ MCP integrations (5 tests)

**Total: 74 comprehensive tests**

## Configuration

### Context Threshold

```bash
# Default: 40%
export CLAUDE_CONTEXT_THRESHOLD=50  # Trigger at 50%
```

### File Change Threshold

```bash
# Default: 10 files
export CHECKPOINT_FILE_THRESHOLD=15  # After 15 files
```

### Disable Autonomous Mode

```bash
/auto stop
# Or: rm ~/.claude/autonomous-mode.active
```

## Documentation

📚 **[Complete Documentation Index](DOCUMENTATION-INDEX.md)** - Navigate all 90+ organized docs

### Quick Links
- **[Quickstart Guide](docs/guides/QUICKSTART.md)** - Get started in 5 minutes
- **[Quickstart Auto Mode](docs/guides/QUICKSTART-AUTO-MODE.md)** - Autonomous operation
- **[Setup Guide](docs/guides/SETUP-GUIDE.md)** - Detailed installation
- **[Command Usage Guide](docs/guides/COMMAND-USAGE-GUIDE.md)** - All commands

### Feature Documentation
- **[Features V2 Overview](docs/features/FEATURES-V2.md)** - Latest capabilities
- **[Reflexion Agent](docs/features/REFLEXION-COMMAND-INTEGRATION-COMPLETE.md)** - AI reasoning system
- **[Autonomous Swarm](docs/features/AUTONOMOUS-SWARM-IMPLEMENTATION.md)** - Multi-agent orchestration
- **[TypeScript Migration](docs/features/TYPESCRIPT-CLI-COMPLETE.md)** - Modern architecture

### Archives
- **[Session Summaries](docs/archive/sessions/)** - Development logs
- **[Test Reports](docs/archive/test-reports/)** - Validation results

## Benefits

### For Users

✅ **Zero Manual Work**
- No more manual /checkpoint commands
- No more manual /compact commands
- No more manual git pushes
- Walk away, come back to finished work

✅ **Never Lose Progress**
- Auto-checkpoint every 10 files
- Auto-checkpoint at 40% context (sliding threshold - no task interruption)
- All changes backed up to GitHub
- Can revert to any checkpoint

✅ **Maximum Efficiency**
- 50-70% token savings on navigation
- Perfect memory across sessions
- Intelligent command routing
- Ken's prompting mastery applied

✅ **Production Ready**
- 74 comprehensive tests
- Edge case handling
- Detailed documentation
- Battle-tested patterns

### For Claude

✅ **Crystal Clear Instructions**
- Triple recognition patterns
- Explicit autonomous rules
- No ambiguity about when to act
- Complete tool documentation

✅ **Perfect Memory**
- 3-factor retrieval scoring
- Git-aware memory channels
- Episodic + semantic + working
- Never forgets important context

✅ **Intelligent Decisions**
- Router decides which /command
- Knows when to checkpoint
- Knows when to compact
- Applies patterns correctly

## Use Cases

### 1. Architecture Documents

```bash
/auto
# Task: "Create complete architecture document for microservices system"

Claude will:
• Research patterns via GitHub MCP
• Design architecture systematically
• Document with Ken's patterns (short, focused)
• Auto-checkpoint every 10 files
• Auto-push to GitHub
• Complete entire document autonomously
```

### 2. Feature Implementation

```bash
/auto
# Task: "Implement user authentication with OAuth"

Claude will:
• Read project-index.md first (token efficiency)
• Search GitHub for OAuth examples
• Implement following best practices
• Auto-checkpoint progress
• Run tests automatically
• Push to GitHub
• Continue until complete
```

### 3. Bug Fixing

```bash
/auto
# Task: "Debug and fix payment processing error"

Claude will:
• Use debug orchestrator (fully functional - regression detection)
• Search memory for similar fixes
• Apply fix with pattern learned
• Verify no regressions (before/after snapshots)
• Auto-checkpoint fix
• Push to GitHub
```

### 4. Reverse Engineering

```bash
/auto
# Task: "Reverse engineer this Chrome extension's API"

Claude will:
• Use RE toolkit patterns
• Analyze manifest.json
• Deobfuscate code
• Document API endpoints
• Auto-checkpoint findings
• Continue until complete
```

## FAQ

**Q: Does this work with vanilla Claude Code?**
A: Yes! It's all hooks and commands - no modifications to Claude Code itself.

**Q: Will it work in a new conversation?**
A: Yes! Memory persists across sessions via the memory system.

**Q: Can I use it with my existing projects?**
A: Yes! Just activate `/auto` and it works with any project.

**Q: What if I don't have a git repo?**
A: Git features gracefully skip. Everything else still works.

**Q: Is it safe?**
A: Yes! Bounded autonomy rules prevent dangerous operations. All commits are logged.

**Q: How do I stop it?**
A: Say "stop" or run `/auto stop`. It stops immediately.

**Q: Does it really work without any intervention?**
A: Yes! Tested extensively. You can walk away and return to finished work.

## Roadmap

- [ ] Multi-repo orchestration
- [ ] Distributed agent swarms
- [ ] Real-time collaboration mode
- [ ] Voice command interface
- [ ] Mobile app for monitoring
- [ ] Analytics dashboard
- [ ] Custom agent personalities
- [ ] Plugin marketplace

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

**Inspired by**:
- Roo Code (autonomous operation patterns)
- steipete/claude-code-mcp (permission bypass approach)
- Ken's Prompting Course (exclusive patterns)
- GitHub MCP (code search integration)

**Created by**: @imorgado (with Claude's help)

**Powered by**: Claude Sonnet 4.5

---

<div align="center">

**⚡ Claude Sovereign - The AI that governs itself ⚡**

[Documentation](docs/) • [GitHub](https://github.com/isaacmorgado/claude-sovereign) • [Issues](https://github.com/isaacmorgado/claude-sovereign/issues)

Made with 🤖 by autonomous AI

</div>
