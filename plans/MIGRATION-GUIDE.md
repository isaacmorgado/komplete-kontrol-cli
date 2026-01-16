# KOMPLETE-KONTROL-CLI - Migration Guide

**Version:** 1.0 → 2.0
**Date:** 2025-01-16

---

## Overview

This guide helps you migrate from the current KOMPLETE-KONTROL-CLI (v1.0) to the new architecture (v2.0) based on Bubbletea TUI, multi-provider model management, and MCP-based tool integration.

**Migration Goals:**
- Preserve existing functionality
- Enable new features (real-time streaming, flexible models, verification)
- Maintain backward compatibility where possible
- Provide clear upgrade path

---

## Pre-Migration Checklist

Before starting migration, ensure:

- [ ] Backup current configuration (`~/.komplete/config.json`)
- [ ] Document current command workflows
- [ ] Identify custom integrations or hooks
- [ ] Note any environment variables in use
- [ ] Run existing tests to establish baseline

---

## Breaking Changes

### 1. Command Line Interface

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **New TUI framework** | Commands now use Bubbletea instead of ora + console output | Update command execution to use TUI messages |
| **Reactive state** | State changes via messages, not direct mutation | Refactor state management to pure functions |
| **Keyboard handling** | Different key bindings for navigation | Update muscle memory for new shortcuts |

### 2. Configuration Format

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **New schema** | Configuration has additional fields (models, tools, ui, verification) | Run migration script to update config |
| **Multi-provider** | Model configuration now supports multiple providers | Add provider-specific settings |
| **MCP servers** | New section for MCP server configuration | Add MCP server entries |

### 3. LLM Provider Interface

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **Provider abstraction** | All providers implement `ILLMProvider` interface | Update provider implementations |
| **Streaming changes** | Streaming now uses `StreamHandler` callback | Refactor streaming code |
| **Model selection** | Dynamic model routing instead of static selection | Update model selection logic |

### 4. Tool Integration

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **MCP protocol** | Tools discovered via MCP instead of manual registration | Register tools with MCP Manager |
| **Tool execution** | New tool execution flow with validation | Update tool calling code |

### 5. API Changes

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **BaseCommand** | BaseCommand now works with TUI | Extend BaseCommand for Bubbletea |
| **Command context** | New CommandContext type with TUI support | Update command implementations |
| **Return types** | New CommandResult with streaming support | Update return values |

---

## Step-by-Step Migration Process

### Phase 1: Preparation

```bash
# 1. Create migration branch
git checkout -b migrate-to-v2

# 2. Backup configuration
cp ~/.komplete/config.json ~/.komplete/config.json.backup

# 3. Install new dependencies
bun add bubbletea @types/bubbletea
```

### Phase 2: Configuration Migration

Run the automated migration script:

```bash
# Execute migration
komplete migrate-config

# Or manually update config
# See Configuration Migration section below
```

### Phase 3: Code Structure Migration

```bash
# Create new directory structure
mkdir -p src/tui
mkdir -p src/tui/components
mkdir -p src/shared/core

# Move existing modules
# Most core modules stay in place
# New TUI components go to src/tui/
# Shared core goes to src/shared/core/
```

### Phase 4: Component Migration

Migrate existing UI patterns to Bubbletea components:

```typescript
// Before (ora spinner)
const spinner = ora('Loading...').start();
spinner.succeed('Complete!');

// After (Bubbletea Spinner)
const spinner = new Spinner({ message: 'Loading...' });
spinner.start();
// ... work
spinner.stop();
```

```typescript
// Before (chalk + console.log)
console.log(chalk.green('Success!'));

// After (TUI message)
return { type: 'add_output', text: chalk.green('Success!') };
```

### Phase 5: Provider Migration

Update provider implementations to use new interface:

```typescript
// Before (direct Anthropic SDK)
const response = await anthropic.messages.create({...});

// After (via Provider interface)
const provider = new AnthropicProvider();
const response = await provider.complete({
  model: 'claude-sonnet-4.5',
  messages: [...],
});
```

### Phase 6: Command Migration

Update commands to work with TUI:

```typescript
// Before (extends BaseCommand with ora/chalk)
export class AutoCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    const spinner = ora('Running...').start();
    // ... work
    return this.success('Done!');
  }
}

// After (uses TUI messages)
export class AutoCommand extends BaseCommand {
  async execute(context: CommandContext, args: string[]): Promise<CommandResult> {
    return {
      type: 'start_command',
      command: 'auto',
    };
  }
}
```

### Phase 7: Testing

```bash
# Run migration tests
bun test:migration

# Test core functionality
komplete auto "test prompt"
komplete build
komplete checkpoint list

# Verify new features
komplete config show
komplete tools list
```

### Phase 8: Cleanup

```bash
# Remove old dependencies
bun remove ora chalk

# Update documentation
# Update README, guides

# Commit changes
git add .
git commit -m "Migrate to v2.0 architecture"
git push origin migrate-to-v2
```

---

## Configuration Migration

### Old Configuration Format (v1.0)

```json
{
  "anthropic": {
    "apiKey": "sk-ant-...",
    "model": "claude-sonnet-4.5-20250929"
  },
  "mcp": {
    "enabled": true,
    "servers": []
  }
}
```

### New Configuration Format (v2.0)

```json
{
  "version": "2.0",
  "models": {
    "default": "claude-sonnet-4.5",
    "providers": {
      "anthropic": {
        "apiKey": "sk-ant-...",
        "baseUrl": "https://api.anthropic.com"
      },
      "openai": {
        "apiKey": "sk-openai-...",
        "baseUrl": "https://api.openai.com/v1"
      },
      "gemini": {
        "apiKey": "AIza...",
        "baseUrl": "https://generativelanguage.googleapis.com"
      },
      "vscode": {
        "enabled": true
      },
      "local": {
        "enabled": false,
        "baseUrl": "http://localhost:11434"
      }
    },
    "fallbackChain": [
      "claude-sonnet-4.5",
      "claude-haiku-4",
      "gpt-4o-mini"
    ]
  },
  "tools": {
    "tavily": {
      "enabled": false,
      "apiKey": "",
      "maxResults": 10,
      "searchDepth": "basic"
    },
    "base44": {
      "enabled": false,
      "apiKey": "",
      "workspaceId": ""
    },
    "mcpServers": [
      {
        "id": "custom-server",
        "name": "Custom MCP Server",
        "url": "mcp://localhost:3000"
      }
    ]
  },
  "ui": {
    "theme": "dark",
    "streaming": true,
    "showCost": true,
    "showTokens": true
  },
  "verification": {
    "autoVerify": true,
    "autoRepair": true,
    "maxRetries": 3
  }
}
```

### Migration Script

```typescript
// src/scripts/migrateConfig.ts
import fs from 'fs';
import path from 'path';

interface OldConfig {
  anthropic: { apiKey: string; model: string };
  mcp: { enabled: boolean; servers: any[] };
}

interface NewConfig {
  version: string;
  models: {
    default: string;
    providers: {
      anthropic: { apiKey: string; baseUrl?: string };
      openai?: { apiKey?: string };
      gemini?: { apiKey?: string };
      vscode: { enabled: boolean };
      local: { enabled: boolean; baseUrl?: string };
    };
    fallbackChain: string[];
  };
  tools: {
    tavily: { enabled: boolean; apiKey: string; maxResults: number };
    base44: { enabled: boolean; apiKey: string; workspaceId: string };
    mcpServers: Array<{ id: string; name: string; url: string }>;
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    streaming: boolean;
    showCost: boolean;
    showTokens: boolean;
  };
  verification: {
    autoVerify: boolean;
    autoRepair: boolean;
    maxRetries: number;
  };
}

export function migrateConfig(oldConfigPath: string, newConfigPath: string): void {
  // Read old config
  const oldConfig: OldConfig = JSON.parse(
    fs.readFileSync(oldConfigPath, 'utf-8')
  );

  // Create new config structure
  const newConfig: NewConfig = {
    version: '2.0',
    models: {
      default: oldConfig.anthropic?.model || 'claude-sonnet-4.5',
      providers: {
        anthropic: {
          apiKey: oldConfig.anthropic?.apiKey || '',
          baseUrl: 'https://api.anthropic.com',
        },
        openai: { apiKey: '' },
        gemini: { apiKey: '' },
        vscode: { enabled: false },
        local: { enabled: false },
      },
      fallbackChain: ['claude-sonnet-4.5'],
    },
    tools: {
      tavily: { enabled: false, apiKey: '', maxResults: 10 },
      base44: { enabled: false, apiKey: '', workspaceId: '' },
      mcpServers: oldConfig.mcp?.servers || [],
    },
    ui: {
      theme: 'auto',
      streaming: true,
      showCost: true,
      showTokens: true,
    },
    verification: {
      autoVerify: true,
      autoRepair: true,
      maxRetries: 3,
    },
  };

  // Write new config
  fs.writeFileSync(newConfigPath, JSON.stringify(newConfig, null, 2));
  console.log('Configuration migrated successfully!');
}
```

---

## Deprecations

### Deprecated APIs

| API | Deprecated In | Replacement | Removal Version |
|------|---------------|------------|----------------|
| `ora` | v2.0 | Bubbletea Spinner | v2.0 |
| `chalk` | v2.0 | Theme system | v2.0 |
| Direct console output | v2.0 | TUI messages | v2.0 |
| Static model selection | v2.0 | ModelManager routing | v2.0 |
| Manual tool registration | v2.0 | MCP Manager | v2.0 |

### Deprecated Commands

| Command | Status | Replacement |
|---------|--------|------------|
| `komplete config set model <name>` | Deprecated | `komplete config models default <name>` |
| `komplete tools add <name>` | Deprecated | `komplete config tools mcpServers add` |
| `komplete mcp connect <url>` | Deprecated | `komplete config tools mcpServers add` |

---

## Backward Compatibility

### Preserved Functionality

The following features are preserved in v2.0:

- [x] All existing commands (`auto`, `build`, `checkpoint`, etc.)
- [x] Agent orchestration (Swarm, Reflexion)
- [x] Context management
- [x] Safety features (bounded autonomy, constitutional)
- [x] Debug orchestrator
- [x] Vision capabilities
- [x] Quality judge
- [x] Hook system

### Enhanced Functionality

New features in v2.0:

- [ ] Real-time streaming with progress tracking
- [ ] Multi-provider model management
- [ ] MCP-based tool discovery
- [ ] Automatic verification and repair
- [ ] Rich TUI with keyboard navigation
- [ ] Cost tracking and display

---

## Testing Checklist

### Unit Tests

- [ ] Test configuration migration script
- [ ] Test provider interface implementations
- [ ] Test TUI component rendering
- [ ] Test message passing between components
- [ ] Test tool discovery and execution

### Integration Tests

- [ ] Test command execution with TUI
- [ ] Test model fallback chains
- [ ] Test MCP server connection
- [ ] Test streaming with real providers
- [ ] Test verification and repair flow

### Manual Tests

- [ ] Run `komplete auto` with test prompt
- [ ] Run `komplete build` and verify output
- [ ] Run `komplete checkpoint list` and verify display
- [ ] Test configuration commands (`config show`, `config set`)
- [ ] Test tool integration (`komplete tools list`)
- [ ] Verify keyboard navigation works
- [ ] Test theme switching

### Edge Cases

- [ ] Test with no configuration file
- [ ] Test with invalid configuration
- [ ] Test with missing API keys
- [ ] Test with network errors
- [ ] Test with terminal resize
- [ ] Test with interrupted streams

---

## Rollback Procedure

If migration fails or issues arise:

```bash
# 1. Stop new CLI
# Ctrl+C or close terminal

# 2. Restore old configuration
cp ~/.komplete/config.json.backup ~/.komplete/config.json

# 3. Checkout previous version
git checkout main
git branch -D migrate-to-v2

# 4. Report issue
# Document the problem and report to maintainers
```

---

## Troubleshooting

### Common Issues

#### Issue: Configuration not loading

**Symptom:** CLI starts but shows default values

**Solution:**
```bash
# Check config file location
ls -la ~/.komplete/

# Validate JSON syntax
cat ~/.komplete/config.json | jq .

# Re-run migration
komplete migrate-config --force
```

#### Issue: TUI not rendering

**Symptom:** Blank or corrupted display

**Solution:**
```bash
# Check terminal capabilities
echo $TERM

# Try simpler theme
komplete config set ui.theme dark

# Disable streaming temporarily
komplete config set ui.streaming false
```

#### Issue: Models not available

**Symptom:** Model list empty or selection fails

**Solution:**
```bash
# Check API keys
komplete config show

# Test provider connection
komplete test provider anthropic

# Check fallback chain
komplete config show models.fallbackChain
```

#### Issue: Tools not connecting

**Symptom:** MCP servers show as disconnected

**Solution:**
```bash
# Test MCP server
komplete test mcp <server-id>

# Check server URL
komplete config show tools.mcpServers

# Verify MCP server is running
# Check server logs
```

---

## Post-Migration Steps

### 1. Verify New Features

```bash
# Test streaming
komplete auto "test" --stream

# Test model selection
komplete config models default gpt-4o-mini

# Test tools
komplete tools list

# Test verification
komplete auto "test" --verify
```

### 2. Update Documentation

- [ ] Update README with new features
- [ ] Update command documentation
- [ ] Add migration guide to docs
- [ ] Update examples and tutorials

### 3. Train Users

- [ ] Share migration guide with team
- [ ] Conduct training session on new TUI
- [ ] Document common workflows
- [ ] Create quick reference card

### 4. Monitor Performance

- [ ] Track error rates
- [ ] Monitor token usage
- [ ] Check for regressions
- [ ] Gather user feedback

---

## Support Resources

### Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Component Library](COMPONENT-LIBRARY.md)
- [Implementation Phases](IMPLEMENTATION-PHASES.md)
- [Original Research](ARCHITECTURE-ANALYSIS.md)
- [Recommendations](RECOMMENDATIONS.md)

### Getting Help

```bash
# Show migration help
komplete migrate --help

# Show config help
komplete config --help

# Show available commands
komplete --help
```

### Community

- GitHub Issues: Report bugs and feature requests
- Discord/Slack: Ask questions and share experiences
- Documentation: Contribute improvements

---

## Summary

This migration guide provides:

1. **Clear breaking changes** - What's changing and why
2. **Step-by-step process** - From preparation to cleanup
3. **Configuration migration** - Old to new format
4. **Deprecations** - What's being removed and when
5. **Backward compatibility** - What's preserved and what's new
6. **Testing checklist** - Verify migration success
7. **Rollback procedure** - Recover from issues
8. **Troubleshooting** - Common problems and solutions
9. **Post-migration steps** - Verify and optimize

Follow this guide carefully to ensure a smooth transition to the new architecture.
