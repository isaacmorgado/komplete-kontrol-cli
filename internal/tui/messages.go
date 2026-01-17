package tui

import (
	"time"
)

// NOTE: These message types are the app-level events that drive Bubbletea's
// Update loop. They are intentionally explicit and metadata-rich to support
// multi-pane rendering (Output/Tools/Files/Logs/Settings).

// StreamRole identifies who produced a token/message in a stream.
type StreamRole string

const (
	StreamRoleUser      StreamRole = "user"
	StreamRoleAssistant StreamRole = "assistant"
	StreamRoleSystem    StreamRole = "system"
	StreamRoleTool      StreamRole = "tool"
)

// StreamStartMsg indicates a new streaming run began.
type StreamStartMsg struct {
	StreamID  string
	Role      StreamRole // usually user
	Prompt    string
	Model     string
	Provider  string
	StartedAt time.Time
}

// TokenDeltaMsg carries incremental assistant text.
type TokenDeltaMsg struct {
	StreamID   string
	Role       StreamRole // usually assistant
	Delta      string
	ReceivedAt time.Time
}

// StreamEndMsg indicates a streaming run ended successfully.
type StreamEndMsg struct {
	StreamID   string
	Role       StreamRole // usually assistant
	FinishedAt time.Time
	// Optional summary fields for status bars / logs.
	TokensUsed int
	CostUSD    float64
}

// StreamErrorMsg indicates the stream failed.
type StreamErrorMsg struct {
	StreamID   string
	Role       StreamRole
	Err        error
	OccurredAt time.Time
}

// StatusMsg updates high-level status (model/provider/cost/tokens/etc.).
type StatusMsg struct {
	StreamID   string
	Model      string
	Provider   string
	TokensUsed int
	CostUSD    float64
	// Status is a free-form short label (e.g. "idle", "running", "complete", "error").
	Status string
	At     time.Time
}

// ToolCallPhase indicates whether the tool call is starting or has finished.
type ToolCallPhase string

const (
	ToolCallStart ToolCallPhase = "start"
	ToolCallEnd   ToolCallPhase = "end"
)

// ToolCallMsg reports tool calls (MCP/Tavily/Base44/etc.).
type ToolCallMsg struct {
	StreamID    string
	ToolCallID  string
	Name        string
	Arguments   map[string]any
	Result      any
	Err         error
	Phase       ToolCallPhase
	OccurredAt  time.Time
}

// FileWriteOp indicates file write kind.
type FileWriteOp string

const (
	FileWriteCreate FileWriteOp = "create"
	FileWriteUpdate FileWriteOp = "update"
)

// FileWriteMsg reports a file being created/updated.
type FileWriteMsg struct {
	StreamID   string
	Path       string
	Op         FileWriteOp
	Preview    string
	Bytes      int
	Err        error
	OccurredAt time.Time
}

// LogLevel indicates log severity.
type LogLevel string

const (
	LogDebug LogLevel = "debug"
	LogInfo  LogLevel = "info"
	LogWarn  LogLevel = "warn"
	LogError LogLevel = "error"
)

// LogMsg is a structured log/event message for the Logs tab.
type LogMsg struct {
	StreamID   string
	Level      LogLevel
	Message    string
	Fields     map[string]any
	OccurredAt time.Time
}

