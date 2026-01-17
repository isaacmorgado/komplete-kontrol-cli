package llm

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/komplete-kontrol/cli/internal/config"
	"github.com/komplete-kontrol/cli/internal/llm/providers"
)

// ModelManager manages multiple LLM providers
type ModelManager struct {
	config         *config.Config
	providers      map[ProviderType]Provider
	modelIndex     map[string]ProviderType
	currentModel   string
	fallbackChain  []string
	mu             sync.RWMutex
}

// NewModelManager creates a new model manager
func NewModelManager(cfg *config.Config) *ModelManager {
	mm := &ModelManager{
		config:        cfg,
		providers:     make(map[ProviderType]Provider),
		modelIndex:    make(map[string]ProviderType),
		currentModel:  cfg.Models.Default,
		fallbackChain: cfg.Models.FallbackChain,
	}

	mm.initializeProviders()
	mm.rebuildModelIndex()
	return mm
}

// initializeProviders initializes all configured providers
func (mm *ModelManager) initializeProviders() {
	// Mock provider (deterministic) - enabled via env var.
	// Useful for smoke tests and CI when real API keys are not present.
	if strings.ToLower(strings.TrimSpace(os.Getenv("KOMPLETE_USE_MOCK_PROVIDER"))) == "1" {
		mm.providers[ProviderLocal] = providers.NewMockProvider()
	}

	// Anthropic
	if mm.config.Models.Providers.Anthropic.APIKey != "" {
		mm.providers[ProviderAnthropic] = providers.NewAnthropicProvider(providers.AnthropicConfig{
			APIKey:   mm.config.Models.Providers.Anthropic.APIKey,
			BaseURL:  mm.config.Models.Providers.Anthropic.BaseURL,
		})
	}

	// OpenAI
	if mm.config.Models.Providers.OpenAI.APIKey != "" {
		mm.providers[ProviderOpenAI] = providers.NewOpenAIProvider(providers.OpenAIConfig{
			APIKey:  mm.config.Models.Providers.OpenAI.APIKey,
			BaseURL: mm.config.Models.Providers.OpenAI.BaseURL,
		})
	}

	// Gemini
	if mm.config.Models.Providers.Gemini.APIKey != "" {
		mm.providers[ProviderGemini] = providers.NewGeminiProvider(providers.GeminiConfig{
			APIKey:  mm.config.Models.Providers.Gemini.APIKey,
			BaseURL: mm.config.Models.Providers.Gemini.BaseURL,
		})
	}

	// VS Code
	if mm.config.Models.Providers.VSCode.Enabled {
		mm.providers[ProviderVSCode] = providers.NewVSCodeProvider(providers.VSCodeConfig{
			Enabled: mm.config.Models.Providers.VSCode.Enabled,
		})
	}

	// Local
	if mm.config.Models.Providers.Local.Enabled {
		mm.providers[ProviderLocal] = providers.NewLocalProvider(providers.LocalConfig{
			Enabled: mm.config.Models.Providers.Local.Enabled,
			BaseURL: mm.config.Models.Providers.Local.BaseURL,
		})
	}
}

// rebuildModelIndex builds an ID->provider lookup table.
//
// This avoids brittle string-parsing routing (e.g. local models like "llama3.2"
// would otherwise route to Anthropic).
func (mm *ModelManager) rebuildModelIndex() {
	mm.mu.Lock()
	defer mm.mu.Unlock()

	mm.modelIndex = make(map[string]ProviderType)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	for pType, p := range mm.providers {
		models, err := p.ListModels(ctx)
		if err != nil {
			continue
		}
		for _, m := range models {
			if strings.TrimSpace(m.ID) == "" {
				continue
			}
			mm.modelIndex[m.ID] = pType
		}
	}
}

// GetProvider returns a provider for the given type
func (mm *ModelManager) GetProvider(providerType ProviderType) (Provider, error) {
	mm.mu.RLock()
	defer mm.mu.RUnlock()

	provider, ok := mm.providers[providerType]
	if !ok {
		return nil, fmt.Errorf("provider %s not configured", providerType)
	}

	return provider, nil
}

// GetProviderForModel returns the provider for a given model ID
func (mm *ModelManager) GetProviderForModel(modelID string) (Provider, error) {
	mm.mu.RLock()
	if pType, ok := mm.modelIndex[modelID]; ok {
		mm.mu.RUnlock()
		return mm.GetProvider(pType)
	}
	mm.mu.RUnlock()

	// Fallback: Parse model ID to determine provider
	providerType := mm.parseProviderFromModelID(modelID)
	return mm.GetProvider(providerType)
}

// parseProviderFromModelID extracts provider type from model ID
func (mm *ModelManager) parseProviderFromModelID(modelID string) ProviderType {
	// Conservative heuristic based on model ID patterns.
	// Prefer modelIndex routing above; this function is a fallback only.
	lower := strings.ToLower(modelID)
	if strings.Contains(lower, "claude") {
		return ProviderAnthropic
	}
	if strings.Contains(lower, "gpt") {
		return ProviderOpenAI
	}
	if strings.Contains(lower, "gemini") {
		return ProviderGemini
	}
	if strings.Contains(lower, "vscode") {
		return ProviderVSCode
	}
	if strings.Contains(lower, "local") {
		return ProviderLocal
	}
	return ProviderAnthropic
}

// Complete sends a completion request
func (mm *ModelManager) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	provider, err := mm.GetProviderForModel(req.Model)
	if err != nil {
		return nil, err
	}

	return provider.Complete(ctx, req)
}

// StreamComplete sends a streaming completion request
func (mm *ModelManager) StreamComplete(ctx context.Context, req *CompletionRequest, handler StreamHandler) (*CompletionResponse, error) {
	provider, err := mm.GetProviderForModel(req.Model)
	if err != nil {
		return nil, err
	}

	return provider.StreamComplete(ctx, req, handler)
}

// ListModels returns all available models from all providers
func (mm *ModelManager) ListModels(ctx context.Context) ([]ModelInfo, error) {
	mm.mu.RLock()
	defer mm.mu.RUnlock()

	var allModels []ModelInfo
	for _, provider := range mm.providers {
		if provider.IsAvailable(ctx) {
			models, err := provider.ListModels(ctx)
			if err != nil {
				continue
			}
			allModels = append(allModels, models...)
		}
	}

	return allModels, nil
}

// SetCurrentModel sets the current model
func (mm *ModelManager) SetCurrentModel(modelID string) {
	mm.mu.Lock()
	defer mm.mu.Unlock()
	mm.currentModel = modelID
	mm.config.Models.Default = modelID
}

// GetCurrentModel returns the current model
func (mm *ModelManager) GetCurrentModel() string {
	mm.mu.RLock()
	defer mm.mu.RUnlock()
	return mm.currentModel
}

// GetFallbackChain returns the fallback chain
func (mm *ModelManager) GetFallbackChain() []string {
	mm.mu.RLock()
	defer mm.mu.RUnlock()
	return mm.fallbackChain
}

// SetFallbackChain sets the fallback chain
func (mm *ModelManager) SetFallbackChain(chain []string) {
	mm.mu.Lock()
	defer mm.mu.Unlock()
	mm.fallbackChain = chain
	mm.config.Models.FallbackChain = chain
}

// CompleteWithFallback tries to complete with fallback on error
func (mm *ModelManager) CompleteWithFallback(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	modelsToTry := append([]string{req.Model}, mm.fallbackChain...)

	for _, modelID := range modelsToTry {
		provider, err := mm.GetProviderForModel(modelID)
		if err != nil {
			continue
		}

		if !provider.IsAvailable(ctx) {
			continue
		}

		reqCopy := *req
		reqCopy.Model = modelID

		resp, err := provider.Complete(ctx, &reqCopy)
		if err == nil {
			return resp, nil
		}

		// Continue to next model in fallback chain
	}

	return nil, fmt.Errorf("all models in fallback chain unavailable")
}

// IsProviderAvailable checks if a provider is available
func (mm *ModelManager) IsProviderAvailable(providerType ProviderType) bool {
	provider, ok := mm.providers[providerType]
	if !ok {
		return false
	}
	return provider.IsAvailable(context.Background())
}

// ListProviders returns all configured providers
func (mm *ModelManager) ListProviders() []ProviderType {
	mm.mu.RLock()
	defer mm.mu.RUnlock()

	var providers []ProviderType
	for pType := range mm.providers {
		providers = append(providers, pType)
	}
	return providers
}
