package tools

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/komplete-kontrol/cli/internal/config"
)

func TestTavilyIntegration(t *testing.T) {
	apiKey := os.Getenv("TAVILY_API_KEY")
	if apiKey == "" {
		t.Skip("TAVILY_API_KEY not set")
	}

	handler := NewTavilyHandler(config.TavilyConfig{
		Enabled:     true,
		APIKey:      apiKey,
		MaxResults:  1,
		SearchDepth: "basic",
	})

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	result, err := handler.Execute(ctx, map[string]any{
		"query": "Komplete Kontrol CLI",
	})
	if err != nil {
		t.Fatalf("tavily request failed: %v", err)
	}
	if result == nil || !result.Success {
		t.Fatalf("unexpected Tavily result: %+v", result)
	}
}
