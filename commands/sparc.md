---
description: Execute SPARC methodology (Specification → Pseudocode → Architecture → Refinement → Completion)
argument-hint: "<task> [options]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Task", "TodoWrite"]
---

# SPARC Command

Execute the SPARC (Specification → Pseudocode → Architecture → Refinement → Completion) methodology for structured development.

## Usage

```bash
komplete sparc "your task" [options]
```

### Options

- `--requirements` - Array of requirements for the task
- `--constraints` - Array of constraints/limitations
- `--verbose` - Enable verbose output

### Examples

```bash
# Basic usage
komplete sparc "Implement user authentication"

# With requirements
komplete sparc "Build REST API" --requirements '["JWT auth", "rate limiting", "input validation"]'

# With constraints
komplete sparc "Create data pipeline" --constraints '["max 1000 rows", "process within 5s"]'

# Verbose mode
komplete sparc "Design database schema" --verbose
```

## SPARC Phases

The SPARC methodology guides development through five structured phases:

### 1. Specification

Define what needs to be built:
- Clear requirements
- Success criteria
- Edge cases to handle

### 2. Pseudocode

Plan the implementation approach:
- Algorithm design
- Data structures
- Control flow

### 3. Architecture

Design the system structure:
- Component organization
- Interfaces between parts
- Data flow

### 4. Refinement

Improve the design:
- Optimize algorithms
- Handle edge cases
- Add error handling

### 5. Completion

Finalize and deliver:
- Code implementation
- Testing
- Documentation

## What It Does

1. **Analyzes** the task and breaks it down into phases
2. **Executes** each phase sequentially with LLM assistance
3. **Tracks** progress through all five phases
4. **Records** results to memory for future reference
5. **Provides** structured output showing completion status

## Integration

The SPARC command integrates with:
- **Memory Manager** - Records task context and phase results
- **LLM Router** - Provides AI assistance for each phase
- **SPARC Workflow** - Core workflow engine in [`src/core/workflows/sparc`](src/core/workflows/sparc/index.ts)

## When to Use

Use `/sparc` when:
- Building complex features with clear requirements
- Need structured approach to development
- Want to ensure all phases are completed
- Task requires careful planning before implementation
- Learning new codebases or domains

## Best Practices

- **Define clear requirements** - Specify what success looks like
- **Set realistic constraints** - Time, resources, technology limitations
- **Review each phase output** - Ensure quality before moving forward
- **Use verbose mode** - See detailed progress through each phase
- **Save results** - Phase outputs are recorded to memory

## Output

```
🎯 Starting SPARC workflow
Task: Implement user authentication
Requirements: JWT auth, rate limiting, input validation
Constraints: max 1000 rows, process within 5s

✓ Phase 1: Specification complete
✓ Phase 2: Pseudocode complete
✓ Phase 3: Architecture complete
✓ Phase 4: Refinement complete
✓ Phase 5: Completion complete

SPARC workflow completed successfully
```

## Related Commands

- [`/auto`](auto.md) - Autonomous mode can use SPARC internally
- [`/reflect`](reflect.md) - ReAct+Reflexion loop for iterative improvement
- [`/research`](research.md) - Research code patterns and solutions

## Notes

- SPARC is particularly useful for:
  - New feature development
  - Complex refactoring tasks
  - Learning unfamiliar codebases
  - System architecture design
- Each phase builds on the previous phase's output
- The workflow is sequential - phases cannot be skipped
