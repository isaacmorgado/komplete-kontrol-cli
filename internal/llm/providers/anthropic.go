package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/anthropics/anthropic-sdk-go/shared/constant"
	"github.com/komplete-kontrol/cli/internal/llmapi"
)

// AnthropicProvider implements Provider for Anthropic API
type AnthropicProvider struct {
	client  anthropic.Client
	apiKey  string
	baseURL string
	models  []llmapi.ModelInfo
}

// AnthropicConfig holds Anthropic provider configuration
type AnthropicConfig struct {
	APIKey  string
	BaseURL string
}

// NewAnthropicProvider creates a new Anthropic provider
func NewAnthropicProvider(cfg AnthropicConfig) *AnthropicProvider {
	opts := []option.RequestOption{option.WithAPIKey(cfg.APIKey)}
	if cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.BaseURL))
	}
	client := anthropic.NewClient(opts...)

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.anthropic.com"
	}

	return &AnthropicProvider{
		client:  client,
		apiKey:  cfg.APIKey,
		baseURL: baseURL,
		models:  getAnthropicModels(),
	}
}

// Name returns the provider name
func (p *AnthropicProvider) Name() string {
	return "Anthropic"
}

// Type returns the provider type
func (p *AnthropicProvider) Type() llmapi.ProviderType {
	return llmapi.ProviderAnthropic
}

// Complete sends a completion request
func (p *AnthropicProvider) Complete(ctx context.Context, req *llmapi.CompletionRequest) (*llmapi.CompletionResponse, error) {
	// Convert messages to Anthropic format (system prompt is top-level, not a role)
	var messages []anthropic.MessageParam
	for _, msg := range req.Messages {
		if msg.Role == "system" {
			continue
		}
		if msg.Role == "assistant" {
			messages = append(messages, anthropic.NewAssistantMessage(anthropic.NewTextBlock(msg.Content)))
		} else {
			messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(msg.Content)))
		}
	}
	if len(messages) == 0 {
		// Ensure we always send at least one user message.
		messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock("")))
	}

	// Convert tools to Anthropic format
	var tools []anthropic.ToolUnionParam
	if len(req.Tools) > 0 {
		tools = make([]anthropic.ToolUnionParam, 0, len(req.Tools))
		for _, tool := range req.Tools {
			u := anthropic.ToolUnionParamOfTool(
				anthropic.ToolInputSchemaParam{
					Type:       constant.Object("object"),
					Properties: tool.InputSchema["properties"],
					Required:   asStringSlice(tool.InputSchema["required"]),
				},
				tool.Name,
			)
			if tool.Description != "" && u.OfTool != nil {
				u.OfTool.Description = anthropic.String(tool.Description)
			}
			tools = append(tools, u)
		}
	}

	// Create request
	anthropicReq := anthropic.MessageNewParams{
		Model:     anthropic.Model(req.Model),
		Messages:  messages,
		MaxTokens: int64(req.MaxTokens),
		Tools:     tools,
	}
	if req.System != "" {
		anthropicReq.System = []anthropic.TextBlockParam{{
			Type: constant.Text("text"),
			Text: req.System,
		}}
	}
	if req.Temperature != 0 {
		anthropicReq.Temperature = anthropic.Float(req.Temperature)
	}

	// Send request
	resp, err := p.client.Messages.New(ctx, anthropicReq)
	if err != nil {
		return nil, fmt.Errorf("anthropic request failed: %w", err)
	}

	// Convert response
	return p.convertResponse(resp), nil
}

// StreamComplete sends a streaming completion request
func (p *AnthropicProvider) StreamComplete(ctx context.Context, req *llmapi.CompletionRequest, handler llmapi.StreamHandler) (*llmapi.CompletionResponse, error) {
	// Convert messages to Anthropic format (system prompt is top-level, not a role)
	var messages []anthropic.MessageParam
	for _, msg := range req.Messages {
		if msg.Role == "system" {
			continue
		}
		if msg.Role == "assistant" {
			messages = append(messages, anthropic.NewAssistantMessage(anthropic.NewTextBlock(msg.Content)))
		} else {
			messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(msg.Content)))
		}
	}
	if len(messages) == 0 {
		messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock("")))
	}

	// Convert tools to Anthropic format
	var tools []anthropic.ToolUnionParam
	if len(req.Tools) > 0 {
		tools = make([]anthropic.ToolUnionParam, 0, len(req.Tools))
		for _, tool := range req.Tools {
			u := anthropic.ToolUnionParamOfTool(
				anthropic.ToolInputSchemaParam{
					Type:       constant.Object("object"),
					Properties: tool.InputSchema["properties"],
					Required:   asStringSlice(tool.InputSchema["required"]),
				},
				tool.Name,
			)
			if tool.Description != "" && u.OfTool != nil {
				u.OfTool.Description = anthropic.String(tool.Description)
			}
			tools = append(tools, u)
		}
	}

	anthropicReq := anthropic.MessageNewParams{
		Model:     anthropic.Model(req.Model),
		Messages:  messages,
		MaxTokens: int64(req.MaxTokens),
		Tools:     tools,
	}
	if req.System != "" {
		anthropicReq.System = []anthropic.TextBlockParam{{
			Type: constant.Text("text"),
			Text: req.System,
		}}
	}
	if req.Temperature != 0 {
		anthropicReq.Temperature = anthropic.Float(req.Temperature)
	}

	// Send streaming request
	stream := p.client.Messages.NewStreaming(ctx, anthropicReq)

	var fullContent strings.Builder
	var toolCalls []llmapi.ToolCall

	var message anthropic.Message
	for stream.Next() {
		event := stream.Current()
		if err := message.Accumulate(event); err != nil {
			handler.OnError(fmt.Errorf("anthropic stream accumulate error: %w", err))
			return nil, err
		}

		if event.Type == "content_block_delta" {
			delta := event.AsContentBlockDelta()
			if delta.Delta.Type == "text_delta" && delta.Delta.Text != "" {
				handler.OnToken(delta.Delta.Text)
				fullContent.WriteString(delta.Delta.Text)
			}
		}

		if event.Type == "message_stop" {
			break
		}
	}
	if err := stream.Err(); err != nil {
		handler.OnError(fmt.Errorf("anthropic stream error: %w", err))
		return nil, err
	}

	// Extract tool calls from accumulated message
	for _, block := range message.Content {
		if block.Type == "tool_use" {
			args := map[string]any{}
			_ = json.Unmarshal(block.Input, &args)
			toolCalls = append(toolCalls, llmapi.ToolCall{ID: block.ID, Name: block.Name, Arguments: args})
		}
	}

	resp := &llmapi.CompletionResponse{
		ID:    message.ID,
		Model: string(message.Model),
		Message: llmapi.Message{
			Role:    "assistant",
			Content: fullContent.String(),
		},
		ToolCalls: toolCalls,
		TokensUsed: llmapi.TokenUsage{
			InputTokens:  int(message.Usage.InputTokens),
			OutputTokens: int(message.Usage.OutputTokens),
			TotalTokens:  int(message.Usage.InputTokens + message.Usage.OutputTokens),
		},
		StopReason: string(message.StopReason),
	}
	handler.OnDone(resp)
	return resp, nil
}

// ListModels returns available Anthropic models
func (p *AnthropicProvider) ListModels(ctx context.Context) ([]llmapi.ModelInfo, error) {
	return p.models, nil
}

// IsAvailable checks if the provider is available
func (p *AnthropicProvider) IsAvailable(ctx context.Context) bool {
	if p.apiKey == "" {
		return false
	}

	// Simple health check
	req, err := http.NewRequestWithContext(ctx, "GET", p.baseURL+"/v1/messages", nil)
	if err != nil {
		return false
	}
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 5 * 1000000000} // 5 seconds
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized
}

// convertResponse converts Anthropic response to standard format
func (p *AnthropicProvider) convertResponse(resp *anthropic.Message) *llmapi.CompletionResponse {
	// Extract content
	var content string
	if len(resp.Content) > 0 {
		// Prefer first text block; tool_use blocks have no text.
		for _, block := range resp.Content {
			if block.Type == "text" {
				content = block.Text
				break
			}
		}
	}

	// Extract tool calls
	var toolCalls []llmapi.ToolCall
	for _, block := range resp.Content {
		if block.Type == "tool_use" {
			args := map[string]any{}
			_ = json.Unmarshal(block.Input, &args)
			toolCalls = append(toolCalls, llmapi.ToolCall{ID: block.ID, Name: block.Name, Arguments: args})
		}
	}

	return &llmapi.CompletionResponse{
		ID:    resp.ID,
		Model: string(resp.Model),
		Message: llmapi.Message{
			Role:    "assistant",
			Content: content,
		},
		ToolCalls: toolCalls,
		TokensUsed: llmapi.TokenUsage{
			InputTokens:  int(resp.Usage.InputTokens),
			OutputTokens: int(resp.Usage.OutputTokens),
			TotalTokens:  int(resp.Usage.InputTokens + resp.Usage.OutputTokens),
		},
		StopReason: string(resp.StopReason),
	}
}

// getAnthropicModels returns available Anthropic models
func getAnthropicModels() []llmapi.ModelInfo {
	return []llmapi.ModelInfo{
		{
			ID:       "claude-sonnet-4-5-20250514",
			Name:     "Claude Sonnet 4.5",
			Provider: llmapi.ProviderAnthropic,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:  true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.003,
			MaxTokens: 200000,
		},
		{
			ID:       "claude-3-5-sonnet-20241022",
			Name:     "Claude 3.5 Sonnet",
			Provider: llmapi.ProviderAnthropic,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:  true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.003,
			MaxTokens: 200000,
		},
		{
			ID:       "claude-3-5-haiku-20241022",
			Name:     "Claude 3.5 Haiku",
			Provider: llmapi.ProviderAnthropic,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:  true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.00025,
			MaxTokens: 200000,
		},
		{
			ID:       "claude-3-haiku-20240307",
			Name:     "Claude 3 Haiku",
			Provider: llmapi.ProviderAnthropic,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:  true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.00025,
			MaxTokens: 200000,
		},
	}
}

func asStringSlice(v any) []string {
	if v == nil {
		return nil
	}
	arr, ok := v.([]any)
	if !ok {
		// some callers may already provide []string
		if ss, ok := v.([]string); ok {
			return ss
		}
		return nil
	}
	out := make([]string, 0, len(arr))
	for _, x := range arr {
		if s, ok := x.(string); ok {
			out = append(out, s)
		}
	}
	return out
}
