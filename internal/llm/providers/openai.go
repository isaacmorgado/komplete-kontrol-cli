package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/sashabaranov/go-openai"
	"github.com/komplete-kontrol/cli/internal/llmapi"
)

// OpenAIProvider implements Provider for OpenAI API
type OpenAIProvider struct {
	client   *openai.Client
	apiKey   string
	baseURL   string
	models   []llmapi.ModelInfo
}

// OpenAIConfig holds OpenAI provider configuration
type OpenAIConfig struct {
	APIKey  string
	BaseURL  string
}

// NewOpenAIProvider creates a new OpenAI provider
func NewOpenAIProvider(cfg OpenAIConfig) *OpenAIProvider {
	config := openai.DefaultConfig(cfg.APIKey)
	if cfg.BaseURL != "" {
		config.BaseURL = cfg.BaseURL
	}

	return &OpenAIProvider{
		client:  openai.NewClientWithConfig(config),
		apiKey:  cfg.APIKey,
		baseURL:  config.BaseURL,
		models:  getOpenAIModels(),
	}
}

// Name returns the provider name
func (p *OpenAIProvider) Name() string {
	return "OpenAI"
}

// Type returns the provider type
func (p *OpenAIProvider) Type() llmapi.ProviderType {
	return llmapi.ProviderOpenAI
}

// Complete sends a completion request
func (p *OpenAIProvider) Complete(ctx context.Context, req *llmapi.CompletionRequest) (*llmapi.CompletionResponse, error) {
	// Convert messages to OpenAI format
	var messages []openai.ChatCompletionMessage
	if req.System != "" {
		messages = append(messages, openai.ChatCompletionMessage{Role: "system", Content: req.System})
	}
	for _, msg := range req.Messages {
		if msg.Role == "system" {
			continue
		}
		messages = append(messages, openai.ChatCompletionMessage{Role: msg.Role, Content: msg.Content})
	}

	// Convert tools to OpenAI format
	var tools []openai.Tool
	if len(req.Tools) > 0 {
		tools = make([]openai.Tool, len(req.Tools))
		for i, tool := range req.Tools {
			tools[i] = openai.Tool{
				Type:     "function",
				Function: &openai.FunctionDefinition{
					Name:        tool.Name,
					Description: tool.Description,
					Parameters:  tool.InputSchema,
				},
			}
		}
	}

	// Create request
	openaiReq := openai.ChatCompletionRequest{
		Model:       req.Model,
		Messages:    messages,
		MaxTokens:   req.MaxTokens,
		Temperature: float32(req.Temperature),
		Tools:       tools,
	}

	// Send request
	resp, err := p.client.CreateChatCompletion(ctx, openaiReq)
	if err != nil {
		return nil, fmt.Errorf("openai request failed: %w", err)
	}

	// Convert response
	return p.convertResponse(resp), nil
}

// StreamComplete sends a streaming completion request
func (p *OpenAIProvider) StreamComplete(ctx context.Context, req *llmapi.CompletionRequest, handler llmapi.StreamHandler) (*llmapi.CompletionResponse, error) {
	// Convert messages to OpenAI format
	var messages []openai.ChatCompletionMessage
	if req.System != "" {
		messages = append(messages, openai.ChatCompletionMessage{Role: "system", Content: req.System})
	}
	for _, msg := range req.Messages {
		if msg.Role == "system" {
			continue
		}
		messages = append(messages, openai.ChatCompletionMessage{Role: msg.Role, Content: msg.Content})
	}

	// Convert tools to OpenAI format
	var tools []openai.Tool
	if len(req.Tools) > 0 {
		tools = make([]openai.Tool, len(req.Tools))
		for i, tool := range req.Tools {
			tools[i] = openai.Tool{
				Type:     "function",
				Function: &openai.FunctionDefinition{
					Name:        tool.Name,
					Description: tool.Description,
					Parameters:  tool.InputSchema,
				},
			}
		}
	}

	// Create streaming request
	openaiReq := openai.ChatCompletionRequest{
		Model:       req.Model,
		Messages:    messages,
		MaxTokens:   req.MaxTokens,
		Temperature: float32(req.Temperature),
		Tools:       tools,
		Stream:      true,
	}

	// Send streaming request
	stream, err := p.client.CreateChatCompletionStream(ctx, openaiReq)
	if err != nil {
		handler.OnError(fmt.Errorf("openai stream failed: %w", err))
		return nil, err
	}
	defer stream.Close()

	var fullContent strings.Builder
	var toolCalls []llmapi.ToolCall
	var id string
	var model string

	for {
		resp, err := stream.Recv()
		if err != nil {
			handler.OnError(fmt.Errorf("openai stream recv error: %w", err))
			return nil, err
		}
		id = resp.ID
		model = resp.Model

		// Content delta
		if resp.Choices[0].Delta.Content != "" {
			handler.OnToken(resp.Choices[0].Delta.Content)
			fullContent.WriteString(resp.Choices[0].Delta.Content)
		}

		// Tool calls (arguments are JSON string)
		if len(resp.Choices[0].Delta.ToolCalls) > 0 {
			for _, tc := range resp.Choices[0].Delta.ToolCalls {
				toolCalls = append(toolCalls, llmapi.ToolCall{
					ID:        tc.ID,
					Name:      tc.Function.Name,
					Arguments: parseJSONArgs(tc.Function.Arguments),
				})
			}
		}

		if resp.Choices[0].FinishReason != "" {
			// Stream complete
			response := &llmapi.CompletionResponse{
				ID:      id,
				Model:   model,
				Message: llmapi.Message{
					Role:    "assistant",
					Content: fullContent.String(),
				},
				ToolCalls: toolCalls,
				TokensUsed: llmapi.TokenUsage{},
				StopReason: string(resp.Choices[0].FinishReason),
			}
			handler.OnDone(response)
			return response, nil
		}
	}
}

// ListModels returns available OpenAI models
func (p *OpenAIProvider) ListModels(ctx context.Context) ([]llmapi.ModelInfo, error) {
	return p.models, nil
}

// IsAvailable checks if the provider is available
func (p *OpenAIProvider) IsAvailable(ctx context.Context) bool {
	if p.apiKey == "" {
		return false
	}

	// Simple health check
	req, err := http.NewRequestWithContext(ctx, "GET", p.baseURL+"/v1/models", nil)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := &http.Client{Timeout: 5 * 1000000000} // 5 seconds
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized
}

// convertResponse converts OpenAI response to standard format
func (p *OpenAIProvider) convertResponse(resp openai.ChatCompletionResponse) *llmapi.CompletionResponse {
	// Extract content
	var content string
	if len(resp.Choices) > 0 {
		content = resp.Choices[0].Message.Content
	}

	// Extract tool calls
	var toolCalls []llmapi.ToolCall
	if len(resp.Choices) > 0 && len(resp.Choices[0].Message.ToolCalls) > 0 {
		for _, toolCall := range resp.Choices[0].Message.ToolCalls {
			toolCalls = append(toolCalls, llmapi.ToolCall{
				ID:        toolCall.ID,
				Name:      toolCall.Function.Name,
				Arguments: parseJSONArgs(toolCall.Function.Arguments),
			})
		}
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
			TotalTokens:  resp.Usage.PromptTokens + resp.Usage.CompletionTokens,
		},
		StopReason: string(resp.Choices[0].FinishReason),
	}
}

// getOpenAIModels returns available OpenAI models
func getOpenAIModels() []llmapi.ModelInfo {
	return []llmapi.ModelInfo{
		{
			ID:   "gpt-4o",
			Name:  "GPT-4o",
			Provider: llmapi.ProviderOpenAI,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.005,
			MaxTokens:  128000,
		},
		{
			ID:   "gpt-4o-mini",
			Name:  "GPT-4o Mini",
			Provider: llmapi.ProviderOpenAI,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.00015,
			MaxTokens:  128000,
		},
		{
			ID:   "gpt-4-turbo",
			Name:  "GPT-4 Turbo",
			Provider: llmapi.ProviderOpenAI,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     false,
				Multimodal: false,
			},
			CostPer1k: 0.01,
			MaxTokens:  128000,
		},
	}
}

func parseJSONArgs(s string) map[string]any {
	if strings.TrimSpace(s) == "" {
		return map[string]any{}
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		return map[string]any{"_raw": s}
	}
	return m
}
