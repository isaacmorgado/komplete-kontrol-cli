# Changelog

All notable changes to KOMPLETE-KONTROL-CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-16

### Added

#### Complete Rewrite to Go with Bubbletea TUI
- **New Build System** - Changed from esbuild to Go build
- **Bubbletea TUI Framework** - Replaced Ink with Bubbletea for reactive terminal UI
- **Multi-Provider Model Management** - Support for Anthropic, OpenAI, Gemini, VS Code LLM API, and local models
- **MCP Tool Integration** - Standardized tool discovery and execution via Model Context Protocol
- **Real-Time Streaming** - Token-by-token streaming with progress tracking and cost estimation
- **Verification & Repair System** - Automatic testing and regression detection for reliable autonomous operation
- **CLI/VS Code Alignment Layer** - Shared communication protocol for CLI/VS Code extension integration
- **Tavily & Base44 Integrations** - Built-in integrations for web search and no-code app building

#### New TUI Components
- **StatusBar** - Display model info, tokens, cost, and status
- **OutputPanel** - Display streaming messages with syntax highlighting
- **TextInput** - Capture user input for prompts
- **Theme System** - Dark/light theme support with lipgloss styling

#### New Core Modules
- **Model Manager** (`internal/llm/model_manager.go`)
  - Flexible model routing with fallback chains
  - Support for multiple LLM providers (Anthropic, OpenAI, Gemini, VS Code, Local)
  - Cost tracking and token counting

- **Tool Manager** (`internal/tools/tool_manager.go`)
  - MCP server management and connection
  - Built-in tools (Tavily Search, Base44 App Builder)
  - Custom tool registration
  - Tool execution with timeout and error handling

- **Stream Handler** (`internal/streaming/handler.go`)
  - Token-by-token streaming
  - Progress tracking and cost estimation
  - TUI integration for real-time updates

- **Verification Manager** (`internal/verification/manager.go`)
  - Verification step management
  - Automatic testing with repair strategies
  - Common verification steps (syntax, build, test)
  - Configurable retry limits

- **Alignment Layer** (`internal/alignment/protocol.go`)
  - CLI/VS Code communication protocol
  - Message forwarding between CLI and VS Code
  - Event handling for streaming and errors

#### Configuration System
- **YAML-based Configuration** - Changed from JSON to YAML for better readability
- **Multi-Provider Support** - Configuration for Anthropic, OpenAI, Gemini, VS Code, Local
- **Tool Configuration** - Tavily, Base44, and MCP servers
- **UI Configuration** - Theme, streaming, cost display settings
- **Verification Configuration** - Auto-verify, auto-repair, max retries
- **Alignment Configuration** - Enable/disable VS Code integration

#### Build System
- **Go Build** - `go build -o komplete ./cmd/komplete`
- **Cross-Platform** - Support for Linux, macOS, Windows
- **Testing** - `go test ./...`
- **Clean** - `go clean`

#### Dependencies
- **github.com/charmbracelet/bubbletea** - TUI framework
- **github.com/charmbracelet/lipgloss** - TUI styling
- **github.com/spf13/cobra** - CLI framework
- **github.com/spf13/viper** - Configuration management
- **github.com/anthropics/anthropic-go/v2** - Anthropic API
- **github.com/sashabaranov/go-openai** - OpenAI API
- **github.com/gorilla/websocket** - WebSocket support for MCP
- **gopkg.in/yaml.v3** - YAML parsing

#### Breaking Changes
- **Build System** - Changed from esbuild to Go build
- **TUI Framework** - Changed from Ink to Bubbletea
- **Configuration Format** - Changed from JSON to YAML
- **Language** - Changed from TypeScript to Go
- **Package Manager** - Changed from npm to Go modules

#### Migration Notes
- Configuration file format changed from JSON to YAML
- API keys and settings need to be migrated to new format
- See [`MIGRATION-GUIDE.md`](MIGRATION-GUIDE.md) for detailed migration instructions

#### Known Issues
- MCP server mode not yet implemented (planned for future release)
- Some provider implementations (Gemini, VS Code, Local) are stub implementations

---

## [1.0.0] - Previous Version

The original version was built with TypeScript, esbuild, and Ink TUI.

### Key Features
- TypeScript/Node.js implementation
- esbuild for bundling
- Ink for terminal UI
- Anthropic SDK integration
- Basic tool calling
- Ora spinners for loading states
- Chalk for terminal colors

---

## Links

- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [COMPONENT-LIBRARY.md](COMPONENT-LIBRARY.md)
