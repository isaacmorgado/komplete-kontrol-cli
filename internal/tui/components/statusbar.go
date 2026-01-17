package components

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
)

// StatusBarModel represents the status bar component
type StatusBarModel struct {
	Width       int
	modelName   string
	provider    string
	tokensUsed  int
	cost        float64
	status      Status
	streaming   bool
	style       lipgloss.Style
}

// Status represents the execution status
type Status string

const (
	StatusIdle     Status = "idle"
	StatusRunning  Status = "running"
	StatusComplete Status = "complete"
	StatusError    Status = "error"
)

// NewStatusBarModel creates a new status bar model
func NewStatusBarModel() *StatusBarModel {
	barStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Background(lipgloss.Color("#1e1e2e")).
		Padding(0, 1)

	return &StatusBarModel{
		modelName:  "Claude Sonnet 4.5",
		provider:   "Anthropic",
		tokensUsed: 0,
		cost:       0.0,
		status:     StatusIdle,
		streaming:  false,
		style:      barStyle,
	}
}

// Init initializes the status bar
func (m *StatusBarModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *StatusBarModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.Width = msg.Width
	case SetModelMsg:
		m.modelName = msg.Name
		m.provider = msg.Provider
	case UpdateTokensMsg:
		m.tokensUsed = msg.Count
	case UpdateCostMsg:
		m.cost = msg.Cost
	case SetStatusMsg:
		m.status = msg.Status
		m.streaming = msg.Streaming
	}

	return m, nil
}

// View renders the status bar
func (m *StatusBarModel) View() string {
	if m.Width == 0 {
		return ""
	}

	// Status indicator
	statusIcon := "○"
	statusColor := lipgloss.Color("#6c7086")
	switch m.status {
	case StatusRunning:
		statusIcon = "●"
		statusColor = lipgloss.Color("#f9e2af")
	case StatusComplete:
		statusIcon = "✓"
		statusColor = lipgloss.Color("#a6e3a1")
	case StatusError:
		statusIcon = "✗"
		statusColor = lipgloss.Color("#f38ba8")
	}

	// Streaming indicator
	streamingIcon := ""
	if m.streaming {
		streamingIcon = "⚡"
	}

	// Build status line parts
	statusPart := lipgloss.NewStyle().Foreground(statusColor).Render(statusIcon)
	modelPart := fmt.Sprintf("%s (%s)", m.modelName, m.provider)
	tokensPart := fmt.Sprintf("Tokens: %s", formatNumber(m.tokensUsed))
	costPart := fmt.Sprintf("Cost: $%.4f", m.cost)
	streamingPart := lipgloss.NewStyle().Foreground(lipgloss.Color("#f9e2af")).Render(streamingIcon)

	// Calculate available width for each part
	availableWidth := m.Width - 4 // padding
	partWidth := availableWidth / 4

	// Truncate parts if needed
	modelPart = truncateText(modelPart, partWidth)
	tokensPart = truncateText(tokensPart, partWidth)
	costPart = truncateText(costPart, partWidth)

	// Join parts
	line := strings.Join([]string{
		statusPart,
		modelPart,
		tokensPart,
		costPart,
		streamingPart,
	}, " │ ")

	return m.style.Width(m.Width).Render(line)
}

// SetModel sets the model information
func (m *StatusBarModel) SetModel(name, provider string) {
	m.modelName = name
	m.provider = provider
}

// SetStatus sets the status
func (m *StatusBarModel) SetStatus(status Status, streaming bool) {
	m.status = status
	m.streaming = streaming
}

// UpdateTokens updates the token count
func (m *StatusBarModel) UpdateTokens(count int) {
	m.tokensUsed = count
}

// UpdateCost updates the cost
func (m *StatusBarModel) UpdateCost(cost float64) {
	m.cost = cost
}

// UpdateWidth updates the width
func (m *StatusBarModel) UpdateWidth(width int) {
	m.Width = width
}

// SetModelMsg is a message to set the model
type SetModelMsg struct {
	Name     string
	Provider string
}

// UpdateTokensMsg is a message to update token count
type UpdateTokensMsg struct {
	Count int
}

// UpdateCostMsg is a message to update cost
type UpdateCostMsg struct {
	Cost float64
}

// SetStatusMsg is a message to set status
type SetStatusMsg struct {
	Status    Status
	Streaming bool
}

// formatNumber formats a number with commas
func formatNumber(n int) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}

	var result []string
	for i := len(s); i > 0; i -= 3 {
		start := max(0, i-3)
		result = append([]string{s[start:i]}, result...)
	}
	return strings.Join(result, ",")
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// truncateText truncates text to fit within width
func truncateText(text string, width int) string {
	if len(text) <= width {
		return text
	}
	return text[:width-3] + "..."
}
