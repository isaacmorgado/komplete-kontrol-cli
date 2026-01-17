# Go Environment Setup Guide

This guide provides comprehensive instructions for setting up the Go development environment for the komplete-kontrol-cli project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Go](#installing-go)
3. [Configuring Go Environment](#configuring-go-environment)
4. [Verifying Installation](#verifying-installation)
5. [Installing Project Dependencies](#installing-project-dependencies)
6. [Building the CLI](#building-the-cli)
7. [Troubleshooting](#troubleshooting)
8. [Provider Configuration](#provider-configuration)

## Prerequisites

- **Operating System**: macOS, Linux, or Windows
- **Terminal Access**: Command line interface access
- **Git**: For cloning repositories (optional if using existing code)
- **Text Editor**: VS Code, Vim, or any code editor

## Installing Go

### macOS

#### Using Homebrew (Recommended)

```bash
brew install go
```

#### Using Installer

1. Download the installer from [https://go.dev/dl/](https://go.dev/dl/)
2. Run the `.pkg` installer
3. Follow the installation wizard

### Linux

#### Using Package Manager

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install golang-go
```

**Fedora:**
```bash
sudo dnf install golang
```

**Arch Linux:**
```bash
sudo pacman -S go
```

#### Using Tarball

1. Download from [https://go.dev/dl/](https://go.dev/dl/)
2. Extract to `/usr/local/go`:
```bash
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.x.linux-amd64.tar.gz
```

### Windows

1. Download the MSI installer from [https://go.dev/dl/](https://go.dev/dl/)
2. Run the installer and follow the prompts
3. Restart your terminal/command prompt

## Configuring Go Environment

### Setting Environment Variables

#### macOS/Linux

Add to your shell configuration file (`~/.zshrc` for Zsh, `~/.bashrc` for Bash):

```bash
# Go installation path
export GOROOT=/usr/local/go

# Go workspace path
export GOPATH=$HOME/go

# Add Go binaries to PATH
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

# Go module cache
export GOMODCACHE=$GOPATH/pkg/mod
```

Apply changes:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

#### Windows

1. Open System Properties → Environment Variables
2. Add or modify the following variables:
   - `GOROOT`: `C:\Program Files\Go` (or installation path)
   - `GOPATH`: `C:\Users\YourUsername\go`
   - `PATH`: Add `%GOROOT%\bin` and `%GOPATH%\bin`

### Verifying Environment Variables

```bash
echo $GOROOT
echo $GOPATH
echo $PATH
```

## Verifying Installation

### Check Go Version

```bash
go version
```

Expected output:
```
go version go1.23.x darwin/amd64  # or linux/amd64, windows/amd64
```

### Check Go Environment

```bash
go env
```

This displays all Go environment variables. Verify:
- `GOROOT` is set correctly
- `GOPATH` is set correctly
- `GOPATH/bin` is in your `PATH`

### Test Go Installation

Create a simple test file:

```bash
mkdir -p ~/go/src/hello
cd ~/go/src/hello
cat > hello.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
EOF
go run hello.go
```

Expected output:
```
Hello, Go!
```

## Installing Project Dependencies

### Navigate to Project Directory

```bash
cd /Users/imorgado/Desktop/Projects/komplete-kontrol-cli
```

### Download Dependencies

```bash
go mod download
```

This downloads all dependencies specified in `go.mod`:
- github.com/spf13/cobra (CLI framework)
- github.com/spf13/viper (Configuration)
- github.com/sashabaranov/go-openai (OpenAI API)
- github.com/anthropics/anthropic-go (Anthropic API)
- github.com/google/generative-ai-go/genai (Gemini API)

### Tidy Dependencies

```bash
go mod tidy
```

This cleans up unused dependencies and adds any missing ones.

### Verify Dependencies

```bash
go mod verify
```

This checks that all dependencies have valid checksums.

## Building the CLI

### Using Makefile

```bash
make check-go  # Verify Go installation
make build     # Build the CLI
```

The binary will be created at `dist/komplete`.

### Using npm Scripts

```bash
npm run check:go  # Verify Go installation
npm run build:go  # Build the CLI
```

### Using Go Directly

```bash
go build -v -ldflags='-s -w' -o dist/komplete ./cmd/komplete
```

Flags:
- `-v`: Verbose output
- `-ldflags='-s -w'`: Strip debug information for smaller binary
- `-o dist/komplete`: Output binary location

## Testing the CLI

### Run the CLI

```bash
./dist/komplete --help
```

Expected output shows all available commands:
```
komplete-kontrol - AI-powered development assistant

Usage:
  komplete [command]

Available Commands:
  auto         Autonomous development mode
  build        Build project
  checkpoint   Manage checkpoints
  collab       Collaboration mode
  commit       Git commit
  compact      Compact data
  completion   Generate shell completion
  help         Help about any command
  init         Initialize komplete-kontrol
  multirepo    Multi-repository mode
  personality  Manage AI personality
  re           Reflexion agent
  reflect      Reflect on completed work
  research     Research task
  researchapi  Research API mode
  rootcause    Root cause analysis
  screenshot   Screenshot to code
  sparc        SPARC mode
  swarm        Multi-agent swarm mode
  voice        Voice mode

Flags:
  -h, --help      help for komplete
  -v, --version   version for komplete
```

### Run Tests

```bash
make test      # Using Makefile
npm run test:go # Using npm scripts
```

## Troubleshooting

### Go Command Not Found

**Problem:** `go: command not found`

**Solution:**
1. Verify Go is installed: `which go`
2. Check PATH: `echo $PATH`
3. Add Go to PATH in your shell configuration
4. Restart terminal or run `source ~/.zshrc`

### Module Download Errors

**Problem:** `go: module not found` or network errors

**Solution:**
1. Check internet connection
2. Try: `go env GOPROXY` (should show proxy settings)
3. Set proxy if needed: `go env -w GOPROXY=https://proxy.golang.org,direct`
4. Clear module cache: `go clean -modcache`
5. Retry: `go mod download`

### Build Errors

**Problem:** Compilation errors

**Solution:**
1. Check Go version: `go version` (requires 1.23+)
2. Update Go if needed
3. Clean build artifacts: `make clean`
4. Retry build: `make build`

### Permission Errors

**Problem:** Permission denied when building

**Solution:**
```bash
# macOS/Linux
sudo chown -R $(whoami) ~/go
sudo chown -R $(whoami) /usr/local/go

# Or use user-specific GOPATH
export GOPATH=$HOME/go
```

## Provider Configuration

The CLI supports multiple LLM providers. Configure them via environment variables:

### Anthropic (Claude)

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### OpenAI

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Google Gemini

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### Local Models (Ollama, LM Studio)

```bash
export LOCAL_ENABLED=true
export LOCAL_ENDPOINT="http://localhost:11434"  # Default
```

### VS Code LLM

```bash
export VSCODE_ENABLED=true
export VSCODE_ENDPOINT="http://localhost:11434"  # Default
```

### MCP Server

```bash
export MCP_ENABLED=true
```

### Tavily (Web Search)

```bash
export TAVILY_API_KEY="your-api-key-here"
```

### Base44 (Workspace Integration)

```bash
export BASE44_API_KEY="your-api-key-here"
```

## Additional Resources

- [Go Documentation](https://go.dev/doc/)
- [Go Tour](https://go.dev/tour/)
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Modules Reference](https://go.dev/ref/mod)
- [Cobra Documentation](https://github.com/spf13/cobra)

## Quick Start Checklist

- [ ] Install Go 1.23 or later
- [ ] Configure GOROOT and GOPATH
- [ ] Add Go binaries to PATH
- [ ] Verify installation with `go version`
- [ ] Navigate to project directory
- [ ] Run `go mod download`
- [ ] Run `go mod tidy`
- [ ] Build CLI with `make build`
- [ ] Test CLI with `./dist/komplete --help`
- [ ] Configure required provider API keys
- [ ] Run tests with `make test`

## Support

For issues related to:
- **Go installation**: Refer to [https://go.dev/doc/install](https://go.dev/doc/install)
- **Project-specific issues**: Check the project's issue tracker
- **Provider APIs**: Refer to respective provider documentation
