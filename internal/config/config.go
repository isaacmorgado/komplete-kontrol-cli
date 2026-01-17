package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

// Config represents the application configuration
type Config struct {
	Version   string `yaml:"version"`
	Models    ModelsConfig `yaml:"models"`
	Tools     ToolsConfig `yaml:"tools"`
	UI        UIConfig `yaml:"ui"`
	Verification VerificationConfig `yaml:"verification"`
	Alignment  AlignmentConfig `yaml:"alignment"`
}

// ModelsConfig represents model configuration
type ModelsConfig struct {
	Default      string        `yaml:"default"`
	Providers    ProvidersConfig `yaml:"providers"`
	FallbackChain []string      `yaml:"fallback_chain"`
}

// ProvidersConfig represents provider configurations
type ProvidersConfig struct {
	Anthropic AnthropicProviderConfig `yaml:"anthropic"`
	OpenAI     OpenAIProviderConfig     `yaml:"openai"`
	Gemini     GeminiProviderConfig     `yaml:"gemini"`
	VSCode      VSCodeProviderConfig     `yaml:"vscode"`
	Local       LocalProviderConfig      `yaml:"local"`
}

// AnthropicProviderConfig represents Anthropic configuration
type AnthropicProviderConfig struct {
	APIKey  string `yaml:"api_key"`
	BaseURL  string `yaml:"base_url,omitempty"`
}

// OpenAIProviderConfig represents OpenAI configuration
type OpenAIProviderConfig struct {
	APIKey  string `yaml:"api_key"`
	BaseURL  string `yaml:"base_url,omitempty"`
}

// GeminiProviderConfig represents Gemini configuration
type GeminiProviderConfig struct {
	APIKey  string `yaml:"api_key"`
	BaseURL  string `yaml:"base_url,omitempty"`
}

// VSCodeProviderConfig represents VS Code LLM configuration
type VSCodeProviderConfig struct {
	Enabled bool `yaml:"enabled"`
}

// LocalProviderConfig represents local model configuration
type LocalProviderConfig struct {
	Enabled  bool   `yaml:"enabled"`
	BaseURL  string `yaml:"base_url,omitempty"`
}

// ToolsConfig represents tools configuration
type ToolsConfig struct {
	Tavily      TavilyConfig `yaml:"tavily"`
	Base44      Base44Config `yaml:"base44"`
	MCPServers  []MCPServerConfig `yaml:"mcp_servers"`
}

// TavilyConfig represents Tavily configuration
type TavilyConfig struct {
	Enabled     bool   `yaml:"enabled"`
	APIKey      string `yaml:"api_key"`
	MaxResults  int    `yaml:"max_results,omitempty"`
	SearchDepth string `yaml:"search_depth,omitempty"`
}

// Base44Config represents Base44 configuration
type Base44Config struct {
	Enabled     bool   `yaml:"enabled"`
	APIKey      string `yaml:"api_key"`
	WorkspaceID string `yaml:"workspace_id,omitempty"`
}

// MCPServerConfig represents MCP server configuration
type MCPServerConfig struct {
	ID   string `yaml:"id"`
	Name string `yaml:"name"`
	URL  string `yaml:"url"`
}

// UIConfig represents UI configuration
type UIConfig struct {
	Theme      string `yaml:"theme"`
	Streaming  bool   `yaml:"streaming"`
	ShowCost   bool   `yaml:"show_cost"`
	ShowTokens bool   `yaml:"show_tokens"`
}

// VerificationConfig represents verification configuration
type VerificationConfig struct {
	AutoVerify  bool `yaml:"auto_verify"`
	AutoRepair  bool `yaml:"auto_repair"`
	MaxRetries  int  `yaml:"max_retries"`
}

// AlignmentConfig represents alignment layer configuration
type AlignmentConfig struct {
	Enabled  bool   `yaml:"enabled"`
	Port     int    `yaml:"port,omitempty"`
	Host     string `yaml:"host,omitempty"`
}

// Manager manages configuration loading and saving
type Manager struct {
	config     *Config
	configPath string
	mu         sync.RWMutex
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Version: "2.0",
		Models: ModelsConfig{
			Default:      "claude-sonnet-4.5",
			FallbackChain: []string{
				"claude-sonnet-4.5",
				"claude-3.5-haiku",
				"gpt-4o-mini",
			},
			Providers: ProvidersConfig{
				Anthropic: AnthropicProviderConfig{},
				OpenAI:     OpenAIProviderConfig{},
				Gemini:     GeminiProviderConfig{},
				VSCode:      VSCodeProviderConfig{Enabled: false},
				Local:       LocalProviderConfig{Enabled: false},
			},
		},
		Tools: ToolsConfig{
			Tavily: TavilyConfig{
				Enabled:     false,
				MaxResults:  10,
				SearchDepth: "basic",
			},
			Base44: Base44Config{
				Enabled: false,
			},
			MCPServers: []MCPServerConfig{},
		},
		UI: UIConfig{
			Theme:      "dark",
			Streaming:  true,
			ShowCost:   true,
			ShowTokens: true,
		},
		Verification: VerificationConfig{
			AutoVerify:  true,
			AutoRepair:  true,
			MaxRetries:  3,
		},
		Alignment: AlignmentConfig{
			Enabled: false,
			Port:     0,
		},
	}
}

// NewManager creates a new configuration manager
func NewManager() *Manager {
	return &Manager{
		config:     DefaultConfig(),
		configPath: getConfigPath(),
	}
}

// Load loads configuration from file
func (m *Manager) Load() error {
	m.mu.Lock()
	// Check if config file exists
	if _, err := os.Stat(m.configPath); os.IsNotExist(err) {
		// Create default config.
		// IMPORTANT: do not call Save() while holding the lock (Save also locks).
		m.config = DefaultConfig()
		m.mu.Unlock()
		return m.Save()
	}
	defer m.mu.Unlock()

	// Read config file
	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	// Parse YAML
	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	m.config = &config
	return nil
}

// Save saves configuration to file
func (m *Manager) Save() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Ensure directory exists
	configDir := filepath.Dir(m.configPath)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Marshal YAML
	data, err := yaml.Marshal(m.config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	// Write config file
	if err := os.WriteFile(m.configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	return nil
}

// Get returns the current configuration
func (m *Manager) Get() *Config {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.config
}

// Set updates the configuration
func (m *Manager) Set(config *Config) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.config = config
	return m.Save()
}

// Update updates a specific configuration value
func (m *Manager) Update(updater func(*Config)) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	updater(m.config)
	return m.Save()
}

// GetModels returns the models configuration
func (m *Manager) GetModels() *ModelsConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return &m.config.Models
}

// GetTools returns the tools configuration
func (m *Manager) GetTools() *ToolsConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return &m.config.Tools
}

// GetUI returns the UI configuration
func (m *Manager) GetUI() *UIConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return &m.config.UI
}

// GetVerification returns the verification configuration
func (m *Manager) GetVerification() *VerificationConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return &m.config.Verification
}

// GetAlignment returns the alignment configuration
func (m *Manager) GetAlignment() *AlignmentConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return &m.config.Alignment
}

// SetModel sets the default model
func (m *Manager) SetModel(modelID string) error {
	return m.Update(func(cfg *Config) {
		cfg.Models.Default = modelID
	})
}

// SetTheme sets the UI theme
func (m *Manager) SetTheme(theme string) error {
	return m.Update(func(cfg *Config) {
		cfg.UI.Theme = theme
	})
}

// SetStreaming enables or disables streaming
func (m *Manager) SetStreaming(enabled bool) error {
	return m.Update(func(cfg *Config) {
		cfg.UI.Streaming = enabled
	})
}

// SetAPIKey sets an API key for a provider
func (m *Manager) SetAPIKey(provider string, apiKey string) error {
	var updateErr error
	updateErr = m.Update(func(cfg *Config) {
		switch provider {
		case "anthropic":
			cfg.Models.Providers.Anthropic.APIKey = apiKey
		case "openai":
			cfg.Models.Providers.OpenAI.APIKey = apiKey
		case "gemini":
			cfg.Models.Providers.Gemini.APIKey = apiKey
		default:
			updateErr = fmt.Errorf("unknown provider: %s", provider)
		}
	})
	if updateErr != nil {
		return updateErr
	}
	return nil
}

// SetToolEnabled enables or disables a tool
func (m *Manager) SetToolEnabled(tool string, enabled bool) error {
	var updateErr error
	updateErr = m.Update(func(cfg *Config) {
		switch tool {
		case "tavily":
			cfg.Tools.Tavily.Enabled = enabled
		case "base44":
			cfg.Tools.Base44.Enabled = enabled
		default:
			updateErr = fmt.Errorf("unknown tool: %s", tool)
		}
	})
	if updateErr != nil {
		return updateErr
	}
	return nil
}

// SetToolAPIKey sets an API key for a tool
func (m *Manager) SetToolAPIKey(tool string, apiKey string) error {
	var updateErr error
	updateErr = m.Update(func(cfg *Config) {
		switch tool {
		case "tavily":
			cfg.Tools.Tavily.APIKey = apiKey
		case "base44":
			cfg.Tools.Base44.APIKey = apiKey
		default:
			updateErr = fmt.Errorf("unknown tool: %s", tool)
		}
	})
	if updateErr != nil {
		return updateErr
	}
	return nil
}

// EnableAlignment enables the alignment layer
func (m *Manager) EnableAlignment(port int) error {
	return m.Update(func(cfg *Config) {
		cfg.Alignment.Enabled = true
		cfg.Alignment.Port = port
	})
}

// DisableAlignment disables the alignment layer
func (m *Manager) DisableAlignment() error {
	return m.Update(func(cfg *Config) {
		cfg.Alignment.Enabled = false
	})
}

// IsAlignmentEnabled returns if alignment is enabled
func (m *Manager) IsAlignmentEnabled() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.config.Alignment.Enabled
}

// GetConfigPath returns the configuration file path
func (m *Manager) GetConfigPath() string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.configPath
}

// getConfigPath returns the default configuration file path
func getConfigPath() string {
	// Check for KOMPLETE_CONFIG env var
	if configPath := os.Getenv("KOMPLETE_CONFIG"); configPath != "" {
		return configPath
	}

	// Default to ~/.komplete/config.yaml
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "./config.yaml"
	}
	return filepath.Join(homeDir, ".komplete", "config.yaml")
}

// Validate validates the configuration
func (m *Manager) Validate() error {
	cfg := m.Get()

	// Check version
	if cfg.Version == "" {
		return fmt.Errorf("config version is required")
	}

	// Check default model
	if cfg.Models.Default == "" {
		return fmt.Errorf("default model is required")
	}

	return nil
}

// GetVersion returns the configuration version
func (m *Manager) GetVersion() string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.config.Version
}

// SetVersion sets the configuration version
func (m *Manager) SetVersion(version string) error {
	return m.Update(func(cfg *Config) {
		cfg.Version = version
	})
}
