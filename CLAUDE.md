# Komplete Kontrol CLI (Claude Sovereign + TypeScript Migration)

Autonomous AI operation system being migrated from bash hooks to TypeScript/Bun. Goal: Integrate Roo Code SPARC methodology, /auto autonomy features, and multi-provider support into a unified modern CLI.

## Current Focus
AutoCommand modularization complete. Sliding autocompaction and DebugOrchestrator integration active.

## Last Session (2026-01-14)
- Refactored AutoCommand.ts into 7 specialized modules (AutonomousExecutor, HookIntegration, SkillInvoker, TestingIntegration, etc.)
- Reduced AutoCommand from 895 to 373 lines (-58% code size)
- Integrated DebugOrchestrator for smart debugging and fix verification
- Implemented sliding autocompaction at 40% threshold with task-aware deferral
- Added comprehensive /auto skill integration (checkpoint, commit, compact, re)
- Stopped at: Commit 8b32b2c pushed to typescript-integration branch

## Next Steps
1. Run `./run-edge-case-tests.sh` to validate ReflexionAgent 30-50 iteration performance (after API quota reset)
2. Test AutoCommand modular architecture with live /auto sessions
3. Phase 2B: E2E orchestrator tests with actual ReflexionAgent execution
4. Phase 3: Validation and performance benchmarks

## Key Files

**AutoCommand Modules**:
- `src/cli/commands/AutoCommand.ts` - Main orchestrator (373 lines, refactored)
- `src/cli/commands/auto/AutonomousExecutor.ts` - Execution loop
- `src/cli/commands/auto/SkillInvoker.ts` - Skill command integration
- `src/cli/commands/auto/HookIntegration.ts` - Bash hook bridge
- `src/cli/commands/auto/TestingIntegration.ts` - Test execution
- `src/core/debug/orchestrator/index.ts` - Smart debug coordination

**Documentation**:
- `docs/integration/AUTO-COMMAND-REFACTORING-COMPLETE.md` - Refactoring summary
- `DOCUMENTATION-INDEX.md` - Master documentation index (90+ organized files)

## Key Context

**CLI Usage**:
- Invocation: `bun run src/index.ts reflexion execute --goal "..." --output-json`
- Model: Always use `--preferred-model glm-4.7` to avoid rate limits
- Fallback chain: Kimi-K2 → GLM-4.7 → Llama-70B → Dolphin-3

**Orchestrator Integration**:
- Feature flag: `export ENABLE_REFLEXION_AGENT=1` (default: 0)
- Decision logic: 4 rules route complex tasks to ReflexionAgent
- Automatic fallback: Rate limits or errors trigger bash agent-loop
- Logging: All decisions logged to `~/.claude/orchestrator.log`


## Milestones
- 2026-01-14: AutoCommand modularization complete (8b32b2c)