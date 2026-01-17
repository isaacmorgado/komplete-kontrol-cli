package tui

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/komplete-kontrol/cli/internal/tui/components"
)

// Model is the main TUI model interface
type Model interface {
	tea.Model
	Error() error
}

// MainModel represents the main application state
type MainModel struct {
	ready      bool
	quitting   bool
	err        error
	currentTab Tab
	tabs       []Tab
	statusBar  *components.StatusBarModel
	output     *components.OutputPanelModel
	input      *components.TextInputModel
	theme      *Theme

	// streaming subscription
	streamCh <-chan tea.Msg
	// prompts from user input
	promptCh chan<- string

	// output streaming state
	outputViewport viewport.Model
	outputLines    []string
	outputPartial  string
	outputFlushAt  time.Time
	outputFlushDur time.Duration

	// tab models
	toolsList    list.Model
	filesList    list.Model
	logsViewport viewport.Model
	settingsVP   viewport.Model

	// data backing views
	toolEvents []toolEntry
	fileEvents []fileEntry
	logEvents  []string

	selectedPath string
}

type toolEntry struct {
	Line string
}

type fileEntry struct {
	Line string
	Path string
}

// Tab represents a tab in the TUI
type Tab string

const (
	TabOutput   Tab = "output"
	TabTools    Tab = "tools"
	TabFiles    Tab = "files"
	TabLogs     Tab = "logs"
	TabSettings Tab = "settings"
)

type toolListItem toolEntry

func (i toolListItem) Title() string       { return i.Line }
func (i toolListItem) Description() string { return "" }
func (i toolListItem) FilterValue() string { return i.Line }

type fileListItem fileEntry

func (i fileListItem) Title() string       { return i.Line }
func (i fileListItem) Description() string { return i.Path }
func (i fileListItem) FilterValue() string { return i.Path }

type streamSubMsg struct {
	Ch <-chan tea.Msg
}

func streamSubCmd(ch <-chan tea.Msg) tea.Cmd {
	return func() tea.Msg { return streamSubMsg{Ch: ch} }
}

func waitStreamMsg(ch <-chan tea.Msg) tea.Cmd {
	return func() tea.Msg {
		if ch == nil {
			return nil
		}
		msg, ok := <-ch
		if !ok {
			return nil
		}
		return msg
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// NewMainModel constructs the main TUI model.
func NewMainModel(themeType string, streamCh <-chan tea.Msg, promptCh chan<- string) *MainModel {
	t := NewTheme(themeType)

	tools := list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	tools.Title = "Tools"
	tools.SetShowStatusBar(false)
	tools.SetFilteringEnabled(false)

	files := list.New([]list.Item{}, list.NewDefaultDelegate(), 0, 0)
	files.Title = "Files"
	files.SetShowStatusBar(false)
	files.SetFilteringEnabled(false)

	ov := viewport.New(0, 0)
	ov.MouseWheelEnabled = true

	lv := viewport.New(0, 0)
	lv.MouseWheelEnabled = true

	sv := viewport.New(0, 0)
	sv.MouseWheelEnabled = true

	m := &MainModel{
		ready:          false,
		quitting:       false,
		currentTab:     TabOutput,
		tabs:           []Tab{TabOutput, TabTools, TabFiles, TabLogs, TabSettings},
		statusBar:      components.NewStatusBarModel(),
		output:         components.NewOutputPanelModel(),
		input:          components.NewTextInputModel(),
		theme:          t,
		streamCh:       streamCh,
		promptCh:       promptCh,
		outputViewport: ov,
		outputLines:    []string{},
		outputPartial:  "",
		outputFlushDur: 40 * time.Millisecond,
		toolsList:      tools,
		filesList:      files,
		logsViewport:   lv,
		settingsVP:     sv,
	}

	return m
}

// Init initializes the model
func (m *MainModel) Init() tea.Cmd {
	cmds := []tea.Cmd{}
	if m.streamCh != nil {
		cmds = append(cmds, streamSubCmd(m.streamCh))
	}
	if m.input != nil {
		cmds = append(cmds, m.input.Init())
	}
	return tea.Batch(cmds...)
}

// Update handles messages
func (m *MainModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	var cmds []tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			m.quitting = true
			return m, tea.Quit
		case "tab":
			m.nextTab()
		case "shift+tab":
			m.prevTab()
		case "enter":
			if m.currentTab == TabFiles {
				if it, ok := m.filesList.SelectedItem().(fileListItem); ok {
					m.selectedPath = it.Path
					m.logEvents = append(m.logEvents, fmt.Sprintf("open file: %s", m.selectedPath))
					m.refreshLogsViewport()
					cmds = append(cmds, openPathCmd(m.selectedPath))
				}
			}
		}

	case components.SubmitMsg:
		v := strings.TrimSpace(msg.Value)
		if v != "" {
			m.logEvents = append(m.logEvents, fmt.Sprintf("prompt: %s", v))
			m.refreshLogsViewport()
			if m.promptCh != nil {
				// Non-blocking forward to execution goroutine.
				select {
				case m.promptCh <- v:
				default:
					go func() { m.promptCh <- v }()
				}
			}
		}

	case tea.WindowSizeMsg:
		// Handle window resize
		if m.statusBar != nil {
			m.statusBar.UpdateWidth(msg.Width)
		}
		m.ready = true
		// Reserve space: status(1) + input(3-ish). Keep simple.
		contentH := maxInt(0, msg.Height-6)
		m.outputViewport.Width = msg.Width
		m.outputViewport.Height = contentH
		m.toolsList.SetSize(msg.Width, contentH)
		m.filesList.SetSize(msg.Width, contentH)
		m.logsViewport.Width = msg.Width
		m.logsViewport.Height = contentH
		m.settingsVP.Width = msg.Width
		m.settingsVP.Height = contentH

	case ErrorMsg:
		m.err = msg
		return m, nil

	case streamSubMsg:
		m.streamCh = msg.Ch
		if m.streamCh != nil {
			cmds = append(cmds, waitStreamMsg(m.streamCh))
		}

	case TokenDeltaMsg:
		m.appendAssistantDelta(msg.Delta)
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case StreamStartMsg:
		m.outputLines = []string{fmt.Sprintf("> %s", msg.Prompt)}
		m.outputPartial = ""
		m.outputViewport.SetContent("")
		m.toolEvents = nil
		m.fileEvents = nil
		m.logEvents = append(m.logEvents, fmt.Sprintf("stream start: %s (%s/%s)", msg.StreamID, msg.Provider, msg.Model))
		m.refreshLists()
		m.refreshLogsViewport()
		if m.statusBar != nil {
			_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusRunning, Streaming: true})
			_, _ = m.statusBar.Update(components.SetModelMsg{Name: msg.Model, Provider: msg.Provider})
		}
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case StreamEndMsg:
		m.flushOutput(true)
		m.logEvents = append(m.logEvents, fmt.Sprintf("stream end: tokens=%d cost=$%.4f", msg.TokensUsed, msg.CostUSD))
		m.refreshLogsViewport()
		if m.statusBar != nil {
			_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusComplete, Streaming: false})
			_, _ = m.statusBar.Update(components.UpdateTokensMsg{Count: msg.TokensUsed})
			_, _ = m.statusBar.Update(components.UpdateCostMsg{Cost: msg.CostUSD})
		}
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case StreamErrorMsg:
		m.flushOutput(true)
		m.err = msg.Err
		m.logEvents = append(m.logEvents, fmt.Sprintf("stream error: %v", msg.Err))
		m.refreshLogsViewport()
		if m.statusBar != nil {
			_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusError, Streaming: false})
		}
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case ToolCallMsg:
		// Render compactly for list.
		line := msg.Name
		if msg.Phase == ToolCallStart {
			line = fmt.Sprintf("▶ %s", msg.Name)
		} else {
			if msg.Err != nil {
				line = fmt.Sprintf("✗ %s (%v)", msg.Name, msg.Err)
			} else {
				line = fmt.Sprintf("✓ %s", msg.Name)
			}
		}
		m.toolEvents = append(m.toolEvents, toolEntry{Line: line})
		m.refreshLists()
		m.logEvents = append(m.logEvents, fmt.Sprintf("tool %s: %s", msg.Phase, msg.Name))
		m.refreshLogsViewport()
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case FileWriteMsg:
		line := fmt.Sprintf("%s %s", msg.Op, msg.Path)
		if msg.Err != nil {
			line = fmt.Sprintf("✗ %s (%v)", line, msg.Err)
		}
		m.fileEvents = append(m.fileEvents, fileEntry{Line: line, Path: msg.Path})
		m.refreshLists()
		m.logEvents = append(m.logEvents, line)
		m.refreshLogsViewport()
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case LogMsg:
		m.logEvents = append(m.logEvents, fmt.Sprintf("%s: %s", msg.Level, msg.Message))
		m.refreshLogsViewport()
		cmds = append(cmds, waitStreamMsg(m.streamCh))

	case StatusMsg:
		if m.statusBar != nil {
			if msg.Model != "" || msg.Provider != "" {
				_, _ = m.statusBar.Update(components.SetModelMsg{Name: msg.Model, Provider: msg.Provider})
			}
			if msg.TokensUsed > 0 {
				_, _ = m.statusBar.Update(components.UpdateTokensMsg{Count: msg.TokensUsed})
			}
			if msg.CostUSD > 0 {
				_, _ = m.statusBar.Update(components.UpdateCostMsg{Cost: msg.CostUSD})
			}
			// Status mapping best-effort.
			switch msg.Status {
			case "running":
				_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusRunning, Streaming: true})
			case "complete":
				_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusComplete, Streaming: false})
			case "error":
				_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusError, Streaming: false})
			default:
				_, _ = m.statusBar.Update(components.SetStatusMsg{Status: components.StatusIdle, Streaming: false})
			}
		}
		cmds = append(cmds, waitStreamMsg(m.streamCh))
	}

	// Update components for key handling / internal state.
	if m.statusBar != nil {
		newStatusBar, statusBarCmd := m.statusBar.Update(msg)
		m.statusBar = newStatusBar.(*components.StatusBarModel)
		cmds = append(cmds, statusBarCmd)
	}
	if m.input != nil {
		newInput, inputCmd := m.input.Update(msg)
		m.input = newInput.(*components.TextInputModel)
		cmds = append(cmds, inputCmd)
	}
	// Tab-specific models.
	switch m.currentTab {
	case TabTools:
		var c tea.Cmd
		m.toolsList, c = m.toolsList.Update(msg)
		cmds = append(cmds, c)
	case TabFiles:
		var c tea.Cmd
		m.filesList, c = m.filesList.Update(msg)
		cmds = append(cmds, c)
	case TabLogs:
		var c tea.Cmd
		m.logsViewport, c = m.logsViewport.Update(msg)
		cmds = append(cmds, c)
	case TabSettings:
		var c tea.Cmd
		m.settingsVP, c = m.settingsVP.Update(msg)
		cmds = append(cmds, c)
	case TabOutput:
		var c tea.Cmd
		m.outputViewport, c = m.outputViewport.Update(msg)
		cmds = append(cmds, c)
	}

	cmd = tea.Batch(cmds...)
	return m, cmd
}

// View renders the model
func (m *MainModel) View() string {
	if m.quitting {
		return "Goodbye!\n"
	}

	if m.err != nil {
		return m.theme.ErrorStyle.Render("Error: " + m.err.Error())
	}

	if !m.ready {
		return "Loading..."
	}

	// Tabs header
	tabBar := m.renderTabBar()

	// Layout components
	var content string
	switch m.currentTab {
	case TabOutput:
		content = m.outputViewport.View()
	case TabTools:
		content = m.toolsList.View()
	case TabFiles:
		content = m.filesList.View()
	case TabLogs:
		content = m.logsViewport.View()
	case TabSettings:
		content = m.settingsVP.View()
	}

	return m.theme.JoinViews(
		m.statusBar.View(),
		tabBar,
		content,
		m.input.View(),
	)
}

// nextTab switches to the next tab
func (m *MainModel) nextTab() {
	for i, tab := range m.tabs {
		if tab == m.currentTab {
			m.currentTab = m.tabs[(i+1)%len(m.tabs)]
			return
		}
	}
}

// prevTab switches to the previous tab
func (m *MainModel) prevTab() {
	for i, tab := range m.tabs {
		if tab == m.currentTab {
			m.currentTab = m.tabs[(i-1+len(m.tabs))%len(m.tabs)]
			return
		}
	}
}

// Error returns any error in the model
func (m *MainModel) Error() error {
	return m.err
}

// ErrorMsg is a message for errors
type ErrorMsg error

// NewErrorMsg creates an error message
func NewErrorMsg(err error) tea.Cmd {
	return func() tea.Msg {
		return ErrorMsg(err)
	}
}

func (m *MainModel) renderTabBar() string {
	// Minimal tab bar (no placeholders).
	activeStyle := lipgloss.NewStyle().Bold(true).Foreground(m.theme.AccentColor)
	inactiveStyle := lipgloss.NewStyle().Foreground(m.theme.InfoColor)

	parts := make([]string, 0, len(m.tabs))
	for _, t := range m.tabs {
		label := strings.ToUpper(string(t))
		if t == m.currentTab {
			parts = append(parts, activeStyle.Render("["+label+"]"))
		} else {
			parts = append(parts, inactiveStyle.Render(" "+label+" "))
		}
	}
	return lipgloss.JoinHorizontal(lipgloss.Left, parts...)
}

func (m *MainModel) appendAssistantDelta(delta string) {
	// Incremental tail store.
	parts := strings.Split(delta, "\n")
	if len(parts) == 1 {
		m.outputPartial += parts[0]
	} else {
		// First completes current partial.
		m.outputLines = append(m.outputLines, m.outputPartial+parts[0])
		// Middles are full lines.
		for i := 1; i < len(parts)-1; i++ {
			m.outputLines = append(m.outputLines, parts[i])
		}
		// Last is new partial.
		m.outputPartial = parts[len(parts)-1]
		// Cap history to prevent unbounded growth.
		if len(m.outputLines) > 2000 {
			m.outputLines = m.outputLines[len(m.outputLines)-2000:]
		}
	}

	if time.Since(m.outputFlushAt) < m.outputFlushDur {
		return
	}
	m.flushOutput(false)
}

func (m *MainModel) flushOutput(force bool) {
	if len(m.outputLines) == 0 && m.outputPartial == "" {
		return
	}
	m.outputFlushAt = time.Now()

	// Render tail only: viewport height + a small buffer.
	want := m.outputViewport.Height + 20
	if want <= 0 {
		want = 50
	}
	start := 0
	if len(m.outputLines) > want {
		start = len(m.outputLines) - want
	}
	var b strings.Builder
	for i := start; i < len(m.outputLines); i++ {
		b.WriteString(m.outputLines[i])
		b.WriteString("\n")
	}
	b.WriteString(m.outputPartial)

	content := b.String()
	if !force && strings.TrimSpace(content) == "" {
		return
	}

	m.outputViewport.SetContent(content)
	m.outputViewport.GotoBottom()
}

func (m *MainModel) refreshLists() {
	{
		items := make([]list.Item, 0, len(m.toolEvents))
		for i := len(m.toolEvents) - 1; i >= 0; i-- {
			items = append(items, toolListItem(m.toolEvents[i]))
		}
		m.toolsList.SetItems(items)
	}
	{
		items := make([]list.Item, 0, len(m.fileEvents))
		for i := len(m.fileEvents) - 1; i >= 0; i-- {
			items = append(items, fileListItem(m.fileEvents[i]))
		}
		m.filesList.SetItems(items)
	}

	m.refreshSettingsViewport()
}

func (m *MainModel) refreshLogsViewport() {
	var b strings.Builder
	for i := range m.logEvents {
		b.WriteString(m.logEvents[i])
		b.WriteString("\n")
	}
	m.logsViewport.SetContent(b.String())
	m.logsViewport.GotoBottom()
}

func (m *MainModel) refreshSettingsViewport() {
	// Best-effort, based on StatusBar.
	model := ""
	provider := ""
	if m.statusBar != nil {
		// StatusBarModel fields are private; render summary from view instead.
		model = "(see status bar)"
		provider = ""
	}
	content := fmt.Sprintf("Settings\n\nProvider: %s\nModel: %s\n\nKeys:\n  tab / shift+tab: switch tabs\n  q: quit\n  enter (Files tab): open selected path\n", provider, model)
	m.settingsVP.SetContent(content)
}

func openPathCmd(path string) tea.Cmd {
	return func() tea.Msg {
		if strings.TrimSpace(path) == "" {
			return nil
		}
		var cmd *exec.Cmd
		switch runtime.GOOS {
		case "darwin":
			cmd = exec.Command("open", path)
		case "linux":
			cmd = exec.Command("xdg-open", path)
		case "windows":
			cmd = exec.Command("cmd", "/c", "start", path)
		default:
			return nil
		}
		_ = cmd.Start()
		return nil
	}
}
