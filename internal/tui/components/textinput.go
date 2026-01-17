package components

import (
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/lipgloss"
	tea "github.com/charmbracelet/bubbletea"
)

// TextInputModel wraps bubbles textinput with custom styling
type TextInputModel struct {
	textInput textinput.Model
	placeholder string
	multiline  bool
	maxLength  int
	mask       bool
	onSubmit   func(string)
	style      lipgloss.Style
}

// SubmitMsg is emitted when the user presses Enter.
// The main TUI model should handle it and trigger async execution.
type SubmitMsg struct {
	Value string
}

// NewTextInputModel creates a new text input model
func NewTextInputModel() *TextInputModel {
	ti := textinput.New()
	ti.Placeholder = "Enter your prompt..."
	ti.Focus()

	tiStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#cdd6f4")).
		Background(lipgloss.Color("#313244")).
		Padding(1)

	return &TextInputModel{
		textInput:  ti,
		placeholder: "Enter your prompt...",
		multiline:  false,
		maxLength:  0,
		mask:       false,
		onSubmit:   nil,
		style:      tiStyle,
	}
}

// Init initializes text input
func (m *TextInputModel) Init() tea.Cmd {
	return textinput.Blink
}

// Update handles messages
func (m *TextInputModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter:
			v := m.textInput.Value()
			m.textInput.Reset()
			m.textInput.Placeholder = m.placeholder
			if m.onSubmit != nil {
				// Never block the Bubbletea update loop.
				go m.onSubmit(v)
			}
			return m, func() tea.Msg { return SubmitMsg{Value: v} }
		case tea.KeyCtrlC:
			return m, tea.Quit
		}
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

// View renders text input
func (m *TextInputModel) View() string {
	return m.style.Render(m.textInput.View())
}

// SetValue sets the input value
func (m *TextInputModel) SetValue(value string) {
	m.textInput.SetValue(value)
}

// GetValue returns the input value
func (m *TextInputModel) GetValue() string {
	return m.textInput.Value()
}

// Focus focuses the input
func (m *TextInputModel) Focus() {
	m.textInput.Focus()
}

// Blur blurs the input
func (m *TextInputModel) Blur() {
	m.textInput.Blur()
}

// SetPlaceholder sets the placeholder text
func (m *TextInputModel) SetPlaceholder(placeholder string) {
	m.placeholder = placeholder
	m.textInput.Placeholder = placeholder
}

// SetMaxLength sets the maximum length
func (m *TextInputModel) SetMaxLength(maxLength int) {
	m.maxLength = maxLength
	if maxLength > 0 {
		// Validate length on input
		current := m.textInput.Value()
		if len(current) > maxLength {
			m.textInput.SetValue(current[:maxLength])
		}
	}
}

// SetOnSubmit sets the submit callback
func (m *TextInputModel) SetOnSubmit(onSubmit func(string)) {
	m.onSubmit = onSubmit
}

// Reset clears the input
func (m *TextInputModel) Reset() {
	m.textInput.Reset()
	m.textInput.Placeholder = m.placeholder
}

// CursorPosition returns the cursor position
func (m *TextInputModel) CursorPosition() int {
	return m.textInput.Position()
}

// SetCursorPosition sets the cursor position
func (m *TextInputModel) SetCursorPosition(pos int) {
	m.textInput.SetCursor(pos)
}

// InsertString inserts text at the cursor position
func (m *TextInputModel) InsertString(s string) {
	current := m.textInput.Value()
	pos := m.textInput.Position()
	newValue := current[:pos] + s + current[pos:]
	m.textInput.SetValue(newValue)
	m.textInput.SetCursor(pos + len(s))
}

// DeleteText deletes text at the cursor position
func (m *TextInputModel) DeleteText(length int) {
	current := m.textInput.Value()
	pos := m.textInput.Position()
	newValue := current[:pos] + current[pos+length:]
	m.textInput.SetValue(newValue)
}

// GetPlaceholder returns the placeholder
func (m *TextInputModel) GetPlaceholder() string {
	return m.placeholder
}

// IsMultiline returns if multiline is enabled
func (m *TextInputModel) IsMultiline() bool {
	return m.multiline
}

// SetMultiline sets multiline mode
func (m *TextInputModel) SetMultiline(multiline bool) {
	m.multiline = multiline
}

// GetMaxLength returns the max length
func (m *TextInputModel) GetMaxLength() int {
	return m.maxLength
}

// IsMasked returns if input is masked
func (m *TextInputModel) IsMasked() bool {
	return m.mask
}

// SetMask sets mask mode
func (m *TextInputModel) SetMask(mask bool) {
	m.mask = mask
	if mask {
		m.textInput.EchoMode = textinput.EchoPassword
	} else {
		m.textInput.EchoMode = textinput.EchoNormal
	}
}

// SetStyle sets the style
func (m *TextInputModel) SetStyle(style lipgloss.Style) {
	m.style = style
}

// GetStyle returns the style
func (m *TextInputModel) GetStyle() lipgloss.Style {
	return m.style
}

// Validate validates the input
func (m *TextInputModel) Validate() error {
	value := m.textInput.Value()

	if m.maxLength > 0 && len(value) > m.maxLength {
		return &ValidationError{
			Field:   "input",
			Message: "input exceeds maximum length",
		}
	}

	if m.placeholder != "" && strings.TrimSpace(value) == "" {
		return &ValidationError{
			Field:   "input",
			Message: "input cannot be empty",
		}
	}

	return nil
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
