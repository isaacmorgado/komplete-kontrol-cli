package providers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"github.com/komplete-kontrol/cli/internal/llmapi"
	"google.golang.org/api/option"
)

// GeminiProvider implements Provider for Google Gemini API
type GeminiProvider struct {
	client   *genai.Client
	apiKey   string
	models   []llmapi.ModelInfo
}

// GeminiConfig holds Gemini provider configuration
type GeminiConfig struct {
	APIKey  string
	BaseURL  string
}

// NewGeminiProvider creates a new Gemini provider
func NewGeminiProvider(cfg GeminiConfig) *GeminiProvider {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(cfg.APIKey))
	if err != nil {
		// Return provider with nil client - will be caught by IsAvailable
		return &GeminiProvider{
			client: nil,
			apiKey: cfg.APIKey,
			models: getGeminiModels(),
		}
	}

	return &GeminiProvider{
		client: client,
		apiKey: cfg.APIKey,
		models: getGeminiModels(),
	}
}

// Name returns the provider name
func (p *GeminiProvider) Name() string {
	return "Gemini"
}

// Type returns the provider type
func (p *GeminiProvider) Type() llmapi.ProviderType {
	return llmapi.ProviderGemini
}

// Complete sends a completion request
func (p *GeminiProvider) Complete(ctx context.Context, req *llmapi.CompletionRequest) (*llmapi.CompletionResponse, error) {
	if p.client == nil {
		return nil, fmt.Errorf("gemini client not initialized")
	}

	// Get the model
	model := p.client.GenerativeModel(req.Model)

	// Build conversation as a single prompt (minimal, non-stub implementation)
	prompt := buildGeminiPrompt(req.System, req.Messages)

	// Set generation config
	model.SetTemperature(float32(req.Temperature))
	model.SetMaxOutputTokens(int32(req.MaxTokens))

	// Send request
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("gemini request failed: %w", err)
	}

	// Convert response
	return p.convertResponse(resp, req.Model), nil
}

// StreamComplete sends a streaming completion request
func (p *GeminiProvider) StreamComplete(ctx context.Context, req *llmapi.CompletionRequest, handler llmapi.StreamHandler) (*llmapi.CompletionResponse, error) {
	if p.client == nil {
		return nil, fmt.Errorf("gemini client not initialized")
	}

	// Get the model
	model := p.client.GenerativeModel(req.Model)

	// Build conversation as a single prompt
	prompt := buildGeminiPrompt(req.System, req.Messages)

	// Set generation config
	model.SetTemperature(float32(req.Temperature))
	model.SetMaxOutputTokens(int32(req.MaxTokens))

	// Send streaming request
	stream := model.GenerateContentStream(ctx, genai.Text(prompt))

	var fullContent strings.Builder

	for {
		resp, err := stream.Next()
		if err == io.EOF {
			// Stream complete
			response := &llmapi.CompletionResponse{
				ID:      generateID(),
				Model:    req.Model,
				Message: llmapi.Message{
					Role:    "assistant",
					Content: fullContent.String(),
				},
				TokensUsed: llmapi.TokenUsage{
					InputTokens:  0, // Gemini doesn't provide this in streaming
					OutputTokens: 0,
					TotalTokens: 0,
				},
				StopReason: "stop",
			}
			handler.OnDone(response)
			return response, nil
		}

		if err != nil {
			err := fmt.Errorf("gemini stream error: %w", err)
			handler.OnError(err)
			return nil, err
		}

		// Extract content from response
		for _, cand := range resp.Candidates {
			for _, part := range cand.Content.Parts {
				if text, ok := part.(genai.Text); ok {
					handler.OnToken(string(text))
					fullContent.WriteString(string(text))
				}
			}
		}
	}
}

// ListModels returns available Gemini models
func (p *GeminiProvider) ListModels(ctx context.Context) ([]llmapi.ModelInfo, error) {
	return p.models, nil
}

// IsAvailable checks if the provider is available
func (p *GeminiProvider) IsAvailable(ctx context.Context) bool {
	if p.apiKey == "" || p.client == nil {
		return false
	}

	// Simple health check
	req, err := http.NewRequestWithContext(ctx, "GET", "https://generativelanguage.googleapis.com/v1beta/models", nil)
	if err != nil {
		return false
	}
	req.Header.Set("x-goog-api-key", p.apiKey)

	client := &http.Client{Timeout: 5 * 1000000000} // 5 seconds
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized
}

// convertResponse converts Gemini response to standard format
func (p *GeminiProvider) convertResponse(resp *genai.GenerateContentResponse, model string) *llmapi.CompletionResponse {
	// Extract content
	var content string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			content = string(text)
		}
	}

	// Get token usage
	var inputTokens, outputTokens int
	if resp.UsageMetadata != nil {
		inputTokens = int(resp.UsageMetadata.PromptTokenCount)
		outputTokens = int(resp.UsageMetadata.CandidatesTokenCount)
	}

	return &llmapi.CompletionResponse{
		ID:      generateID(),
		Model:    model,
		Message: llmapi.Message{
			Role:    "assistant",
			Content: content,
		},
		TokensUsed: llmapi.TokenUsage{
			InputTokens:  inputTokens,
			OutputTokens: outputTokens,
			TotalTokens: inputTokens + outputTokens,
		},
		StopReason: "stop",
	}
}

func buildGeminiPrompt(system string, messages []llmapi.Message) string {
	var b strings.Builder
	if strings.TrimSpace(system) != "" {
		b.WriteString("System: ")
		b.WriteString(system)
		b.WriteString("\n\n")
	}
	for _, m := range messages {
		if m.Role == "system" {
			continue
		}
		role := m.Role
		if len(role) > 0 {
			role = strings.ToUpper(role[:1]) + role[1:]
		}
		b.WriteString(role)
		b.WriteString(": ")
		b.WriteString(m.Content)
		b.WriteString("\n")
	}
	return b.String()
}

// getGeminiModels returns available Gemini models
func getGeminiModels() []llmapi.ModelInfo {
	return []llmapi.ModelInfo{
		{
			ID:   "gemini-2.5-pro",
			Name:  "Gemini 2.5 Pro",
			Provider: llmapi.ProviderGemini,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.0035,
			MaxTokens:  1000000,
		},
		{
			ID:   "gemini-2.0-flash",
			Name:  "Gemini 2.0 Flash",
			Provider: llmapi.ProviderGemini,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.000075,
			MaxTokens:  1000000,
		},
		{
			ID:   "gemini-1.5-pro",
			Name:  "Gemini 1.5 Pro",
			Provider: llmapi.ProviderGemini,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.0035,
			MaxTokens:  2000000,
		},
		{
			ID:   "gemini-1.5-flash",
			Name:  "Gemini 1.5 Flash",
			Provider: llmapi.ProviderGemini,
			Capabilities: llmapi.ModelCapabilities{
				Streaming:   true,
				Tools:      true,
				Vision:     true,
				Multimodal: true,
			},
			CostPer1k: 0.000075,
			MaxTokens:  1000000,
		},
	}
}

// generateID generates a unique ID for responses
func generateID() string {
	return fmt.Sprintf("gemini-%d", time.Now().UnixNano())
}
