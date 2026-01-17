package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// MCPClientTransport handles communication with MCP servers
type MCPClientTransport struct {
	serverURL string
	conn      *websocket.Conn
	mu        sync.RWMutex
	timeout   time.Duration
}

// NewMCPTransport creates a new MCP transport
func NewMCPTransport(serverURL string) *MCPClientTransport {
	return &MCPClientTransport{
		serverURL: serverURL,
		timeout:   30 * time.Second,
	}
}

// MCPToolHandler executes a specific MCP tool via transport.
type MCPToolHandler struct {
	transport *MCPClientTransport
	toolName  string
}

// Execute runs MCP tool call.
func (h *MCPToolHandler) Execute(ctx context.Context, input map[string]any) (*ToolResult, error) {
	return h.transport.CallTool(ctx, h.toolName, input)
}

// Connect establishes a connection to an MCP server
func (t *MCPClientTransport) Connect(ctx context.Context) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Parse URL
	parsedURL, err := url.Parse(t.serverURL)
	if err != nil {
		return fmt.Errorf("invalid MCP server URL: %w", err)
	}

	// Connect via WebSocket
	dialer := websocket.Dialer{
		HandshakeTimeout: t.timeout,
	}
	conn, _, err := dialer.DialContext(ctx, parsedURL.String(), nil)
	if err != nil {
		return fmt.Errorf("failed to connect to MCP server: %w", err)
	}

	t.conn = conn
	return nil
}

// Disconnect closes connection
func (t *MCPClientTransport) Disconnect() error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.conn == nil {
		return nil
	}

	err := t.conn.Close()
	t.conn = nil

	return err
}

// ListTools lists available tools from MCP server
func (t *MCPClientTransport) ListTools(ctx context.Context) ([]Tool, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.conn == nil {
		return nil, fmt.Errorf("not connected to MCP server")
	}

	// Send tools/list request
	req := MCPRequest{
		ID:     generateID(),
		Method: "tools/list",
		Params: map[string]any{},
	}

	resp, err := t.sendRequest(ctx, &req)
	if err != nil {
		return nil, err
	}

	// Parse tools
	var tools []Tool
	if result, ok := resp.Result.([]map[string]any); ok {
		for _, toolData := range result {
			name, _ := toolData["name"].(string)
			description, _ := toolData["description"].(string)
			inputSchema, _ := toolData["inputSchema"].(map[string]any)
			tool := Tool{
				ID:          name,
				Name:        name,
				Description: description,
				InputSchema: inputSchema,
				Handler:     &MCPToolHandler{transport: t, toolName: name},
				Provider:    "mcp",
				Enabled:     true,
			}
			tools = append(tools, tool)
		}
	}

	return tools, nil
}

// CallTool executes a tool on MCP server
func (t *MCPClientTransport) CallTool(ctx context.Context, name string, input map[string]any) (*ToolResult, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.conn == nil {
		return nil, fmt.Errorf("not connected to MCP server")
	}

	// Send tools/call request
	req := MCPRequest{
		ID:     generateID(),
		Method: "tools/call",
		Params: map[string]any{
			"name":      name,
			"arguments": input,
		},
	}

	resp, err := t.sendRequest(ctx, &req)
	if err != nil {
		return nil, err
	}

	// Parse result
	if result, ok := resp.Result.(map[string]any); ok {
		if content, ok := result["content"].(string); ok {
			return &ToolResult{
				Success: true,
				Data:    content,
				Error:   "",
			}, nil
		}

		if errorMsg, ok := result["error"].(map[string]any); ok {
			if message, ok := errorMsg["message"].(string); ok {
				return &ToolResult{
					Success: false,
					Data:    nil,
					Error:   message,
				}, fmt.Errorf(message)
			}
		}
	}

	return &ToolResult{
		Success: false,
		Data:    nil,
		Error:   "unknown error",
	}, fmt.Errorf("unknown error")
}

// sendRequest sends a request to an MCP server with context support
func (t *MCPClientTransport) sendRequest(ctx context.Context, req *MCPRequest) (*MCPResponse, error) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	// Marshal request
	reqData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Send request with context for deadline/cancellation support
	if ctx != nil {
		// Set write deadline from context if available
		if deadline, ok := ctx.Deadline(); ok {
			_ = t.conn.SetWriteDeadline(deadline)
			_ = t.conn.SetReadDeadline(deadline)
		}
	}
	if err := t.conn.WriteMessage(websocket.TextMessage, reqData); err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	// Wait for response with context support
	type result struct {
		respData []byte
		err      error
	}
	resultCh := make(chan result, 1)
	go func() {
		_, respData, err := t.conn.ReadMessage()
		resultCh <- result{respData: respData, err: err}
	}()

	select {
	case <-ctx.Done():
		return nil, fmt.Errorf("request cancelled")
	case r := <-resultCh:
		if r.err != nil {
			return nil, fmt.Errorf("failed to read response: %w", r.err)
		}
		// Parse response
		var resp MCPResponse
		if err := json.Unmarshal(r.respData, &resp); err != nil {
			return nil, fmt.Errorf("failed to parse response: %w", err)
		}
		return &resp, nil
	}
}

// MCPRequest represents a request to an MCP server
type MCPRequest struct {
	ID     string
	Method string
	Params map[string]any
}

// MCPResponse represents a response from an MCP server
type MCPResponse struct {
	ID     string    `json:"id"`
	Result any       `json:"result"`
	Error  *MCPError `json:"error,omitempty"`
}

// MCPError represents an error from an MCP server
type MCPError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// generateID generates a unique ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// IsConnected returns if transport is connected
func (t *MCPClientTransport) IsConnected() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.conn != nil
}

// GetServerURL returns server URL
func (t *MCPClientTransport) GetServerURL() string {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.serverURL
}

// GetID returns transport ID
func (t *MCPClientTransport) GetID() string {
	return t.serverURL
}

// SetTimeout sets connection timeout
func (t *MCPClientTransport) SetTimeout(timeout time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.timeout = timeout
}

// GetTimeout returns connection timeout
func (t *MCPClientTransport) GetTimeout() time.Duration {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.timeout
}

// Close closes connection
func (t *MCPClientTransport) Close() error {
	return t.Disconnect()
}

// String returns server URL as string
func (t *MCPClientTransport) String() string {
	return t.serverURL
}
