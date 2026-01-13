---
description: Initialize komplete in current project
argument-hint: ""
allowed-tools: []
---

# Init Command

Initialize komplete in the current project directory.

## Usage

```bash
komplete init
```

## What It Does

Creates a `.komplete/` directory with configuration files to set up komplete for the current project.

## Output

```
✅ Komplete initialized
Created .komplete/ directory with configuration
```

## Configuration Files Created

The init command creates the following structure:

```
.komplete/
├── config.json          # Project configuration
└── checkpoints/         # Checkpoint storage
```

## When to Use

Use `/init` when:
- Starting a new project
- Setting up komplete for an existing project
- Need to initialize configuration files

## Related Commands

After initialization, you can use:
- [`/checkpoint`](checkpoint.md) - Save progress checkpoints
- [`/auto`](auto.md) - Run autonomous mode
- [`/build`](build.md) - Execute build steps

## Notes

- This command is idempotent - running it multiple times will not cause issues
- Configuration files are created only if they don't exist
- The `.komplete/` directory is excluded from git by default
