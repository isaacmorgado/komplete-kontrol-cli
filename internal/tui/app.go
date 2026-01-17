package tui

import (
	tea "github.com/charmbracelet/bubbletea"
)

// App is the main TUI application
type App struct {
	model     Model
	program   *tea.Program
	ready     bool
	quitting  bool
	err       error
}

// NewApp creates a new TUI application
func NewApp(initialModel Model) *App {
	return &App{
		model: initialModel,
	}
}

// Run starts the TUI application
func (a *App) Run() error {
	p := tea.NewProgram(
		a.model,
		tea.WithAltScreen(),       // Use the full screen
		tea.WithMouseCellMotion(), // Enable mouse support
		tea.WithMouseAllMotion(),  // Enable all mouse events
	)
	a.program = p

	finalModel, err := p.Run()
	if err != nil {
		return err
	}

	// Check if model had an error
	if m, ok := finalModel.(interface{ Error() error }); ok {
		return m.Error()
	}

	return nil
}

// Stop gracefully stops the TUI application
func (a *App) Stop() {
	if a.program != nil {
		a.program.Quit()
	}
}

// Send sends a message to the TUI
func (a *App) Send(msg tea.Msg) {
	if a.program != nil {
		a.program.Send(msg)
	}
}
