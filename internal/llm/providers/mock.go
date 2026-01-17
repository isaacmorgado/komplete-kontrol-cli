package providers

import (
	"context"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llmapi"
)

// MockProvider is a deterministic provider used for tests and smoke runs.
// It streams predictable tokens and never performs network I/O.
type MockProvider struct{}

func NewMockProvider() *MockProvider { return &MockProvider{} }

func (p *MockProvider) Name() string { return "Mock" }

func (p *MockProvider) Type() llmapi.ProviderType { return llmapi.ProviderLocal }

func (p *MockProvider) IsAvailable(ctx context.Context) bool { return true }

func (p *MockProvider) ListModels(ctx context.Context) ([]llmapi.ModelInfo, error) {
	return []llmapi.ModelInfo{{
		ID:       "mock-stream",
		Name:     "Mock Stream",
		Provider: llmapi.ProviderLocal,
		Capabilities: llmapi.ModelCapabilities{
			Streaming: true,
			Tools:     false,
		},
		CostPer1k: 0,
		MaxTokens: 4096,
	}}, nil
}

func (p *MockProvider) Complete(ctx context.Context, req *llmapi.CompletionRequest) (*llmapi.CompletionResponse, error) {
	content := "mock: "
	if len(req.Messages) > 0 {
		content += req.Messages[len(req.Messages)-1].Content
	}
	return &llmapi.CompletionResponse{
		ID:    "mock",
		Model: req.Model,
		Message: llmapi.Message{
			Role:    "assistant",
			Content: content,
		},
		TokensUsed: llmapi.TokenUsage{TotalTokens: len(content) / 4},
	}, nil
}

func (p *MockProvider) StreamComplete(ctx context.Context, req *llmapi.CompletionRequest, handler llmapi.StreamHandler) (*llmapi.CompletionResponse, error) {
	// Deterministic token stream.
	parts := []string{"Hello", ", ", "world", "!\n", "This ", "is ", "a ", "mock ", "stream.\n"}
	var full strings.Builder
	for _, s := range parts {
		select {
		case <-ctx.Done():
			handler.OnError(ctx.Err())
			return nil, ctx.Err()
		default:
		}
		handler.OnToken(s)
		full.WriteString(s)
		time.Sleep(15 * time.Millisecond)
	}

	resp := &llmapi.CompletionResponse{
		ID:    "mock-stream",
		Model: req.Model,
		Message: llmapi.Message{Role: "assistant", Content: full.String()},
		ToolCalls: []llmapi.ToolCall{
			{ID: "tool-1", Name: "write_file", Arguments: map[string]any{"path": "testdata/tui-mock.txt", "content": "hello from mock\n", "mkdir": true}},
		},
		TokensUsed: llmapi.TokenUsage{OutputTokens: len(full.String()) / 4, TotalTokens: len(full.String()) / 4},
		StopReason: "stop",
	}
	handler.OnDone(resp)
	return resp, nil
}
