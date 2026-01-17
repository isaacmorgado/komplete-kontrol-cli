package components

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
)

// OutputPanelModel represents the output panel component
type OutputPanelModel struct {
	messages        []OutputMessage
	maxHeight      int
	autoScroll     bool
	width          int
	syntaxHighlight bool
	style          lipgloss.Style
}

// OutputMessage represents a message in the output panel
type OutputMessage struct {
	ID         string
	Type        MessageType
	Content     string
	Timestamp   time.Time
	ToolName    string
	ToolResult  any
	LineCount   int
}

// MessageType represents the type of output message
type MessageType string

const (
	MessageTypeUser      MessageType = "user"
	MessageTypeAssistant MessageType = "assistant"
	MessageTypeSystem    MessageType = "system"
	MessageTypeTool      MessageType = "tool"
	MessageTypeError     MessageType = "error"
)

// NewOutputPanelModel creates a new output panel model
func NewOutputPanelModel() *OutputPanelModel {
	panelStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#cdd6f4")).
		Background(lipgloss.Color("#1e1e2e")).
		Padding(1)

	return &OutputPanelModel{
		messages:        []OutputMessage{},
		maxHeight:      100,
		autoScroll:     true,
		syntaxHighlight: true,
		style:          panelStyle,
	}
}

// Init initializes the output panel
func (m *OutputPanelModel) Init() tea.Cmd {
	return nil
}

// Update handles messages
func (m *OutputPanelModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
	case AddMessageMsg:
		m.addMessage(msg.Message)
	case ClearMessagesMsg:
		m.messages = []OutputMessage{}
	}

	return m, nil
}

// View renders the output panel
func (m *OutputPanelModel) View() string {
	if len(m.messages) == 0 {
		return m.style.Render("No messages yet...")
	}

	var builder strings.Builder
	for _, msg := range m.messages {
		builder.WriteString(m.renderMessage(msg))
		builder.WriteString("\n")
	}

	return m.style.Width(m.width).Render(builder.String())
}

// AddMessage adds a message to the output panel
func (m *OutputPanelModel) AddMessage(msgType MessageType, content string) {
	msg := OutputMessage{
		ID:       generateID(),
		Type:     msgType,
		Content:   content,
		Timestamp: time.Now(),
		LineCount: strings.Count(content, "\n") + 1,
	}
	m.addMessage(msg)
}

// addMessage adds a message and handles scrolling
func (m *OutputPanelModel) addMessage(msg OutputMessage) {
	m.messages = append(m.messages, msg)

	// Trim to max height if needed
	if m.maxHeight > 0 && len(m.messages) > m.maxHeight {
		m.messages = m.messages[len(m.messages)-m.maxHeight:]
	}
}

// Clear clears all messages
func (m *OutputPanelModel) Clear() {
	m.messages = []OutputMessage{}
}

// GetMessages returns all messages
func (m *OutputPanelModel) GetMessages() []OutputMessage {
	return m.messages
}

// renderMessage renders a single message
func (m *OutputPanelModel) renderMessage(msg OutputMessage) string {
	timestamp := msg.Timestamp.Format("15:04:05")
	prefix := ""
	color := ""

	switch msg.Type {
	case MessageTypeUser:
		prefix = ">"
		color = "#89b4fa"
	case MessageTypeAssistant:
		prefix = "●"
		color = "#a6e3a1"
	case MessageTypeSystem:
		prefix = "ℹ"
		color = "#6c7086"
	case MessageTypeTool:
		prefix = "⚙"
		color = "#f9e2af"
		if msg.ToolName != "" {
			prefix = fmt.Sprintf("⚙ %s", msg.ToolName)
		}
	case MessageTypeError:
		prefix = "✗"
		color = "#f38ba8"
	}

	content := msg.Content

	// Apply syntax highlighting for code blocks
	if m.syntaxHighlight && strings.Contains(content, "```") {
		content = m.highlightCode(content)
	}

	// Format message
	msgStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(color))
	timestampStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#6c7086"))

	return fmt.Sprintf("%s %s %s",
		timestampStyle.Render(timestamp),
		msgStyle.Render(prefix),
		content,
	)
}

// highlightCode applies basic syntax highlighting to code blocks
func (m *OutputPanelModel) highlightCode(content string) string {
	lines := strings.Split(content, "\n")
	var result []string

	inCodeBlock := false
	lang := ""

	for _, line := range lines {
		if strings.HasPrefix(line, "```") {
			inCodeBlock = !inCodeBlock
			if inCodeBlock {
				lang = strings.TrimPrefix(line, "```")
				result = append(result, lipgloss.NewStyle().
					Foreground(lipgloss.Color("#f9e2af")).
					Render(fmt.Sprintf("```%s", lang)))
			} else {
				result = append(result, "```")
			}
			continue
		}

		if inCodeBlock {
			// Simple syntax highlighting for Go
			if lang == "go" || lang == "golang" {
				line = m.highlightGoLine(line)
			}
			result = append(result, line)
		} else {
			result = append(result, line)
		}
	}

	return strings.Join(result, "\n")
}

// highlightGoLine applies basic Go syntax highlighting
func (m *OutputPanelModel) highlightGoLine(line string) string {
	// Keywords
	keywords := []string{"func", "var", "const", "type", "struct", "return", "if", "else", "for", "range"}
	for _, kw := range keywords {
		if strings.Contains(line, kw) {
			line = strings.ReplaceAll(line, kw,
				lipgloss.NewStyle().Foreground(lipgloss.Color("#cba6f7")).Render(kw))
		}
	}

	// Strings
	if strings.Contains(line, `"`) {
		parts := strings.Split(line, `"`)
		for i, part := range parts {
			if i%2 == 1 {
				parts[i] = lipgloss.NewStyle().Foreground(lipgloss.Color("#a6e3a1")).Render(`"` + part + `"`)
			}
		}
		line = strings.Join(parts, `"`)
	}

	return line
}

// AddMessageMsg is a message to add a message
type AddMessageMsg struct {
	Message OutputMessage
}

// ClearMessagesMsg is a message to clear all messages
type ClearMessagesMsg struct{}

// generateID generates a unique ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
