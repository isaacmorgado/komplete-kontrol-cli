package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/komplete-kontrol/cli/internal/config"
)

// Base44Handler implements ToolHandler for Base44 API
type Base44Handler struct {
	config config.Base44Config
	client *http.Client
}

// NewBase44Handler creates a new Base44 handler
func NewBase44Handler(cfg config.Base44Config) *Base44Handler {
	return &Base44Handler{
		config: cfg,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// Execute performs a Base44 app operation
func (h *Base44Handler) Execute(ctx context.Context, input map[string]any) (*ToolResult, error) {
	if h.config.APIKey == "" {
		return nil, fmt.Errorf("Base44 API key not configured")
	}

	// Extract prompt
	prompt, ok := input["prompt"].(string)
	if !ok {
		return nil, fmt.Errorf("prompt is required")
	}

	// Extract workspace_id
	workspaceID := h.config.WorkspaceID
	if wid, ok := input["workspace_id"].(string); ok {
		workspaceID = wid
	}

	// Build request body
	reqBody := map[string]any{
		"prompt": prompt,
	}

	if workspaceID != "" {
		reqBody["workspace_id"] = workspaceID
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.base44.app/v1/generate", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.config.APIKey)

	// Send request
	resp, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("base44 request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse response
	var base44Resp Base44Response
	if err := json.Unmarshal(body, &base44Resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("base44 returned status %d: %s", resp.StatusCode, string(body))
	}

	return &ToolResult{
		Success: true,
		Data:    base44Resp,
		Error:    "",
	}, nil
}

// Base44Response represents Base44 API response
type Base44Response struct {
	ID       string `json:"id"`
	AppID    string `json:"app_id"`
	Name      string `json:"name"`
	Status    string `json:"status"`
	URL       string `json:"url"`
	CreatedAt string `json:"created_at"`
}

// FormatResponse formats Base44 response for display
func (h *Base44Handler) FormatResponse(resp *Base44Response) string {
	var builder bytes.Buffer

	builder.WriteString(fmt.Sprintf("App ID: %s\n", resp.AppID))
	builder.WriteString(fmt.Sprintf("Name: %s\n", resp.Name))
	builder.WriteString(fmt.Sprintf("Status: %s\n", resp.Status))
	builder.WriteString(fmt.Sprintf("URL: %s\n", resp.URL))
	builder.WriteString(fmt.Sprintf("Created: %s\n", resp.CreatedAt))

	return builder.String()
}

// ValidateInput validates Base44 input
func (h *Base44Handler) ValidateInput(input map[string]any) error {
	if _, ok := input["prompt"]; !ok {
		return fmt.Errorf("prompt is required")
	}

	if prompt, ok := input["prompt"].(string); !ok || prompt == "" {
		return fmt.Errorf("prompt cannot be empty")
	}

	return nil
}

// GetConfig returns the Base44 configuration
func (h *Base44Handler) GetConfig() config.Base44Config {
	return h.config
}

// SetConfig updates the Base44 configuration
func (h *Base44Handler) SetConfig(cfg config.Base44Config) {
	h.config = cfg
}

// IsEnabled checks if Base44 is enabled
func (h *Base44Handler) IsEnabled() bool {
	return h.config.Enabled && h.config.APIKey != ""
}
