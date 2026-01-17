package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/komplete-kontrol/cli/internal/config"
	"github.com/komplete-kontrol/cli/internal/llm"
)

// ToolManager manages tool discovery and execution
type ToolManager struct {
	config      *config.Config
	tools       map[string]*Tool
	mcpServers   map[string]*MCPServer
	mu           sync.RWMutex
}

// Tool represents a tool that can be called by the LLM
type Tool struct {
	ID          string
	Name        string
	Description string
	InputSchema map[string]any
	Handler     ToolHandler
	Provider    string
	Enabled     bool
}

// ToolHandler handles tool execution
type ToolHandler interface {
	Execute(ctx context.Context, input map[string]any) (*ToolResult, error)
}

// ToolResult represents the result of a tool execution
type ToolResult struct {
	Success bool
	Data    any
	Error    string
}

// MCPServer represents an MCP server connection
type MCPServer struct {
	ID       string
	Name     string
	URL       string
	Tools    []Tool
	Connected bool
	Transport MCPTransport
}

// MCPTransport handles communication with MCP servers
type MCPTransport interface {
	Connect(ctx context.Context) error
	Disconnect() error
	ListTools(ctx context.Context) ([]Tool, error)
	CallTool(ctx context.Context, name string, input map[string]any) (*ToolResult, error)
}

// NewToolManager creates a new tool manager
func NewToolManager(cfg *config.Config) *ToolManager {
	tm := &ToolManager{
		config:    cfg,
		tools:     make(map[string]*Tool),
		mcpServers: make(map[string]*MCPServer),
	}

	// Initialize built-in tools
	tm.initializeBuiltinTools()

	return tm
}

// initializeBuiltinTools initializes built-in tools
func (tm *ToolManager) initializeBuiltinTools() {
	// Tavily search tool
	if tm.config.Tools.Tavily.Enabled {
		tm.tools["tavily_search"] = &Tool{
			ID:          "tavily_search",
			Name:        "Tavily Search",
			Description: "Search the web using Tavily API",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{
						"type":        "string",
						"description": "Search query",
					},
					"max_results": map[string]any{
						"type":        "integer",
						"description": "Maximum number of results",
						"default":     10,
					},
				},
				"required": []string{"query"},
			},
			Handler:     NewTavilyHandler(tm.config.Tools.Tavily),
			Provider:    "tavily",
			Enabled:     true,
		}
	}

	// Base44 tool
	if tm.config.Tools.Base44.Enabled {
		tm.tools["base44_app"] = &Tool{
			ID:          "base44_app",
			Name:        "Base44 App Builder",
			Description: "Build no-code applications using Base44",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"prompt": map[string]any{
						"type":        "string",
						"description": "App description/prompt",
					},
					"workspace_id": map[string]any{
						"type":        "string",
						"description": "Workspace ID",
					},
				},
				"required": []string{"prompt"},
			},
			Handler:     NewBase44Handler(tm.config.Tools.Base44),
			Provider:    "base44",
			Enabled:     true,
		}
	}

	// Local file write tool (always enabled)
	tm.tools["write_file"] = &Tool{
		ID:          "write_file",
		Name:        "write_file",
		Description: "Write a file to disk (path + content). Use mkdir=true to create directories.",
		InputSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"path": map[string]any{
					"type":        "string",
					"description": "Relative file path",
				},
				"content": map[string]any{
					"type":        "string",
					"description": "File contents",
				},
				"mode": map[string]any{
					"type":        "string",
					"description": "overwrite|append",
					"default":     "overwrite",
				},
				"mkdir": map[string]any{
					"type":        "boolean",
					"description": "Create parent directories",
					"default":     true,
				},
			},
			"required": []string{"path", "content"},
		},
		Handler:  NewWriteFileHandler(),
		Provider: "local",
		Enabled:  true,
	}
}

// ListTools returns all available tools
func (tm *ToolManager) ListTools(ctx context.Context) ([]Tool, error) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var tools []Tool

	// Add built-in tools
	for _, tool := range tm.tools {
		if tool.Enabled {
			tools = append(tools, *tool)
		}
	}

	// Add MCP server tools
	for _, server := range tm.mcpServers {
		if server.Connected {
			tools = append(tools, server.Tools...)
		}
	}

	return tools, nil
}

// GetTool returns a tool by ID
func (tm *ToolManager) GetTool(id string) (*Tool, error) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	tool, ok := tm.tools[id]
	if !ok {
		return nil, fmt.Errorf("tool %s not found", id)
	}

	return tool, nil
}

// Execute executes a tool
func (tm *ToolManager) Execute(ctx context.Context, toolID string, input map[string]any) (*ToolResult, error) {
	tool, err := tm.GetTool(toolID)
	if err != nil {
		return nil, err
	}

	if !tool.Enabled {
		return nil, fmt.Errorf("tool %s is not enabled", toolID)
	}

	return tool.Handler.Execute(ctx, input)
}

// RegisterTool registers a custom tool
func (tm *ToolManager) RegisterTool(tool *Tool) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if _, exists := tm.tools[tool.ID]; exists {
		return fmt.Errorf("tool %s already registered", tool.ID)
	}

	tm.tools[tool.ID] = tool
	return nil
}

// UnregisterTool removes a tool
func (tm *ToolManager) UnregisterTool(id string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if _, exists := tm.tools[id]; !exists {
		return fmt.Errorf("tool %s not found", id)
	}

	delete(tm.tools, id)
	return nil
}

// ConnectMCPServer connects to an MCP server
func (tm *ToolManager) ConnectMCPServer(ctx context.Context, id string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	// Find server config
	var serverConfig *config.MCPServerConfig
	for _, sc := range tm.config.Tools.MCPServers {
		if sc.ID == id {
			serverConfig = &sc
			break
		}
	}

	if serverConfig == nil {
		return fmt.Errorf("MCP server %s not configured", id)
	}

	// Create transport
	transport := NewMCPTransport(serverConfig.URL)

	// Connect
	if err := transport.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to MCP server %s: %w", id, err)
	}

	// List tools
	tools, err := transport.ListTools(ctx)
	if err != nil {
		return fmt.Errorf("failed to list tools from MCP server %s: %w", id, err)
	}

	// Register server
	tm.mcpServers[id] = &MCPServer{
		ID:       id,
		Name:     serverConfig.Name,
		URL:       serverConfig.URL,
		Tools:    tools,
		Connected: true,
		Transport: transport,
	}

	return nil
}

// DisconnectMCPServer disconnects from an MCP server
func (tm *ToolManager) DisconnectMCPServer(id string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	server, ok := tm.mcpServers[id]
	if !ok {
		return fmt.Errorf("MCP server %s not connected", id)
	}

	// Disconnect transport
	if err := server.Transport.Disconnect(); err != nil {
		return err
	}

	// Remove server
	delete(tm.mcpServers, id)

	return nil
}

// ListMCPServers returns all connected MCP servers
func (tm *ToolManager) ListMCPServers() []string {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var servers []string
	for id := range tm.mcpServers {
		servers = append(servers, id)
	}
	return servers
}

// GetMCPServer returns an MCP server by ID
func (tm *ToolManager) GetMCPServer(id string) (*MCPServer, error) {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	server, ok := tm.mcpServers[id]
	if !ok {
		return nil, fmt.Errorf("MCP server %s not found", id)
	}

	return server, nil
}

// ExecuteOnMCPServer executes a tool on an MCP server
func (tm *ToolManager) ExecuteOnMCPServer(ctx context.Context, serverID, toolID string, input map[string]any) (*ToolResult, error) {
	server, err := tm.GetMCPServer(serverID)
	if err != nil {
		return nil, err
	}

	if !server.Connected {
		return nil, fmt.Errorf("MCP server %s is not connected", serverID)
	}

	return server.Transport.CallTool(ctx, toolID, input)
}

// ToLLMToolDefinitions converts enabled tools into LLM tool definitions.
// Tool IDs are used as the callable name to ensure tool call routing works.
func (tm *ToolManager) ToLLMToolDefinitions() []llm.ToolDefinition {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	defs := make([]llm.ToolDefinition, 0, len(tm.tools))
	for _, tool := range tm.tools {
		if !tool.Enabled {
			continue
		}
		defs = append(defs, llm.ToolDefinition{
			Name:        tool.ID,
			Description: tool.Description,
			InputSchema: tool.InputSchema,
		})
	}

	// Add MCP server tools
	for _, server := range tm.mcpServers {
		if !server.Connected {
			continue
		}
		for _, tool := range server.Tools {
			if !tool.Enabled {
				continue
			}
			defs = append(defs, llm.ToolDefinition{
				Name:        tool.ID,
				Description: tool.Description,
				InputSchema: tool.InputSchema,
			})
		}
	}

	return defs
}

// ToToolDefinitions converts tools to LLM format
func (tm *ToolManager) ToToolDefinitions() []map[string]any {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var definitions []map[string]any

	for _, tool := range tm.tools {
		if tool.Enabled {
			// NOTE: Use tool.ID as the function name to keep tool calls routable.
			def := map[string]any{
				"type": "function",
				"function": map[string]any{
					"name":        tool.ID,
					"description": tool.Description,
					"parameters":  tool.InputSchema,
				},
			}
			definitions = append(definitions, def)
		}
	}

	// Add MCP server tools
	for _, server := range tm.mcpServers {
		if server.Connected {
			for _, tool := range server.Tools {
				def := map[string]any{
					"type":        "function",
					"function": map[string]any{
						"name":        tool.ID,
						"description": tool.Description,
						"parameters":  tool.InputSchema,
					},
				}
				definitions = append(definitions, def)
			}
		}
	}

	return definitions
}

// ValidateInput validates tool input against schema
func (tm *ToolManager) ValidateInput(toolID string, input map[string]any) error {
	tool, err := tm.GetTool(toolID)
	if err != nil {
		return err
	}

	// Check required fields
	required, ok := tool.InputSchema["required"].([]string)
	if ok {
		for _, field := range required {
			if _, exists := input[field]; !exists {
				return fmt.Errorf("missing required field: %s", field)
			}
		}
	}

	// Type validation could be added here
	return nil
}

// GetToolCount returns the number of available tools
func (tm *ToolManager) GetToolCount() int {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	count := 0
	for _, tool := range tm.tools {
		if tool.Enabled {
			count++
		}
	}
	return count
}

// GetEnabledTools returns all enabled tools
func (tm *ToolManager) GetEnabledTools() []Tool {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var tools []Tool
	for _, tool := range tm.tools {
		if tool.Enabled {
			tools = append(tools, *tool)
		}
	}
	return tools
}

// EnableTool enables a tool
func (tm *ToolManager) EnableTool(id string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	tool, ok := tm.tools[id]
	if !ok {
		return fmt.Errorf("tool %s not found", id)
	}

	tool.Enabled = true
	return nil
}

// DisableTool disables a tool
func (tm *ToolManager) DisableTool(id string) error {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	tool, ok := tm.tools[id]
	if !ok {
		return fmt.Errorf("tool %s not found", id)
	}

	tool.Enabled = false
	return nil
}

// MarshalJSON converts tool result to JSON
func (tr *ToolResult) MarshalJSON() ([]byte, error) {
	return json.Marshal(tr)
}

// UnmarshalJSON parses JSON into tool result
func (tr *ToolResult) UnmarshalJSON(data []byte) error {
	return json.Unmarshal(data, tr)
}
