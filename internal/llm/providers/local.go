package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llmapi"
)

// LocalProvider implements Provider for local LLM models (Ollama, LM Studio, etc.)
type LocalProvider struct {
	baseURL string
	models  []llmapi.ModelInfo
	client   *http.Client
}

// LocalConfig holds local model provider configuration
type LocalConfig struct {
	Enabled bool
	BaseURL string
}

// NewLocalProvider creates a new local provider
func NewLocalProvider(cfg LocalConfig) *LocalProvider {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "http://localhost:11434" // Default to Ollama
	}

	return &LocalProvider{
		baseURL: baseURL,
		models:  getLocalModels(),
		client: &http.Client{
			Timeout: 120 * time.Second, // Longer timeout for local models
		},
	}
}

// Name returns provider name
func (p *LocalProvider) Name() string {
	return "Local"
}

// Type returns provider type
func (p *LocalProvider) Type() llmapi.ProviderType {
	return llmapi.ProviderLocal
}

// Complete sends a completion request
func (p *LocalProvider) Complete(ctx context.Context, req *llmapi.CompletionRequest) (*llmapi.CompletionResponse, error) {
	// Build request body
	requestBody := map[string]interface{}{
		"model":       req.Model,
		"messages":     convertMessagesToLocal(req.Messages),
		"max_tokens":   req.MaxTokens,
		"temperature": req.Temperature,
		"stream":      false,
	}

	if req.System != "" {
		requestBody["system"] = req.System
	}

	if len(req.Tools) > 0 {
		requestBody["tools"] = req.Tools
	}

	// Marshal request
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v1/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("local request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("local request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var localResp LocalResponse
	if err := json.Unmarshal(body, &localResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return p.convertResponse(&localResp), nil
}

// StreamComplete sends a streaming completion request
func (p *LocalProvider) StreamComplete(ctx context.Context, req *llmapi.CompletionRequest, handler llmapi.StreamHandler) (*llmapi.CompletionResponse, error) {
	// Build request body
	requestBody := map[string]interface{}{
		"model":       req.Model,
		"messages":     convertMessagesToLocal(req.Messages),
		"max_tokens":   req.MaxTokens,
		"temperature": req.Temperature,
		"stream":      true,
	}

	if req.System != "" {
		requestBody["system"] = req.System
	}

	if len(req.Tools) > 0 {
		requestBody["tools"] = req.Tools
	}

	// Marshal request
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/v1/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		err := fmt.Errorf("local stream failed: %w", err)
		handler.OnError(err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		err := fmt.Errorf("local stream request failed with status %d: %s", resp.StatusCode, string(body))
		handler.OnError(err)
		return nil, err
	}

	// Read streaming response
	decoder := json.NewDecoder(resp.Body)
	var fullContent strings.Builder

	for {
		var chunk LocalStreamChunk
		if err := decoder.Decode(&chunk); err != nil {
			if err == io.EOF {
				// Stream ended without an explicit finish_reason; finalize whatever we have.
				response := &llmapi.CompletionResponse{
					ID:      generateID(),
					Model:    req.Model,
					Message: llmapi.Message{Role: "assistant", Content: fullContent.String()},
					TokensUsed: llmapi.TokenUsage{
						InputTokens:  0,
						OutputTokens: 0,
						TotalTokens:  0,
					},
					StopReason: "eof",
				}
				handler.OnDone(response)
				return response, nil
			}
			err := fmt.Errorf("local stream decode error: %w", err)
			handler.OnError(err)
			return nil, err
		}

		// Process chunk
		if len(chunk.Choices) > 0 {
			if chunk.Choices[0].Delta.Content != "" {
				handler.OnToken(chunk.Choices[0].Delta.Content)
				fullContent.WriteString(chunk.Choices[0].Delta.Content)
			}
		}

		// Check if complete
		if len(chunk.Choices) > 0 && chunk.Choices[0].FinishReason != "" {
			response := &llmapi.CompletionResponse{
				ID:      chunk.ID,
				Model:    chunk.Model,
				Message: llmapi.Message{
					Role:    "assistant",
					Content: fullContent.String(),
				},
				TokensUsed: llmapi.TokenUsage{
					InputTokens:  chunk.Usage.PromptTokens,
					OutputTokens: chunk.Usage.CompletionTokens,
					TotalTokens:  chunk.Usage.TotalTokens,
				},
				StopReason: chunk.Choices[0].FinishReason,
			}
			handler.OnDone(response)
			return response, nil
		}
	}
}

// ListModels returns available local models
func (p *LocalProvider) ListModels(ctx context.Context) ([]llmapi.ModelInfo, error) {
	// Try to fetch models from endpoint
	httpReq, err := http.NewRequestWithContext(ctx, "GET", p.baseURL+"/v1/models", nil)
	if err != nil {
		return p.models, nil
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return p.models, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return p.models, nil
	}

	var modelsResp LocalModelsResponse
	if err := json.Unmarshal(body, &modelsResp); err != nil {
		return p.models, nil
	}

	// Convert to ModelInfo
	var models []llmapi.ModelInfo
	for _, model := range modelsResp.Data {
		models = append(models, llmapi.ModelInfo{
			ID:   model.ID,
			Name:  model.ID,
			Provider: llmapi.ProviderLocal,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0, // Local models are free
			MaxTokens:  8192,
		})
	}

	if len(models) > 0 {
		return models, nil
	}

	return p.models, nil
}

// IsAvailable checks if provider is available
func (p *LocalProvider) IsAvailable(ctx context.Context) bool {
	// Try to connect to endpoint
	httpReq, err := http.NewRequestWithContext(ctx, "GET", p.baseURL+"/v1/models", nil)
	if err != nil {
		return false
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

// convertResponse converts local response to standard format
func (p *LocalProvider) convertResponse(resp *LocalResponse) *llmapi.CompletionResponse {
	var content string
	if len(resp.Choices) > 0 {
		content = resp.Choices[0].Message.Content
	}

	// Extract tool calls
	var toolCalls []llmapi.ToolCall
	if len(resp.Choices) > 0 && len(resp.Choices[0].Message.ToolCalls) > 0 {
		for _, tc := range resp.Choices[0].Message.ToolCalls {
			toolCalls = append(toolCalls, llmapi.ToolCall{
				ID:   tc.ID,
				Name:  tc.Function.Name,
				Arguments: tc.Function.Arguments,
			})
		}
	}

	stopReason := "stop"
	if len(resp.Choices) > 0 && resp.Choices[0].FinishReason != "" {
		stopReason = resp.Choices[0].FinishReason
	}

	return &llmapi.CompletionResponse{
		ID:      resp.ID,
		Model:    resp.Model,
		Message: llmapi.Message{
			Role:    "assistant",
			Content: content,
		},
		ToolCalls: toolCalls,
		TokensUsed: llmapi.TokenUsage{
			InputTokens:  resp.Usage.PromptTokens,
			OutputTokens: resp.Usage.CompletionTokens,
			TotalTokens: resp.Usage.TotalTokens,
		},
		StopReason: stopReason,
	}
}

// convertMessagesToLocal converts messages to local format
func convertMessagesToLocal(messages []llmapi.Message) []map[string]string {
	var result []map[string]string

	for _, msg := range messages {
		result = append(result, map[string]string{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}

	return result
}

// getLocalModels returns default local models
func getLocalModels() []llmapi.ModelInfo {
	return []llmapi.ModelInfo{
		{
			ID:   "llama3.2",
			Name:  "Llama 3.2",
			Provider: llmapi.ProviderLocal,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0,
			MaxTokens:  8192,
		},
		{
			ID:   "llama3.1",
			Name:  "Llama 3.1",
			Provider: llmapi.ProviderLocal,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0,
			MaxTokens:  8192,
		},
		{
			ID:   "mistral-nemo",
			Name:  "Mistral Nemo",
			Provider: llmapi.ProviderLocal,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0,
			MaxTokens:  8192,
		},
		{
			ID:   "codellama",
			Name:  "CodeLlama",
			Provider: llmapi.ProviderLocal,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0,
			MaxTokens:  8192,
		},
	}
}

// LocalResponse represents a local API response
type LocalResponse struct {
	ID      string       `json:"id"`
	Model   string       `json:"model"`
	Choices []LocalChoice `json:"choices"`
	Usage   LocalUsage   `json:"usage"`
}

// LocalStreamChunk represents a streaming chunk
type LocalStreamChunk struct {
	ID      string         `json:"id"`
	Model   string         `json:"model"`
	Choices []LocalChoice  `json:"choices"`
	Usage   LocalUsage     `json:"usage,omitempty"`
}

// LocalChoice represents a choice in response
type LocalChoice struct {
	Index        int          `json:"index"`
	Message      LocalMessage `json:"message,omitempty"`
	Delta        LocalDelta   `json:"delta,omitempty"`
	FinishReason string       `json:"finish_reason"`
}

// LocalMessage represents a message
type LocalMessage struct {
	Role      string            `json:"role"`
	Content   string            `json:"content"`
	ToolCalls []LocalToolCall   `json:"tool_calls,omitempty"`
}

// LocalDelta represents a delta in streaming
type LocalDelta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

// LocalToolCall represents a tool call
type LocalToolCall struct {
	ID       string             `json:"id"`
	Type     string             `json:"type"`
	Function LocalToolFunction `json:"function"`
}

// LocalToolFunction represents a tool function
type LocalToolFunction struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// LocalUsage represents token usage
type LocalUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens  int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// LocalModelsResponse represents models response
type LocalModelsResponse struct {
	Object string       `json:"object"`
	Data   []LocalModel `json:"data"`
}

// LocalModel represents a model
type LocalModel struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}
