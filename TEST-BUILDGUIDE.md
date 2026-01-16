# Test Build Guide for Autonomous Loop

This is a demonstration buildguide.md to test the autonomous build loop.

## Build Sections

### Phase 1: Foundation

- [ ] Create project structure
  - Create src/, tests/, docs/ directories
  - Initialize package.json
  - Setup TypeScript configuration

- [ ] Implement core utilities
  - Create logger utility
  - Create configuration loader
  - Add error handling utilities

### Phase 2: Core Features

- [ ] Implement main functionality
  - Create main application class
  - Add input/output handlers
  - Implement business logic

- [ ] Add testing
  - Write unit tests for utilities
  - Write integration tests
  - Add test scripts

### Phase 3: Polish

- [ ] Documentation
  - Write README.md
  - Add API documentation
  - Create usage examples

- [ ] Final validation
  - Run all tests
  - Check code quality
  - Verify deployment readiness

## Implementation Notes

This build guide will be processed autonomously by the /auto command:

1. **/auto start** - Activates autonomous mode
2. **Works on sections** - Processes each unchecked section
3. **Context hits 40%** - auto-continue.sh triggers
4. **Auto-executes /checkpoint** - Saves progress, updates buildguide
5. **Auto-clears context** - Saves tokens
6. **Auto-continues** - Resumes with continuation prompt
7. **Repeats** - Until all sections are checked

**Expected behavior:**
- Zero manual intervention
- Automatic checkpoints at context threshold
- Automatic memory compaction
- Automatic continuation prompt generation
- Automatic context clearing
- Loop until buildguide complete
