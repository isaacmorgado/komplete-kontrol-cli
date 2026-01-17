# KOMPLETE-KONTROL-CLI - Migration Guide (v1.0 → v2.0 Go)

**Version:** 2.0
**Date:** 2026-01-16

---

## Overview

This guide helps you migrate from the TypeScript-based KOMPLETE-KONTROL-CLI (v1.0) to the Go-based version (v2.0) using Bubbletea TUI framework.

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

### 1. Language Change

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **TypeScript → Go** | Complete rewrite of source code | Rewrite all TypeScript files to Go |
| **Build System** | esbuild → Go build | Update build scripts and Makefile |
| **Package Manager** | npm → Go modules | Update go.mod dependencies |
| **TUI Framework** | Ink → Bubbletea | Replace Ink components with Bubbletea |

### 2. Configuration Format

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **JSON → YAML** | Configuration now uses YAML | Run migration script or manually update config |
| **New Configuration Fields** | Additional settings for tools, verification | Update config file with new fields |

**Old Configuration Format (v1.0):**
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

**New Configuration Format (v2.0):**
```yaml
version: "2.0"
models:
  default: "claude-sonnet-4.5"
  fallback_chain:
    - "claude-sonnet-4.5"
    - "claude-3.5-haiku"
    - "gpt-4o-mini"
  providers:
    anthropic:
      api_key: "sk-ant-..."
      base_url: "https://api.anthropic.com"
    openai:
      api_key: "sk-openai-..."
      base_url: "https://api.openai.com/v1"
    vscode:
      enabled: false
    local:
      enabled: false
      base_url: "http://localhost:11434"
tools:
  tavily:
    enabled: false
    api_key: ""
    max_results: 10
    search_depth: "basic"
  base44:
    enabled: false
    api_key: ""
    workspace_id: ""
  mcp_servers:
    - id: "custom-server"
      name: "Custom MCP Server"
      url: "mcp://localhost:3000"
ui:
  theme: "dark"
  streaming: true
  show_cost: true
  show_tokens: true
verification:
  auto_verify: true
  auto_repair: true
  max_retries: 3
alignment:
  enabled: false
  port: 0
```

### 3. API Changes

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **LLM Provider Interface** | New unified interface | Update provider implementations |
| **Streaming Handler** | New streaming API | Update streaming code |
| **Tool Manager** | MCP-based tools | Update tool integration code |

### 4. Command Line Interface

| Change | Impact | Migration Action |
|---------|---------|-----------------|
| **TUI Mode** | New `--tui` flag | Use `komplete --tui` for TUI mode |
| **No-TUI Mode** | `--no-tui` flag | Use `komplete --no-tui` for CLI mode |
| **New Flags** | Additional flags for Go features | Update command usage |

---

## Step-by-Step Migration Process

### Phase 1: Preparation

```bash
# 1. Create migration branch
git checkout -b migrate-to-v2-go

# 2. Backup configuration
cp ~/.komplete/config.json ~/.komplete/config.json.backup

# 3. Install Go dependencies
go mod download
go mod tidy
```

### Phase 2: Configuration Migration

```bash
# Run migration script (if available)
komplete migrate-config

# Or manually update configuration
# Edit ~/.komplete/config.yaml
```

**Migration Script:**
```go
// internal/migration/migrator.go
package migration

import (
	"encoding/json"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// OldConfig represents v1.0 configuration
type OldConfig struct {
	Anthropic struct {
		APIKey string `json:"apiKey"`
		Model  string `json:"model"`
	}
	MCP struct {
		Enabled bool   `json:"enabled"`
		Servers []any `json:"servers"`
	}
}

// NewConfig represents v2.0 configuration
type NewConfig struct {
	Version   string `yaml:"version"`
	Models    ModelsConfig `yaml:"models"`
	Tools     ToolsConfig `yaml:"tools"`
	UI        UIConfig `yaml:"ui"`
	Verification VerificationConfig `yaml:"verification"`
	Alignment  AlignmentConfig `yaml:"alignment"`
}

// Migrate converts old config to new format
func Migrate(oldConfigPath, newConfigPath string) error {
	// Read old config
	oldData, err := os.ReadFile(oldConfigPath)
	if err != nil {
		return fmt.Errorf("failed to read old config: %w", err)
	}

	var oldConfig OldConfig
	if err := json.Unmarshal(oldData, &oldConfig); err != nil {
		return fmt.Errorf("failed to parse old config: %w", err)
	}

	// Create new config
	newConfig := NewConfig{
		Version: "2.0",
		Models: ModelsConfig{
			Default:      oldConfig.Anthropic.Model,
			FallbackChain: []string{"claude-sonnet-4.5", "claude-3.5-haiku", "gpt-4o-mini"},
			Providers: ProvidersConfig{
				Anthropic: AnthropicProviderConfig{
					APIKey:  oldConfig.Anthropic.APIKey,
				},
			},
		},
		Tools: ToolsConfig{
			Tavily: TavilyConfig{
				Enabled:     false,
				MaxResults:  10,
				SearchDepth: "basic",
			},
			MCPServers: oldConfig.MCP.Servers,
		},
		UI: UIConfig{
			Theme:      "dark",
			Streaming:  true,
			ShowCost:   true,
			ShowTokens: true,
		},
		Verification: VerificationConfig{
			AutoVerify:  true,
			AutoRepair:  true,
			MaxRetries:  3,
		},
		Alignment: AlignmentConfig{
			Enabled: false,
		},
	}

	// Write new config
	newData, err := yaml.Marshal(newConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal new config: %w", err)
	}

	if err := os.WriteFile(newConfigPath, newData, 0644); err != nil {
		return fmt.Errorf("failed to write new config: %w", err)
	}

	fmt.Println("Configuration migrated successfully!")
	return nil
}
```

### Phase 3: Code Migration

**Key Changes:**

1. **TUI Components** - Replace Ink components with Bubbletea:
   - `StatusBar` → Status bar with model info and cost tracking
   - `OutputPanel` → Message display with syntax highlighting
   - `TextInput` → User input with validation

2. **Model Manager** - Update to use new interface:
   - `ModelManager` with multi-provider support
   - `Provider` interface for Anthropic, OpenAI, etc.

3. **Streaming Handler** - New streaming implementation:
   - `StreamHandler` with token-by-token updates
   - `TUIStreamHandler` for Bubbletea integration

4. **Tool Manager** - MCP-based tool discovery:
   - `ToolManager` with MCP server connections
   - `MCPTransport` for WebSocket communication

5. **Verification Manager** - Automatic testing:
   - `VerificationManager` with step-based verification
   - Common steps: syntax, build, test

**Code Examples:**

```go
// Old (TypeScript)
import { StatusBar } from './components/StatusBar';
const statusBar = new StatusBar();

// New (Go)
import "github.com/komplete-kontrol/cli/internal/tui/components"
statusBar := components.NewStatusBarModel()
statusBar.SetModel("Claude Sonnet 4.5", "Anthropic")
```

---

### Phase 4: Testing

```bash
# Run Go tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific tests
go test -run TestModelManager ./...
go test -run TestToolManager ./...
```

### Phase 5: Cleanup

```bash
# Remove old TypeScript dependencies
rm -rf node_modules package-lock.json

# Keep TypeScript code for reference (optional)
mkdir -p .ts-backup
mv src/ .ts-backup/

# Clean Go build artifacts
make clean
```

---

## Post-Migration Steps

### 1. Verify Installation

```bash
# Check if Go binary is installed
which komplete

# Test basic functionality
komplete --help
komplete models list
```

### 2. Update VS Code Extension

The CLI now uses a shared communication protocol for VS Code integration.

**Protocol Version:** 2.0

**Message Types:**
- `request` - Command from VS Code
- `response` - Response to VS Code
- `event` - Event notification (stream, error, etc.)
- `stream` - Streaming token or completion

**Configuration:**
Ensure VS Code extension is configured to use protocol v2.0:
```json
{
  "protocolVersion": "2.0",
  "alignmentPort": 0
}
```

### 3. Test Core Features

```bash
# Test model switching
komplete --model claude-sonnet-4.5

# Test streaming
komplete --tui "test prompt"

# Test tools
komplete tools list

# Test verification
komplete --verify
```

---

## Deprecations

### Deprecated APIs

| API | Deprecated In | Replacement | Removal Version |
|------|---------------|------------|-----------------|
| `ora` | v2.0 | Bubbletea Spinner | v2.0 |
| `chalk` | v2.0 | Theme system | v2.0 |
| `ink` components | v2.0 | Bubbletea components | v2.0 |
| Direct console output | v2.0 | TUI messages | v2.0 |
| Static model selection | v2.0 | ModelManager routing | v2.0 |
| Manual tool registration | v2.0 | MCP-based tools | v2.0 |

### Deprecated Commands

| Command | Status | Replacement |
|---------|--------|------------|
| `komplete config set model <name>` | Use `komplete config models default <name>` | v2.0 |
| `komplete tools add <name>` | Use `komplete config tools mcpServers add` | v2.0 |

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

- [x] Real-time streaming with progress tracking
- [x] Multi-provider model management with fallback chains
- [x] MCP-based tool discovery and execution
- [x] Automatic verification and repair
- [x] Rich TUI with keyboard navigation
- [x] Cost tracking and display
- [x] Tavily and Base44 integrations
- [x] CLI/VS Code alignment layer

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
git branch -D migrate-to-v2-go

# 4. Reinstall TypeScript version
npm install
npm run build

# 5. Report issue
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

# Validate YAML syntax
cat ~/.komplete/config.yaml | yamllint

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
komplete config set ui.theme light

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
komplete config show models.fallback_chain
```

#### Issue: Tools not connecting

**Symptom:** MCP servers show as disconnected

**Solution:**
```bash
# Test MCP server
komplete tools test mcp://localhost:3000

# Check server URL
komplete config show tools.mcp_servers

# Restart CLI
komplete --restart
```

---

## Post-Migration Steps

### 1. Verify New Features

```bash
# Test streaming
komplete --tui "test prompt"

# Test model switching
komplete --model gpt-4o-mini

# Test tools
komplete tools list

# Test verification
komplete --verify
```

### 2. Update Documentation

- [ ] Update README with v2.0 features
- [ ] Update command documentation
- [ ] Add migration examples
- [ ] Update VS Code extension documentation

### 3. Monitor Performance

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

### Getting Help

```bash
# Show migration help
komplete migrate --help

# Show config help
komplete config --help

# Show all commands
komplete --help
```

### Community

- GitHub Issues: Report bugs and feature requests
- Discord: Join discussions and ask questions
- Documentation: Contribute improvements

---

## Summary

This migration guide provides:

1. **Complete breaking changes** - What's changing and why
2. **Step-by-step process** - From preparation to cleanup
3. **Configuration migration** - JSON to YAML format
4. **Code migration** - TypeScript to Go with examples
5. **Testing strategy** - How to verify the migration
6. **Rollback procedure** - How to recover if needed
7. **Troubleshooting** - Common issues and solutions
8. **Post-migration steps** - Verification and monitoring
9. **Support resources** - Where to get help

Follow this guide carefully to ensure a smooth transition to v2.0 with Go and Bubbletea.
