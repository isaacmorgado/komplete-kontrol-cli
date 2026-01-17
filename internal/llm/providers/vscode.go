package providers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llmapi"
)

// VSCodeProvider implements Provider for VS Code LLM integration
type VSCodeProvider struct {
	baseURL string
	models  []llmapi.ModelInfo
	client   *http.Client
}

// VSCodeConfig holds VS Code provider configuration
type VSCodeConfig struct {
	Enabled bool
}

// NewVSCodeProvider creates a new VS Code provider
func NewVSCodeProvider(cfg VSCodeConfig) *VSCodeProvider {
	return &VSCodeProvider{
		baseURL: "http://localhost:11434", // Default to Ollama-compatible endpoint
		models:  getVSCodeModels(),
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Name returns provider name
func (p *VSCodeProvider) Name() string {
	return "VSCode"
}

// Type returns provider type
func (p *VSCodeProvider) Type() llmapi.ProviderType {
	return llmapi.ProviderVSCode
}

// Complete sends a completion request
func (p *VSCodeProvider) Complete(ctx context.Context, req *llmapi.CompletionRequest) (*llmapi.CompletionResponse, error) {
	// Build request body
	requestBody := map[string]interface{}{
		"model":       req.Model,
		"messages":     convertMessagesToVSCode(req.Messages),
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
		return nil, fmt.Errorf("vscode request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("vscode request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var vscodeResp VSCodeResponse
	if err := json.Unmarshal(body, &vscodeResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return p.convertResponse(&vscodeResp), nil
}

// StreamComplete sends a streaming completion request
func (p *VSCodeProvider) StreamComplete(ctx context.Context, req *llmapi.CompletionRequest, handler llmapi.StreamHandler) (*llmapi.CompletionResponse, error) {
	// Build request body
	requestBody := map[string]interface{}{
		"model":       req.Model,
		"messages":     convertMessagesToVSCode(req.Messages),
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
		err := fmt.Errorf("vscode stream failed: %w", err)
		handler.OnError(err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		err := fmt.Errorf("vscode stream request failed with status %d: %s", resp.StatusCode, string(body))
		handler.OnError(err)
		return nil, err
	}

	// Read streaming response.
	// OpenAI-compatible streaming is typically SSE lines: `data: {...}` and `data: [DONE]`.
	// Some local servers also emit newline-delimited JSON without the `data:` prefix.
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var fullContent strings.Builder
	var lastID, lastModel string
	var usage VSCodeUsage
	var stopReason string

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "data:") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		}
		if line == "[DONE]" {
			stopReason = "done"
			break
		}

		var chunk VSCodeStreamChunk
		if err := json.Unmarshal([]byte(line), &chunk); err != nil {
			err := fmt.Errorf("vscode stream decode error: %w", err)
			handler.OnError(err)
			return nil, err
		}

		if chunk.ID != "" {
			lastID = chunk.ID
		}
		if chunk.Model != "" {
			lastModel = chunk.Model
		}
		if chunk.Usage.TotalTokens != 0 {
			usage = chunk.Usage
		}

		if len(chunk.Choices) > 0 {
			if chunk.Choices[0].Delta.Content != "" {
				handler.OnToken(chunk.Choices[0].Delta.Content)
				fullContent.WriteString(chunk.Choices[0].Delta.Content)
			}
			if chunk.Choices[0].FinishReason != "" {
				stopReason = chunk.Choices[0].FinishReason
				break
			}
		}
	}
	if err := scanner.Err(); err != nil && err != io.EOF {
		err := fmt.Errorf("vscode stream read error: %w", err)
		handler.OnError(err)
		return nil, err
	}

	if lastID == "" {
		lastID = generateID()
	}
	if lastModel == "" {
		lastModel = req.Model
	}
	if stopReason == "" {
		stopReason = "eof"
	}

	response := &llmapi.CompletionResponse{
		ID:    lastID,
		Model: lastModel,
		Message: llmapi.Message{
			Role:    "assistant",
			Content: fullContent.String(),
		},
		TokensUsed: llmapi.TokenUsage{
			InputTokens:  usage.PromptTokens,
			OutputTokens: usage.CompletionTokens,
			TotalTokens:  usage.TotalTokens,
		},
		StopReason: stopReason,
	}
	if stopReason == "eof" {
		// The endpoint did not send a final chunk with usage/finish_reason.
		response.TokensUsed = llmapi.TokenUsage{}
	}
	if stopReason == "done" {
		response.StopReason = "stop"
	}

	handler.OnDone(response)
	return response, nil
}

// ListModels returns available VS Code models
func (p *VSCodeProvider) ListModels(ctx context.Context) ([]llmapi.ModelInfo, error) {
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

	var modelsResp VSCodeModelsResponse
	if err := json.Unmarshal(body, &modelsResp); err != nil {
		return p.models, nil
	}

	// Convert to ModelInfo
	var models []llmapi.ModelInfo
	for _, model := range modelsResp.Data {
		models = append(models, llmapi.ModelInfo{
			ID:   model.ID,
			Name:  model.ID,
			Provider: llmapi.ProviderVSCode,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0, // VS Code models are free
			MaxTokens:  8192,
		})
	}

	if len(models) > 0 {
		return models, nil
	}

	return p.models, nil
}

// IsAvailable checks if provider is available
func (p *VSCodeProvider) IsAvailable(ctx context.Context) bool {
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

// convertResponse converts VS Code response to standard format
func (p *VSCodeProvider) convertResponse(resp *VSCodeResponse) *llmapi.CompletionResponse {
	var content string
	if len(resp.Choices) > 0 {
		content = resp.Choices[0].Message.Content
	}

	// Extract tool calls
	var toolCalls []llmapi.ToolCall
	if len(resp.Choices) > 0 && len(resp.Choices[0].Message.ToolCalls) > 0 {
		for _, tc := range resp.Choices[0].Message.ToolCalls {
			args := parseToolArgs(tc.Function.Arguments)
			toolCalls = append(toolCalls, llmapi.ToolCall{
				ID:   tc.ID,
				Name:  tc.Function.Name,
				Arguments: args,
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

// convertMessagesToVSCode converts messages to VS Code format
func convertMessagesToVSCode(messages []llmapi.Message) []map[string]string {
	var result []map[string]string

	for _, msg := range messages {
		result = append(result, map[string]string{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}

	return result
}

// getVSCodeModels returns default VS Code models
func getVSCodeModels() []llmapi.ModelInfo {
	return []llmapi.ModelInfo{
		{
			ID:   "vscode-default",
			Name:  "VS Code Default",
			Provider: llmapi.ProviderVSCode,
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

// VSCodeResponse represents a VS Code API response
type VSCodeResponse struct {
	ID      string        `json:"id"`
	Model   string        `json:"model"`
	Choices []VSCodeChoice `json:"choices"`
	Usage   VSCodeUsage   `json:"usage"`
}

// VSCodeStreamChunk represents a streaming chunk
type VSCodeStreamChunk struct {
	ID      string          `json:"id"`
	Model   string          `json:"model"`
	Choices []VSCodeChoice  `json:"choices"`
	Usage   VSCodeUsage     `json:"usage,omitempty"`
}

// VSCodeChoice represents a choice in response
type VSCodeChoice struct {
	Index        int             `json:"index"`
	Message      VSCodeMessage    `json:"message,omitempty"`
	Delta        VSCodeDelta     `json:"delta,omitempty"`
	FinishReason string           `json:"finish_reason"`
}

// VSCodeMessage represents a message
type VSCodeMessage struct {
	Role      string          `json:"role"`
	Content   string          `json:"content"`
	ToolCalls []VSCodeToolCall `json:"tool_calls,omitempty"`
}

// VSCodeDelta represents a delta in streaming
type VSCodeDelta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

// VSCodeToolCall represents a tool call
type VSCodeToolCall struct {
	ID       string             `json:"id"`
	Type     string             `json:"type"`
	Function VSCodeToolFunction `json:"function"`
}

// VSCodeToolFunction represents a tool function
type VSCodeToolFunction struct {
	Name      string                 `json:"name"`
	Arguments json.RawMessage        `json:"arguments"`
}

func parseToolArgs(raw json.RawMessage) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	// OpenAI usually encodes function.arguments as a JSON string.
	if len(raw) > 0 && raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err == nil {
			return parseJSONArgs(s)
		}
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err == nil {
		return m
	}
	return map[string]any{"_raw": string(raw)}
}

// VSCodeUsage represents token usage
type VSCodeUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens  int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// VSCodeModelsResponse represents models response
type VSCodeModelsResponse struct {
	Object string       `json:"object"`
	Data   []VSCodeModel `json:"data"`
}

// VSCodeModel represents a model
type VSCodeModel struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
}
