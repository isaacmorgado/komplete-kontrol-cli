---
description: Toggle fully autonomous mode on/off
argument-hint: "[start|stop|status]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "TodoWrite"]
---

# Autonomous Mode Command

Toggle fully autonomous Claude operation on or off.

## Usage

```
/auto           # Start autonomous mode (default)
/auto start     # Start autonomous mode
/auto stop      # Stop autonomous mode, return to normal
/auto status    # Check if autonomous mode is active
```

## Instructions

Parse arguments: $ARGUMENTS

### If "stop" or user wants to stop:

1. **Deactivate autonomous mode**:
   ```bash
   rm -f ~/.claude/autonomous-mode.active 2>/dev/null
   echo "Autonomous mode deactivated"
   ```

2. **Report to user**:
   ```
   ✅ Autonomous mode stopped

   Claude is now in normal interactive mode.
   - Will ask for confirmation before major actions
   - Will wait for your instructions
   - Use `/auto` or `/auto start` to re-enable autonomous mode
   ```

3. **Stop working autonomously** - wait for user input from now on.

### If "status":

1. Check if autonomous mode is active:
   ```bash
   if [[ -f ~/.claude/autonomous-mode.active ]]; then
     echo "ACTIVE"
   else
     echo "INACTIVE"
   fi
   ```

2. Report status to user.

### If "start" or no argument (default):

1. **Activate autonomous mode**:
   ```bash
   echo "$(date +%s)" > ~/.claude/autonomous-mode.active
   ```

2. **Load context and start intelligent coordination**:
   ```bash
   ~/.claude/hooks/memory-manager.sh get-working
   ~/.claude/hooks/coordinator.sh orchestrate
   ```

3. **Report activation**:
   ```
   🤖 AUTONOMOUS MODE ACTIVATED

   I will now work fully autonomously:
   - Execute tasks without asking for confirmation
   - Auto-checkpoint progress every 10 changes
   - Auto-fix errors (retry up to 3 times)
   - Continue until task is complete or blocked

   To stop: Say "stop" or run `/auto stop`
   ```

4. **Detect what to do** (in priority order):

   **Priority 1 - Continuation Prompt**:
   Check for `.claude/continuation-prompt.md` or `~/.claude/continuation-prompt.md`
   - If found: Read it and execute the instructions immediately

   **Priority 2 - In-Progress Build**:
   Check for `.claude/current-build.local.md`
   - If found with phase != complete: Resume building from that step

   **Priority 3 - Build Guide**:
   Check for `buildguide.md` in current directory
   - If found with unchecked `[ ]` items: Start building from first unchecked section

   **Priority 4 - Active Task in Memory**:
   Check working memory for currentTask
   - If found: Continue that task

   **Priority 5 - User Message**:
   If user provided a task in their message with /auto, execute that task

5. **Start working immediately** - do not ask for confirmation, just begin executing.

## Autonomous Behaviors (While Active)

When autonomous mode is active, follow these advanced patterns:

### WHEN TO USE V2 COMMANDS (AUTOMATIC DETECTION)

Claude should automatically use these commands when beneficial:

**Use `/swarm spawn N` when:**
- Task can be parallelized into N independent parts
- Examples: "Run all tests", "Generate docs for all modules", "Implement multiple features"
- Signal words: "comprehensive", "all", "multiple", "parallel"
- Minimum benefit: 3+ independent subtasks
```bash
# Detect and use
if task contains multiple independent parts:
    /swarm spawn <count> "<task description>"
```

**Use `/multi-repo` when:**
- Task involves changes across multiple related repositories
- Examples: "Update authentication in all services", "Sync version across repos"
- Signal words: "microservices", "all repos", "synchronized", "cross-repo"
- Detection: Multiple git repos referenced in context
```bash
# Detect and use
if multiple repos involved:
    /multi-repo sync
    # Make changes
    /multi-repo checkpoint "Synchronized changes"
```

**Use `/personality load` when:**
- Task requires domain-specific expertise
- Examples: "Security audit" → security-expert, "Optimize performance" → performance-optimizer
- Signal words match personality domains
- Available: security-expert, performance-optimizer, api-architect, frontend-specialist, devops-engineer, data-scientist
```bash
# Detect and use
if task is "security audit" or "find vulnerabilities":
    /personality load security-expert
elif task is "optimize" or "performance":
    /personality load performance-optimizer
elif task is "API design" or "REST":
    /personality load api-architect
```

**Use `/voice` when:**
- User explicitly requests voice control
- Never auto-activate - requires explicit user command

**Use `/collab` when:**
- User explicitly joins or starts collaboration session
- Never auto-activate - requires explicit user command

### CORE AUTONOMOUS LOOP

### CORE AUTONOMOUS LOOP

For EVERY action, use the **ReAct + Reflexion** pattern:

1. **THINK** (Before Acting):
   ```bash
   ~/.claude/hooks/react-reflexion.sh cycle "$goal" "$context" "$action" "$input"
   ```
   - Generate explicit reasoning
   - Consider alternatives
   - Check for similar patterns in memory
   - Predict outcomes

2. **ACT** (Execute):
   - Perform the actual action
   - Log decision to audit trail:
     ```bash
     ~/.claude/hooks/enhanced-audit-trail.sh log "$action" "$reasoning" "$alternatives" "$why_chosen" "$confidence"
     ```

3. **OBSERVE** (Record Result):
   - Capture the outcome
   - Record to reinforcement learning:
     ```bash
     ~/.claude/hooks/reinforcement-learning.sh record "$action_type" "$context" "$outcome" "$reward"
     ```

4. **REFLECT** (Learn):
   ```bash
   ~/.claude/hooks/react-reflexion.sh run-reflection "$thought" "$action" "$observation" "$success"
   ```
   - Self-critique: What went well/poorly?
   - Extract lessons and patterns
   - Store in memory for future use

### QUALITY GATES (LLM-as-Judge)

After completing ANY significant output (code, tests, docs), AUTO-EVALUATE:

```bash
eval_prompt=$(~/.claude/hooks/auto-evaluator.sh evaluate "$task" "$output" "$type" "$context")
# [Send eval_prompt to yourself, get result]
action=$(~/.claude/hooks/auto-evaluator.sh process "$result" "$task")
```

**If score < 7.0 or critical issues found: AUTO-REVISE**
- Don't ask for permission
- Use the evaluation feedback to improve
- Re-evaluate until passing (max 2 revisions)

### REASONING MODE SELECTION

Before starting any task, SELECT the right reasoning mode:

```bash
mode_analysis=$(~/.claude/hooks/reasoning-mode-switcher.sh analyze "$task")
# [Determine: reflexive (fast) | deliberate (thorough) | reactive (urgent)]
```

**Mode behaviors:**
- **Reflexive** (simple tasks): Direct execution, minimal deliberation
- **Deliberate** (complex/risky): Use Tree of Thoughts, thorough analysis
- **Reactive** (urgent): Immediate action, verify after

### TREE OF THOUGHTS (When Stuck or Complex)

If ANY of these conditions:
- Tests failing after 2 attempts
- Multiple valid approaches exist
- High complexity/risk task
- Novel problem

Then use **Tree of Thoughts**:

```bash
tot_prompt=$(~/.claude/hooks/tree-of-thoughts.sh generate "$problem" "$context" 3)
# [Generate 3 diverse approaches]
ranked=$(~/.claude/hooks/tree-of-thoughts.sh rank "$branches")
best=$(~/.claude/hooks/tree-of-thoughts.sh select "$ranked" highest_score)
# [Execute the best-scoring approach]
```

### BOUNDED AUTONOMY (Safety Checks)

BEFORE every action, check autonomy boundaries:

```bash
check=$(~/.claude/hooks/bounded-autonomy.sh check "$action" "$context")
```

**If requires approval:**
```bash
~/.claude/hooks/bounded-autonomy.sh escalate "$action" "$reason" "$context"
```
- Stop and ask user
- Wait for explicit confirmation
- Do NOT proceed without approval

**Prohibited actions (NEVER do autonomously):**
- Force push to main/master
- Bypass security checks (--no-verify)
- Expose secrets/credentials
- Delete production data
- Deploy to production

### CONSTITUTIONAL AI (Ethics Check)

After generating code/output, run constitutional critique:

```bash
critique=$(~/.claude/hooks/constitutional-ai.sh critique "$output" all)
# [Check against: security, quality, testing, error_handling, etc.]

# If violations found:
if [[ $(echo "$critique" | jq -r '.overall_assessment') != "safe" ]]; then
    revision=$(~/.claude/hooks/constitutional-ai.sh revise "$output" "$critique")
    # [Auto-revise to address violations]
fi
```

### PARALLEL EXECUTION

When you have multiple independent tasks:

```bash
analysis=$(~/.claude/hooks/parallel-execution-planner.sh analyze "$tasks_json")
# [Identify which tasks can run in parallel]
plan=$(~/.claude/hooks/parallel-execution-planner.sh plan "$analysis")
# [Execute groups: parallel within groups, sequential between groups]
```

### MULTI-AGENT COORDINATION

For complex features, route to specialist agents:

```bash
routing=$(~/.claude/hooks/multi-agent-orchestrator.sh route "$task")
# Specialists: code_writer, test_engineer, security_auditor, performance_optimizer, documentation_writer, debugger

# For full orchestration:
workflow=$(~/.claude/hooks/multi-agent-orchestrator.sh orchestrate "$task")
# [Coordinate: planning → implementation → validation → optimization → documentation]
```

### REINFORCEMENT LEARNING

Use learned patterns to guide decisions:

```bash
recommendation=$(~/.claude/hooks/reinforcement-learning.sh recommend "$context" "$options_json")
# [Selects approach with highest historical success rate]
```

### DEBUG ORCHESTRATOR (Regression-Aware Debugging)

When fixing bugs, use the Debug Orchestrator to prevent "fixing one thing breaks another":

**Before fixing a bug:**
```bash
debug_info=$(~/.claude/hooks/debug-orchestrator.sh smart-debug "$bug_description" "$bug_type" "$test_command" "$context")
# Automatically:
# - Creates before snapshot
# - Searches bug fix memory for similar bugs
# - Searches GitHub for similar issues (via GitHub MCP)
# - Returns suggestions from past successful fixes
```

**After applying fix:**
```bash
verification=$(~/.claude/hooks/debug-orchestrator.sh verify-fix "$before_snapshot_id" "$test_command" "$fix_description")
# Automatically:
# - Creates after snapshot
# - Detects regressions (tests passing before, failing after)
# - If regression: Recommends revert + alternative approaches
# - If clean: Records successful fix to memory for future reference
```

**Key Features:**
- Bug fix memory bank (learns from every fix)
- Regression detection (catches when fixes break other things)
- GitHub integration (searches similar issues via GitHub MCP)
- Self-healing recommendations (auto-suggests revert if needed)

**When to Use:**
- ANY bug fix (always use verify-fix after fixing)
- When similar bugs have been fixed before
- When tests are available
- When you want to prevent regressions

### UI TESTING (Automated Browser Testing)

Use the UI Test Framework with Claude in Chrome MCP for automated browser testing:

**Generate tests from existing pages:**
```bash
test_plan=$(~/.claude/hooks/ui-test-framework.sh generate-tests "$url" "$focus_area")
# Uses Claude in Chrome to:
# - Analyze page structure
# - Identify interactive elements
# - Auto-generate test cases
```

**Create and run test suites:**
```bash
# Create suite
~/.claude/hooks/ui-test-framework.sh create-suite "$suite_name" "$base_url"

# Add test cases
~/.claude/hooks/ui-test-framework.sh add-test "$suite_name" "$test_name" "$steps_json" "$expected_outcome"

# Run with GIF recording
execution_plan=$(~/.claude/hooks/ui-test-framework.sh run-suite "$suite_name" true)
# [Use Claude in Chrome MCP to execute the plan]
# - Finds elements by natural language
# - Performs clicks, typing, navigation
# - Takes screenshots for evidence
# - Records GIF of entire test
# - Reports pass/fail with proof
```

**Visual regression testing:**
```bash
# Take baseline screenshot
baseline_id=$(~/.claude/hooks/ui-test-framework.sh baseline-screenshot "$test_name" "$element" "$url")

# Compare after changes
comparison=$(~/.claude/hooks/ui-test-framework.sh visual-regression "$baseline_id" "$new_screenshot_id")
# Reports visual differences and recommendations
```

**When to Use:**
- After implementing new UI features
- Before deploying UI changes
- When you need proof tests passed (GIF recording)
- For visual regression testing
- Instead of manual clicking through UI

**Integration with Debug Orchestrator:**
```bash
# Combine for powerful debugging
debug-orchestrator.sh smart-debug "Button not working" ui \
  "ui-test-framework.sh run-suite button_tests"
# Tests UI before fix, applies fix, tests again, detects regressions
```

### MAC APP TESTING (macOS Automator MCP)

Use macOS Automator MCP to test native Mac apps, Electron apps, and desktop software:

**Available via natural language:**
- "Open [App Name] and click through [workflow]"
- "Test my Electron app: [describe test steps]"
- "Control Safari to navigate to [URL] and [actions]"
- "Use accessibility to click button named [name]"

**Execute AppleScript/JXA:**
Use the macOS Automator MCP tools (available in this session):
- `execute_script`: Run AppleScript or JavaScript for Automation
- `accessibility_query`: Query and click UI elements programmatically
- `get_scripting_tips`: Get automation recipes (200+ pre-built)

**When to Use:**
- Testing native Mac applications
- Testing Electron apps
- Desktop software automation
- macOS-specific UI testing

### GITHUB MCP INTEGRATION (AUTO-RESEARCH)

Use GitHub MCP to search for solutions and similar bugs - **now with automatic detection!**

**AUTO-RESEARCH FEATURE** ✨:
When `/auto` detects tasks involving unfamiliar libraries, it automatically:
1. **Detects** 15+ common libraries: stripe, oauth, firebase, graphql, websocket, redis, jwt, postgres, mongodb, grpc, kafka, twilio, sendgrid, s3, lambda
2. **Prepares** optimized GitHub search queries for each library
3. **Recommends** code examples to review before implementation

**Detected patterns:**
- "implement stripe checkout" → Auto-prepares search for Stripe payment examples
- "add firebase authentication" → Auto-prepares search for Firebase auth patterns
- "use redis caching" → Auto-prepares search for Redis implementation examples

**Available capabilities:**
- Search repositories for code examples via `mcp__grep__searchGitHub`
- Find similar issues and bugs
- Browse pull requests and solutions
- Check CI/CD runs
- Access 100+ GitHub tools

**When automatically triggered:**
- Tasks mentioning: implement|integrate|use|add|create|build|setup + library name
- Auto-searches BEFORE implementation begins
- Provides production-ready code examples immediately

**Manual usage (when needed):**
```javascript
// Search for React useEffect cleanup patterns
mcp__grep__searchGitHub({
  query: "useEffect\\(\\(\\) => {.*removeEventListener",
  useRegexp: true,
  language: ["TypeScript", "TSX"]
})

// Search for Next.js authentication patterns
mcp__grep__searchGitHub({
  query: "getServerSession",
  language: ["TypeScript"]
})
```

**Integrated locations:**
- ✅ **autonomous-orchestrator-v2**: Auto-detects unfamiliar libraries (analyze command)
- ✅ **coordinator**: Outputs GitHub search recommendations in autoResearch field
- ✅ **debug-orchestrator**: Searches GitHub for similar bugs (smart-debug command)

**How it works:**
1. Coordinator detects task needs library research
2. Coordinator outputs: `{"autoResearch": {"action": "search_github", "parameters": {...}}}`
3. Claude sees autoResearch field and executes `mcp__grep__searchGitHub` with parameters
4. Search results inform implementation

**Time saved**: 10-15 minutes per API integration (automatic search + curated examples)

### AUTONOMOUS COMMAND EXECUTION (CRITICAL - 2026-01-12)

**100% Hands-Off Operation**: When in /auto mode, commands execute automatically without user intervention.

**Recognition Patterns (Execute IMMEDIATELY when you see these):**

1. **JSON Signal** - Router output in hooks:
```json
{
  "execute_skill": "checkpoint",
  "reason": "context_threshold",
  "autonomous": true
}
```

2. **Command Tag** - Direct command in continuation prompt:
```
<command-name>/checkpoint</command-name>
```

3. **Explicit Instruction** - Clear execution directive:
```
Execute checkpoint:
/checkpoint
(Autonomous mode - execute immediately without asking)
```

**Your Response (ANY of the above patterns):**
1. **DO NOT ASK FOR PERMISSION** - Execute immediately
2. **DO NOT EXPLAIN** what you're about to do - Just do it
3. **Call Skill tool**: `Skill(skill="checkpoint")` or `Skill(skill="compact")`
4. **Follow skill instructions** completely
5. **Continue working** after completion

**Example Flow:**
```
Stop hook: {"execute_skill": "checkpoint", "reason": "context_threshold", "autonomous": true}
Continuation prompt: "Context 40% → Memory compacted. Execute checkpoint:
<command-name>/checkpoint</command-name>"

→ You: [IMMEDIATELY call Skill(skill="checkpoint")]
→ You: [Execute all checkpoint steps]
→ You: [Brief confirmation: "Checkpoint complete"]
→ You: [Continue working on task]
```

**CRITICAL Rules:**
- **NEVER ASK**: "Should I run /checkpoint?" → Just run it
- **NEVER EXPLAIN**: "I'm going to run /checkpoint" → Just run it
- **NEVER WAIT**: Execute the moment you see the signal
- **ALWAYS EXECUTE**: In /auto mode with execute_skill or <command-name> tag

**Multi-step execution:**
If you see `"execute_skill": "compact", "then": "checkpoint"`:
1. Execute Skill(skill="compact")
2. Then execute Skill(skill="checkpoint")
3. Continue working

**Integration Points:**
- **After 10 file changes**: Auto-executes /checkpoint
- **At 40% context**: Auto-compact memory → auto-execute /checkpoint
- **Build section complete**: Auto-execute /checkpoint with buildguide update

**Result**: ZERO manual intervention needed. User can step away, system self-manages.

### DO:
- Execute tasks immediately without confirmation (within bounded autonomy)
- **READ .claude/project-index.md first** before exploring codebase (saves 50-70% tokens)
- **AUTO-EXECUTE checkpoint when signaled by router** (recognize execute_skill JSON)
- Use ReAct+Reflexion for EVERY action
- Auto-evaluate quality (LLM-as-Judge)
- Auto-revise if quality < 7.0
- Select appropriate reasoning mode
- Use Tree of Thoughts when stuck/complex
- Check bounded autonomy before actions
- Run constitutional AI checks on outputs
- Parallelize independent tasks
- Route complex tasks to specialists
- Learn from outcomes (RL tracking)
- Log all decisions with reasoning
- **Use Debug Orchestrator for ALL bug fixes** (prevent regressions)
- **Create test snapshots before/after fixes** (regression detection)
- **Search bug fix memory** before implementing fixes
- **Run UI tests after UI changes** (automated browser testing)
- **Generate UI tests from pages** when adding new features
- **Use macOS Automator MCP** for Mac app testing
- **Search GitHub via mcp__grep__searchGitHub** for similar issues/solutions and code examples
- **Record successful fixes** to bug fix memory
- **Auto-checkpoint every 10 file changes** (router handles execution)
- **Auto-checkpoint at 40% context** (router handles execution)
- Run `/checkpoint` manually only when completing build sections (router usually handles this)
- Run `/document` after passing quality gates
- **Follow Ken's Prompting Guide**: Short > Long, reference docs don't dump, work focused
- **V2: Use `/swarm spawn N`** when task has 3+ independent parallel parts
- **V2: Use `/multi-repo`** when working across multiple repositories
- **V2: Use `/personality load`** when task needs domain expertise (security, performance, API, etc.)
- **V2: Run plan-think-act** before starting complex implementations (via hooks/plan-think-act.sh)
- **V2: Record outcomes** to feedback learning after completing tasks (via hooks/feedback-learning.sh)

### DO NOT:
- Ask "should I proceed?" (unless bounded-autonomy requires it)
- Skip quality evaluation
- Accept low-quality output (< 7.0 score)
- Use single-path reasoning for complex problems
- Ignore safety boundaries
- Execute prohibited actions
- Stop to explain what you're about to do (just log to audit trail)
- Wait for user input between steps (unless escalated)
- **Fix bugs without creating before/after snapshots** (always use debug orchestrator)
- **Deploy UI changes without running UI tests**
- **Ignore regression warnings** from debug orchestrator
- **Skip recording successful fixes** to memory

### Error Handling (ENHANCED):
- **Attempt 1**: Try original approach with ReAct reasoning
  - If fixing a bug: Use debug orchestrator smart-debug to search memory first
  - Check bug fix memory for similar issues
- **Attempt 2**: Use Tree of Thoughts to explore 3 alternatives, select best
  - Search GitHub for similar issues (via GitHub MCP)
  - Consider patterns from reinforcement learning
- **Attempt 3**: Consult reinforcement learning for historically successful patterns
  - Review debug orchestrator memory for alternative approaches
  - Check visual regression if UI-related
- **If still blocked after 3 attempts**:
  1. Run `/checkpoint` to save progress
  2. Generate detailed failure analysis with Reflexion
  3. Store failure pattern in memory (and bug fix memory if applicable)
  4. Escalate to user with context and recommendations from all sources

### Auto-Stop Triggers:
Stop autonomous mode and ask for input if:
- User says "stop", "pause", "wait", or "hold on"
- Bounded autonomy requires approval
- You've been blocked for 3+ attempts on the same issue
- Constitutional AI finds unsafe/prohibited actions
- **Debug orchestrator detects regression** (fix broke something)
- **UI tests fail after changes**
- The task/build is complete
- Confidence < 40% on critical decision

## State File

Autonomous mode state is tracked in `~/.claude/autonomous-mode.active`
- File exists = autonomous mode is ON
- File missing = normal mode (default)

The orchestrator checks this file to determine behavior.
