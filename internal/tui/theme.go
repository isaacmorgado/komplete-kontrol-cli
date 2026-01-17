package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Theme represents the TUI theme
type Theme struct {
	// Colors
	PrimaryColor     lipgloss.Color
	SecondaryColor   lipgloss.Color
	AccentColor      lipgloss.Color
	ErrorColor       lipgloss.Color
	WarningColor    lipgloss.Color
	SuccessColor    lipgloss.Color
	InfoColor        lipgloss.Color

	// Backgrounds
	Background       lipgloss.Color
	PanelBackground lipgloss.Color
	StatusBarBg     lipgloss.Color

	// Styles
	BorderStyle    lipgloss.Border
	BorderStyleDim  lipgloss.Border
	TitleStyle      lipgloss.Style
	BodyStyle       lipgloss.Style
	ErrorStyle      lipgloss.Style
	SuccessStyle    lipgloss.Style
	WarningStyle   lipgloss.Style
	InfoStyle       lipgloss.Style
	CodeStyle       lipgloss.Style
}

// NewTheme creates a new theme
func NewTheme(themeType string) *Theme {
	switch themeType {
	case "light":
		return newLightTheme()
	case "dark":
		return newDarkTheme()
	default:
		return newDarkTheme() // Default to dark
	}
}

// newDarkTheme creates a dark theme
func newDarkTheme() *Theme {
	titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#cba6f7")).Bold(true)
	bodyStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#cdd6f4"))
	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#f38ba8"))
	successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#a6e3a1"))
	warningStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#f9e2af"))
	infoStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#6c7086"))
	codeStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#a6e3a1"))

	return &Theme{
		PrimaryColor:     lipgloss.Color("#89b4fa"),
		SecondaryColor:   lipgloss.Color("#cba6f7"),
		AccentColor:      lipgloss.Color("#f9e2af"),
		ErrorColor:       lipgloss.Color("#f38ba8"),
		WarningColor:    lipgloss.Color("#f9e2af"),
		SuccessColor:    lipgloss.Color("#a6e3a1"),
		InfoColor:        lipgloss.Color("#6c7086"),

		Background:       lipgloss.Color("#1e1e2e"),
		PanelBackground: lipgloss.Color("#313244"),
		StatusBarBg:     lipgloss.Color("#1e1e2e"),

		BorderStyle:    lipgloss.RoundedBorder(),
		BorderStyleDim: lipgloss.HiddenBorder(),
		TitleStyle:     titleStyle,
		BodyStyle:      bodyStyle,
		ErrorStyle:     errorStyle,
		SuccessStyle:   successStyle,
		WarningStyle:  warningStyle,
		InfoStyle:      infoStyle,
		CodeStyle:      codeStyle,
	}
}

// newLightTheme creates a light theme
func newLightTheme() *Theme {
	titleStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#8b5cf6")).Bold(true)
	bodyStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#1f2937"))
	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#ef4444"))
	successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#10b981"))
	warningStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#f59e0b"))
	infoStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#3b82f6"))
	codeStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#8b5cf6"))

	return &Theme{
		PrimaryColor:     lipgloss.Color("#0766d1"),
		SecondaryColor:   lipgloss.Color("#8b5cf6"),
		AccentColor:      lipgloss.Color("#f59e0b"),
		ErrorColor:       lipgloss.Color("#ef4444"),
		WarningColor:    lipgloss.Color("#f59e0b"),
		SuccessColor:    lipgloss.Color("#10b981"),
		InfoColor:        lipgloss.Color("#3b82f6"),

		Background:       lipgloss.Color("#ffffff"),
		PanelBackground: lipgloss.Color("#f3f4f6"),
		StatusBarBg:     lipgloss.Color("#e5e7eb"),

		BorderStyle:    lipgloss.RoundedBorder(),
		BorderStyleDim: lipgloss.HiddenBorder(),
		TitleStyle:     titleStyle,
		BodyStyle:      bodyStyle,
		ErrorStyle:     errorStyle,
		SuccessStyle:   successStyle,
		WarningStyle:  warningStyle,
		InfoStyle:      infoStyle,
		CodeStyle:      codeStyle,
	}
}

// JoinViews joins multiple views vertically with proper spacing
func (t *Theme) JoinViews(views ...string) string {
	return lipgloss.JoinVertical(lipgloss.Top, views...)
}

// JoinHorizontal joins views horizontally
func (t *Theme) JoinHorizontal(views ...string) string {
	return lipgloss.JoinHorizontal(lipgloss.Left, views...)
}

// RenderPanel renders a panel with title and content
func (t *Theme) RenderPanel(title, content string, width int) string {
	panelStyle := lipgloss.NewStyle().
		Background(t.PanelBackground).
		Border(t.BorderStyle).
		BorderForeground(t.SecondaryColor).
		Padding(1, 2)

	if title != "" {
		title = lipgloss.NewStyle().
			Background(t.SecondaryColor).
			Foreground(t.Background).
			Bold(true).
			Render(" " + title + " ")
	}

	panel := panelStyle.Width(width).Render(content)
	return title + "\n" + panel
}

// RenderBox renders a simple box around content
func (t *Theme) RenderBox(content string) string {
	boxStyle := lipgloss.NewStyle().
		Border(t.BorderStyle).
		BorderForeground(t.SecondaryColor).
		Padding(0, 1)

	return boxStyle.Render(content)
}

// RenderSuccess renders a success message
func (t *Theme) RenderSuccess(message string) string {
	return t.SuccessStyle.Render("✓ " + message)
}

// RenderError renders an error message
func (t *Theme) RenderError(message string) string {
	return t.ErrorStyle.Render("✗ " + message)
}

// RenderWarning renders a warning message
func (t *Theme) RenderWarning(message string) string {
	return t.WarningStyle.Render("⚠ " + message)
}

// RenderInfo renders an info message
func (t *Theme) RenderInfo(message string) string {
	return t.InfoStyle.Render("ℹ " + message)
}

// RenderCode renders code with syntax highlighting
func (t *Theme) RenderCode(code string, language string) string {
	return t.CodeStyle.Render("```" + language + "\n" + code + "\n```")
}

// RenderLink renders a clickable link
func (t *Theme) RenderLink(text, url string) string {
	linkStyle := lipgloss.NewStyle().
		Foreground(t.PrimaryColor).
		Underline(true)

	return linkStyle.Render(text) + " (" + url + ")"
}

// RenderProgressBar renders a progress bar
func (t *Theme) RenderProgressBar(current, total int, width int) string {
	if total == 0 {
		return "[" + strings.Repeat(" ", width) + "]"
	}

	percentage := float64(current) / float64(total)
	filled := int(percentage * float64(width))
	empty := width - filled

	filledStyle := lipgloss.NewStyle().Background(t.AccentColor)
	emptyStyle := lipgloss.NewStyle().Background(t.PanelBackground)

	bar := strings.Repeat(" ", filled) + strings.Repeat(" ", empty)
	bar = filledStyle.Render(bar[:filled]) + emptyStyle.Render(bar[filled:])

	return "[" + bar + "]"
}

// RenderSpinner renders a spinner
func (t *Theme) RenderSpinner(frame int) string {
	frames := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	if frame < 0 || frame >= len(frames) {
		frame = 0
	}
	return lipgloss.NewStyle().Foreground(t.AccentColor).Render(frames[frame])
}

// RenderTable renders a simple table
func (t *Theme) RenderTable(headers []string, rows [][]string) string {
	if len(headers) == 0 || len(rows) == 0 {
		return ""
	}

	// Calculate column widths
	colWidths := make([]int, len(headers))
	for i, header := range headers {
		colWidths[i] = len(header)
		for _, row := range rows {
			if i < len(row) && len(row[i]) > colWidths[i] {
				colWidths[i] = len(row[i])
			}
		}
	}

	// Render header
	var builder strings.Builder
	headerRow := make([]string, len(headers))
	for i, header := range headers {
		headerStyle := lipgloss.NewStyle().
			Foreground(t.PrimaryColor).
			Bold(true).
			Width(colWidths[i])
		headerRow[i] = headerStyle.Render(header)
	}
	builder.WriteString(lipgloss.JoinHorizontal(lipgloss.Left, headerRow...) + "\n")

	// Render separator
	separator := make([]string, len(headers))
	for i, width := range colWidths {
		separator[i] = strings.Repeat("─", width)
	}
	builder.WriteString(lipgloss.JoinHorizontal(lipgloss.Center, separator...) + "\n")

	// Render rows
	for _, row := range rows {
		rowCells := make([]string, len(headers))
		for i, cell := range row {
			if i < len(row) {
				cellStyle := lipgloss.NewStyle().Width(colWidths[i])
				rowCells[i] = cellStyle.Render(cell)
			}
		}
		builder.WriteString(lipgloss.JoinHorizontal(lipgloss.Left, rowCells...) + "\n")
	}

	return builder.String()
}
