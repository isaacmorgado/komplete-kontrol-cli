# KOMPLETE-KONTROL-CLI

> Ultimate AI coding assistant integrating Roo Code, /auto, and advanced autonomous features

[![Go Version](https://img.shields.io/badge/Go-%3E1.23-blue.svg)](https://golang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-green.svg)](https://github.com/komplete-kontrol/cli/releases)

## Overview

KOMPLETE-KONTROL-CLI is an AI-powered development assistant built with Go and the Bubbletea TUI framework. It provides flexible model management, tool integration via MCP, real-time streaming output, and verification/repair capabilities for autonomous development.

## Features

- **Multi-Provider Model Management** - Support for Anthropic, OpenAI, Gemini, VS Code LLM API, and local models with automatic fallback chains
- **MCP Tool Integration** - Standardized tool discovery and execution via Model Context Protocol
- **Real-Time Streaming** - Token-by-token streaming with progress tracking and cost estimation
- **Verification & Repair** - Automatic testing and regression detection for reliable autonomous operation
- **TUI Interface** - Beautiful terminal UI built with Bubbletea
- **VS Code Integration** - Shared communication protocol for CLI/VS Code extension alignment
- **Tavily & Base44** - Built-in integrations for web search and no-code app building

## Installation

### Prerequisites

- Go 1.23 or later
- Git (for cloning)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/komplete-kontrol/cli.git
cd cli

# Build the Go binary
go build -o komplete ./cmd/komplete

# Install globally (optional)
sudo cp komplete /usr/local/bin/
```

### Using Go Modules

```bash
# Install the CLI
go install github.com/komplete-kontrol/cli@latest

# The binary will be installed to $GOPATH/bin/komplete
```

## Configuration

Configuration is stored in `~/.komplete/config.yaml` by default.

### Example Configuration

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
      enabled: true
    local:
      enabled: false
      base_url: "http://localhost:11434"
tools:
  tavily:
    enabled: true
    api_key: "tvly-..."
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

## Usage

### Basic Commands

```bash
# Show help
komplete --help

# List available models
komplete models list

# List available tools
komplete tools list

# Execute a prompt (with TUI)
komplete --tui "Create a REST API with authentication"

# Execute a prompt (without TUI)
komplete --no-tui "Create a REST API with authentication"
```

### TUI (interactive)

The interactive TUI is available as a dedicated command:

```bash
go build -o komplete ./cmd/komplete

# Real provider (requires keys in config)
./komplete tui

# Deterministic smoke test (no keys required)
KOMPLETE_USE_MOCK_PROVIDER=1 ./komplete tui --mock

# Non-interactive smoke test for CI / environments without a TTY
./komplete tui-smoke
```

In the TUI:

- Type a prompt and press Enter to start a streaming completion.
- Use `tab` / `shift+tab` to switch between Output/Tools/Files/Logs/Settings.
- In Files tab, press Enter to open the selected file path.

### Commands

| Command | Description |
|----------|-------------|
| `auto` | Autonomous mode with verification and repair |
| `build` | Build and verify project |
| `checkpoint` | Create and restore project checkpoints |
| `collab` | Collaborative development mode |
| `compact` | Compact conversation context |
| `init` | Initialize new project |
| `multi-repo` | Work across multiple repositories |
| `personality` | Configure AI personality |
| `re` | Resume previous conversation |
| `reflect` | Reflect on past interactions |
| `research` | Research using web search |
| `research-api` | Research using API |
| `rootcause` | Analyze root causes |
| `sparc` | SPARC debugging |
| `swarm` | Multi-agent swarm mode |
| `voice` | Voice input mode |

## Architecture

The CLI is built with a modular architecture:

```
komplete-kontrol-cli/
├── cmd/komplete/          # Main entry point
├── internal/
│   ├── app/               # Root command setup
│   ├── tui/              # Bubbletea TUI framework
│   │   ├── app.go         # TUI application
│   │   ├── model.go       # Main TUI model
│   │   └── theme.go      # Theme system
│   ├── tui/components/     # Reusable UI components
│   │   ├── statusbar.go   # Status bar component
│   │   ├── outputpanel.go # Output panel component
│   │   └── textinput.go   # Text input component
│   ├── llm/               # LLM provider layer
│   │   ├── model_manager.go    # Model management
│   │   └── providers/        # Provider implementations
│   │       ├── anthropic.go   # Anthropic provider
│   │       └── openai.go      # OpenAI provider
│   ├── tools/             # Tool management
│   │   ├── tool_manager.go    # Tool manager
│   │   ├── tavily.go         # Tavily integration
│   │   ├── base44.go         # Base44 integration
│   │   └── mcp_transport.go  # MCP transport
│   ├── streaming/          # Streaming handler
│   │   └── handler.go       # Stream handler
│   ├── verification/       # Verification system
│   │   └── manager.go       # Verification manager
│   ├── alignment/          # CLI/VS Code alignment
│   │   └── protocol.go      # Alignment protocol
│   └── config/            # Configuration management
│       └── config.go      # Config manager
└── go.mod                # Go module definition
```

## Development

### Running Tests

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...
```

### Building

```bash
# Build for current platform
go build -o komplete ./cmd/komplete

# Build for multiple platforms
GOOS=linux GOARCH=amd64 go build -o komplete-linux-amd64 ./cmd/komplete
GOOS=darwin GOARCH=amd64 go build -o komplete-darwin-amd64 ./cmd/komplete
GOOS=windows GOARCH=amd64 go build -o komplete-windows-amd64.exe ./cmd/komplete
```

## Migration from v1.0

The Go version (v2.0) is a complete rewrite of the TypeScript version. Key changes:

- **Build System** - Changed from esbuild to Go build
- **TUI Framework** - Changed from Ink to Bubbletea
- **Model Management** - Enhanced with multi-provider support and fallback chains
- **Tool Integration** - Changed to MCP-based tool discovery
- **Streaming** - Improved real-time streaming with progress tracking
- **Configuration** - YAML-based configuration instead of JSON
- **Language** - Changed from TypeScript to Go

See [`MIGRATION-GUIDE.md`](MIGRATION-GUIDE.md) for detailed migration instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests
5. Submit a pull request

## License

MIT License - see [`LICENSE`](LICENSE) file for details.

## Acknowledgments

- [Bubbletea](https://github.com/charmbracelet/bubbletea) - TUI framework
- [Lipgloss](https://github.com/charmbracelet/lipgloss) - TUI styling
- [Cobra](https://github.com/spf13/cobra) - CLI framework
- [Viper](https://github.com/spf13/viper) - Configuration management
- [Anthropic Go SDK](https://github.com/anthropics/anthropic-go) - Anthropic API
- [Go OpenAI SDK](https://github.com/sashabaranov/go-openai) - OpenAI API

## TypeScript CLI (Experimental)

The project also includes a TypeScript CLI with advanced AI agent features:

### Screenshot-to-Code Pipeline (Phase 4)

Convert UI screenshots to production-ready React code with iterative refinement:

```bash
# Basic usage
bun run src/index.ts screenshot-to-code screenshot.png

# With options
bun run src/index.ts screenshot-to-code screenshot.png \
  --output ./my-component \
  --framework react \
  --library tailwind \
  --typescript \
  --max-iterations 3 \
  --threshold 85 \
  --tests \
  --report
```

**Features**:
- Vision LLM integration (Claude Sonnet 4.5 + Gemini 2.0 Flash MCP fallback)
- Multiple frameworks: React, Vue, Svelte
- Multiple component libraries: Tailwind, MUI, Chakra, Bootstrap
- Visual regression testing with 85% similarity threshold
- Iterative refinement (max 3 iterations)
- 35 integration tests (100% passing)

See [Screenshot-to-Code Guide](./docs/integration/SCREENSHOT-TO-CODE-GUIDE.md) for complete documentation.

### Other TypeScript Features

- **Autonomous Mode** (`/auto`) - AI-powered autonomous development
- **Reflexion Agent** - Self-correcting code generation
- **Multi-Agent Orchestration** - Parallel task execution with swarms
- **Quality Gates** - Constitutional AI validation

### Running TypeScript CLI

```bash
# Install dependencies
bun install

# Run TypeScript CLI
bun run src/index.ts --help

# Run tests
bun test
```

## Roadmap

### v2.0 (Current)
- [x] Go rewrite with Bubbletea TUI
- [x] Multi-provider model management
- [x] MCP tool integration
- [x] Real-time streaming
- [x] Verification and repair system
- [x] Tavily and Base44 integrations
- [x] CLI/VS Code alignment layer
- [x] TypeScript CLI with screenshot-to-code (Phase 4)
- [ ] MCP server mode for CLI
- [ ] Full command implementations

### Future Releases
- v2.1 - Additional commands and features
- v2.2 - Enhanced MCP server capabilities
- v2.3 - Performance improvements and optimizations
