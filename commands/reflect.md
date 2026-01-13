---
description: Run ReAct + Reflexion loop (Think → Act → Observe → Reflect)
argument-hint: "<goal> [options]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "TodoWrite"]
---

# Reflect Command

Run the ReAct + Reflexion loop for iterative goal achievement and learning.

## Usage

```bash
komplete reflect "your goal" [options]
```

### Options

- `--iterations` - Number of reflexion cycles to run (default: 3)
- `--verbose` - Enable verbose output for each cycle

### Examples

```bash
# Basic usage
komplete reflect "Fix authentication bug"

# With custom iterations
komplete reflect "Optimize database queries" --iterations 5

# Verbose mode
komplete reflect "Refactor user service" --verbose
```

## ReAct + Reflexion Loop

The reflect command implements a powerful iterative learning pattern:

### 1. Think

Generate reasoning about the current state:
- What has been done so far?
- What remains to be done?
- What's the best next action?

### 2. Act

Execute the proposed action:
- Make code changes
- Run commands
- Modify files

### 3. Observe

Capture the result:
- Did the action succeed?
- What was the output?
- Any errors encountered?

### 4. Reflect

Learn from the outcome:
- What went well?
- What could be improved?
- What should be done differently next time?

## What It Does

1. **Runs multiple cycles** - Each cycle follows Think → Act → Observe → Reflect
2. **Uses LLM assistance** - Generates intelligent reasoning for each step
3. **Tracks progress** - Records successes and failures to memory
4. **Adapts strategy** - Reflections inform future cycles
5. **Provides summary** - Shows overall success/failure rates

## Integration

The reflect command integrates with:
- **Memory Manager** - Records context and episodes for learning
- **Reflexion Agent** - Core ReAct+Reflexion engine in [`src/core/agents/reflexion`](src/core/agents/reflexion/index.ts)
- **LLM Router** - Provides AI assistance for reasoning

## When to Use

Use `/reflect` when:
- Debugging complex issues
- Learning from past mistakes
- Iterating on a solution
- Need to understand what approach works best
- Goal requires multiple attempts with reflection
- Testing different strategies

## Best Practices

- **Start with clear goals** - Specific, measurable objectives work best
- **Use sufficient iterations** - 3-5 cycles provide good learning
- **Enable verbose mode** - See detailed progress through each cycle
- **Review reflections** - Key insights appear in cycle reflections
- **Track patterns** - Memory records successful strategies for reuse

## Output

```
🔄 Starting Reflexion loop
Goal: Fix authentication bug
Iterations: 3

✓ Cycle 1:
  Thought: Need to check JWT validation logic
  Action: Added validation middleware
  Result: Validation working, tests passing
  Reflection: Middleware approach is correct, should add unit tests

✓ Cycle 2:
  Thought: Add rate limiting to prevent brute force
  Action: Implemented token bucket rate limiter
  Result: Rate limiting working, tests passing
  Reflection: Token bucket approach is efficient, good for production

✓ Cycle 3:
  Thought: Add input sanitization
  Action: Created sanitizer utility
  Result: Sanitizer working, tests passing
  Reflection: Sanitizer prevents injection attacks, good security practice

Reflexion loop completed successfully

Summary:
  Total cycles: 3
  ✓ Successful: 3
  ✗ Failed: 0

Key Insights:
  1. JWT validation should be early in request pipeline
  2. Token bucket rate limiting is production-ready
  3. Input sanitization prevents injection attacks
```

## Related Commands

- [`/auto`](auto.md) - Autonomous mode uses Reflexion internally
- [`/rootcause`](rootcause.md) - For systematic debugging with reflection
- [`/research`](research.md) - Research before implementing solutions

## Notes

- Reflect is particularly useful for:
  - Complex debugging requiring multiple approaches
  - Learning new patterns or techniques
  - Iterative problem-solving
  - Building intuition about what works and what doesn't
  - Each cycle builds on previous reflections
- The reflection component is key - it's what makes the loop "learn" rather than just "repeat"
