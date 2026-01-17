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

// TavilyHandler implements ToolHandler for Tavily search
type TavilyHandler struct {
	config config.TavilyConfig
	client *http.Client
}

// NewTavilyHandler creates a new Tavily handler
func NewTavilyHandler(cfg config.TavilyConfig) *TavilyHandler {
	return &TavilyHandler{
		config: cfg,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// Execute performs a Tavily search
func (h *TavilyHandler) Execute(ctx context.Context, input map[string]any) (*ToolResult, error) {
	if h.config.APIKey == "" {
		return nil, fmt.Errorf("Tavily API key not configured")
	}

	// Extract query
	query, ok := input["query"].(string)
	if !ok {
		return nil, fmt.Errorf("query is required")
	}

	// Extract max_results
	maxResults := h.config.MaxResults
	if mr, ok := input["max_results"].(float64); ok {
		maxResults = int(mr)
	}

	// Extract search_depth
	searchDepth := h.config.SearchDepth
	if sd, ok := input["search_depth"].(string); ok {
		searchDepth = sd
	}

	// Build request body
	reqBody := map[string]any{
		"api_key":     h.config.APIKey,
		"query":       query,
		"max_results":  maxResults,
		"search_depth": searchDepth,
		"include_answer": true,
		"include_raw_content": true,
		"include_images": false,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.tavily.com/search", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tavily request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse response
	var tavilyResp TavilyResponse
	if err := json.Unmarshal(body, &tavilyResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tavily returned status %d: %s", resp.StatusCode, string(body))
	}

	return &ToolResult{
		Success: true,
		Data:    tavilyResp,
		Error:    "",
	}, nil
}

// TavilyResponse represents Tavily API response
type TavilyResponse struct {
	Answer   string       `json:"answer"`
	Query    string       `json:"query"`
	Results  []TavilyResult `json:"results"`
}

// TavilyResult represents a single search result
type TavilyResult struct {
	Title      string `json:"title"`
	URL        string `json:"url"`
	Content    string `json:"content"`
	Score      float64 `json:"score"`
	PublishedDate string `json:"publishedDate"`
}

// FormatResponse formats the Tavily response for display
func (h *TavilyHandler) FormatResponse(resp *TavilyResponse) string {
	var builder bytes.Buffer

	if resp.Answer != "" {
		builder.WriteString(fmt.Sprintf("Answer: %s\n\n", resp.Answer))
	}

	builder.WriteString("Results:\n")
	for i, result := range resp.Results {
		if i > 0 {
			builder.WriteString("\n")
		}
		builder.WriteString(fmt.Sprintf("%d. %s", i+1, result.Title))
		builder.WriteString(fmt.Sprintf("   URL: %s\n", result.URL))
		if result.Content != "" {
			// Truncate content for display
			content := result.Content
			if len(content) > 200 {
				content = content[:200] + "..."
			}
			builder.WriteString(fmt.Sprintf("   %s\n", content))
		}
	}

	return builder.String()
}

// ValidateInput validates Tavily input
func (h *TavilyHandler) ValidateInput(input map[string]any) error {
	if _, ok := input["query"]; !ok {
		return fmt.Errorf("query is required")
	}

	if query, ok := input["query"].(string); !ok || query == "" {
		return fmt.Errorf("query cannot be empty")
	}

	return nil
}

// GetConfig returns the Tavily configuration
func (h *TavilyHandler) GetConfig() config.TavilyConfig {
	return h.config
}

// SetConfig updates the Tavily configuration
func (h *TavilyHandler) SetConfig(cfg config.TavilyConfig) {
	h.config = cfg
}

// IsEnabled checks if Tavily is enabled
func (h *TavilyHandler) IsEnabled() bool {
	return h.config.Enabled && h.config.APIKey != ""
}

// ReadAll reads all data from a reader
func ReadAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}
