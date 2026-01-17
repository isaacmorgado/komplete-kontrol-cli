package llmapi

import "context"

// ProviderType represents the type of LLM provider.
type ProviderType string

const (
	ProviderAnthropic ProviderType = "anthropic"
	ProviderOpenAI    ProviderType = "openai"
	ProviderGemini    ProviderType = "gemini"
	ProviderVSCode    ProviderType = "vscode"
	ProviderLocal     ProviderType = "local"
	ProviderMCP       ProviderType = "mcp"
)

// ModelInfo represents information about a model.
type ModelInfo struct {
	ID           string
	Name         string
	Provider     ProviderType
	Capabilities ModelCapabilities
	CostPer1k    float64
	MaxTokens    int
}

// ModelCapabilities represents what a model can do.
type ModelCapabilities struct {
	Streaming   bool
	Tools       bool
	Vision      bool
	Multimodal  bool
}

// Provider represents an LLM provider interface.
type Provider interface {
	Name() string
	Type() ProviderType
	Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)
	StreamComplete(ctx context.Context, req *CompletionRequest, handler StreamHandler) (*CompletionResponse, error)
	ListModels(ctx context.Context) ([]ModelInfo, error)
	IsAvailable(ctx context.Context) bool
}

// StreamHandler handles streaming tokens.
type StreamHandler interface {
	OnToken(token string)
	OnDone(response *CompletionResponse)
	OnError(err error)
}

// CompletionRequest represents a request to an LLM.
type CompletionRequest struct {
	Model       string
	Messages    []Message
	MaxTokens   int
	Temperature float64
	Tools       []ToolDefinition
	System      string
	Stream      bool
}

// Message represents a chat message.
type Message struct {
	Role       string
	Content    string
	ToolCalls  []ToolCall
	ToolResult *ToolResult
}

// ToolDefinition represents a tool definition.
type ToolDefinition struct {
	Name        string
	Description string
	InputSchema map[string]any
}

// ToolCall represents a tool call.
type ToolCall struct {
	ID        string
	Name      string
	Arguments map[string]any
}

// ToolResult represents a tool execution result.
type ToolResult struct {
	ToolCallID string
	Content    string
	Error      error
}

// CompletionResponse represents a response from an LLM.
type CompletionResponse struct {
	ID          string
	Model       string
	Message     Message
	ToolCalls   []ToolCall
	StopReason  string
	TokensUsed  TokenUsage
	FinishReason string
}

// TokenUsage represents token usage.
type TokenUsage struct {
	InputTokens  int
	OutputTokens int
	TotalTokens  int
}

