# KOMPLETE-KONTROL-CLI Makefile

.PHONY: all build clean test install help lint run

# Variables
BINARY_NAME=komplete
MAIN_DIR=cmd/komplete
BUILD_DIR=dist
GO=go
GOFLAGS=-v
LDFLAGS=-s -w
GO_REQUIRED=go

# Default target
.DEFAULT_GOAL: build

# Go build check
check-go:
	@echo "Checking for Go installation..."
	@which go > /dev/null || (echo "Go is not installed. Please install Go to build the CLI." && exit 1)
	@echo "Go is installed"
	@go version
	@echo "Go installation verified"

# Build Go binary
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	$(GO) build $(GOFLAGS) -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME) ./$(MAIN_DIR)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"
	@echo "Run 'make install' to install to GOPATH/bin"
	@echo "Run 'make run' to test the CLI"

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete"

# Run tests
test:
	@echo "Running tests..."
	@echo "Note: Tests require Go to be installed"
	$(GO) test -v -race -coverprofile=coverage -covermode=atomic ./...
	@echo "Tests complete"

# Install binary
install: build
	@echo "Installing $(BINARY_NAME)..."
	@mkdir -p $(GOPATH)/bin
	@cp $(BUILD_DIR)/$(BINARY_NAME) $(GOPATH)/bin/$(BINARY_NAME)
	@echo "Install complete: $(GOPATH)/bin/$(BINARY_NAME)"

# Run CLI
run: build
	@echo "Running $(BINARY_NAME)..."
	@$(BUILD_DIR)/$(BINARY_NAME) --help
	@echo "Run complete"

# Run in development mode
dev: build
	@echo "Running $(BINARY_NAME) in development mode..."
	@$(BUILD_DIR)/$(BINARY_NAME)
	@echo "Dev run complete"

# Format code
fmt:
	@echo "Formatting code..."
	@$(GO) fmt ./...
	@echo "Format complete"

# Lint code
lint:
	@echo "Linting code..."
	@which golangci-lint > /dev/null || echo "golangci-lint not installed, skipping"
	@golangci-lint run ./...
	@echo "Lint complete"

# Vet code
vet:
	@echo "Vetting code..."
	@$(GO) vet ./...
	@echo "Vet complete"

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	$(GO) mod download
	@echo "Dependencies complete"

# Tidy dependencies
tidy:
	@echo "Tidying dependencies..."
	@$(GO) mod tidy
	@echo "Tidy complete"

# Verify dependencies
verify:
	@echo "Verifying dependencies..."
	$(GO) mod verify
	@echo "Verify complete"

# Show help
help:
	@echo "KOMPLETE-KONTROL-CLI - AI-powered development assistant"
	@echo ""
	@echo "Targets:"
	@echo "  all           - Build, clean, test, install"
	@echo "  build         - Build Go binary"
	@echo "  clean         - Remove build artifacts"
	@echo "  test          - Run tests"
	@echo "  test-coverage - Run tests with coverage"
	@echo "  install       - Install binary to GOPATH/bin"
	@echo "  run           - Run CLI"
	@echo "  dev           - Run in development mode"
	@echo "  fmt           - Format Go code"
	@echo "  lint          - Run linter"
	@echo "  vet           - Run go vet"
	@echo "  deps          - Download dependencies"
	@echo "  tidy          - Tidy dependencies"
	@echo "  verify        - Verify dependencies"
	@echo "  check-go      - Check Go installation"
	@echo ""
	@echo "Usage:"
	@echo "  make [target]"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make test"
	@echo "  make install"
	@echo "  make run"
	@echo "  make clean"
	@echo "  make check-go"
	@echo ""
	@echo "Go Setup:"
	@echo "  1. Install Go from https://go.dev/dl/"
	@echo "  2. Set GOPATH and PATH environment variables"
	@echo "  3. Run 'go mod download' to fetch dependencies"
	@echo ""
	@echo "Note: Go is required to build the CLI. If Go is not installed,"
	@echo "run 'make check-go' to verify installation."
	@echo ""
	@echo "Provider Setup:"
	@echo "  - Anthropic: Set ANTHROPIC_API_KEY environment variable"
	@echo "  - OpenAI: Set OPENAI_API_KEY environment variable"
	@echo "  - Gemini: Set GEMINI_API_KEY environment variable"
	@echo "  - Local: Set LOCAL_ENABLED=true for local models (Ollama, LM Studio)"
	@echo "  - VS Code: Set VSCODE_ENABLED=true for VS Code LLM integration"
	@echo "  - Tavily: Set TAVILY_API_KEY for web search"
	@echo "  - Base44: Set BASE44_API_KEY for workspace integration"

# Default target
.DEFAULT_GOAL: build

# Build the Go binary
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	$(GO) build $(GOFLAGS) -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME) ./$(MAIN_DIR)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete"

# Run tests
test:
	@echo "Running tests..."
	$(GO) test -v -race -coverprofile=coverage -covermode=atomic ./...
	@echo "Tests complete"

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	$(GO) test -v -race -coverprofile=coverage -covermode=atomic -cover ./...
	$(GO) tool cover -func=coverage.out
	@echo "Coverage report: coverage.out"
	$(GO) tool cover -html=coverage.html -func=coverage.out
	@echo "Coverage HTML: coverage.html"

# Install the binary
install: build
	@echo "Installing $(BINARY_NAME)..."
	@mkdir -p $(GOPATH)/bin
	@cp $(BUILD_DIR)/$(BINARY_NAME) $(GOPATH)/bin/$(BINARY_NAME)
	@echo "Install complete: $(GOPATH)/bin/$(BINARY_NAME)"

# Run the CLI
run: build
	@echo "Running $(BINARY_NAME)..."
	@$(BUILD_DIR)/$(BINARY_NAME) --help

# Run in development mode
dev: build
	@echo "Running $(BINARY_NAME) in development mode..."
	@$(BUILD_DIR)/$(BINARY_NAME)

# Format code
fmt:
	@echo "Formatting code..."
	$(GO) fmt ./...

# Lint code
lint:
	@echo "Linting code..."
	@which golangci-lint > /dev/null || echo "golangci-lint not installed, skipping"
	@golangci-lint run ./...

# Vet code
vet:
	@echo "Vetting code..."
	$(GO) vet ./...

# Show help
help:
	@echo "KOMPLETE-KONTROL-CLI - AI-powered development assistant"
	@echo ""
	@echo "Targets:"
	@echo "  all           - Build, clean, test, install"
	@echo "  build         - Build the Go binary"
	@echo "  clean         - Remove build artifacts"
	@echo "  test          - Run tests"
	@echo "  test-coverage - Run tests with coverage"
	@echo "  install       - Install the binary to GOPATH/bin"
	@echo "  run           - Run the CLI"
	@echo "  dev           - Run in development mode"
	@echo "  fmt           - Format Go code"
	@echo "  lint          - Run linter"
	@echo "  vet           - Run go vet"
	@echo ""
	@echo "Usage:"
	@echo "  make [target]"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make test"
	@echo "  make install"
	@echo "  make run"
	@echo "  make clean"

# Watch for changes
watch:
	@echo "Watching for changes..."
	@find . -name '*.go' | entr -c 'clear && make build'

# Generate dependencies
deps:
	@echo "Downloading dependencies..."
	$(GO) mod download
	@echo "Dependencies complete"

# Tidy dependencies
tidy:
	@echo "Tidying dependencies..."
	$(GO) mod tidy
	@echo "Tidy complete"

# Verify dependencies
verify:
	@echo "Verifying dependencies..."
	$(GO) mod verify
	@echo "Verify complete"
