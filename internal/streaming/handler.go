package streaming

import (
	"fmt"
	"strings"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/komplete-kontrol/cli/internal/llm"
	tuimsg "github.com/komplete-kontrol/cli/internal/tui"
)

// ErrorMsg is a message for errors
type ErrorMsg error

// StreamHandler handles streaming LLM responses
type StreamHandler struct {
	tokens      []string
	tokenCount  int
	mu          sync.Mutex
	onToken     func(string)
	onComplete   func(*llm.CompletionResponse)
	onError     func(error)
	cost        float64
	startTime    time.Time
	modelName    string
}

// NewStreamHandler creates a new stream handler
func NewStreamHandler(modelName string) *StreamHandler {
	return &StreamHandler{
		tokens:     []string{},
		tokenCount: 0,
		onToken:    nil,
		onComplete: nil,
		onError:    nil,
		cost:       0.0,
		startTime:   time.Now(),
		modelName:   modelName,
	}
}

// OnToken is called when a token is received
func (h *StreamHandler) OnToken(token string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.tokens = append(h.tokens, token)
	h.tokenCount++

	// Calculate approximate cost (Claude pricing: $0.003/1k input, $0.015/1k output)
	// Rough estimate: 4 chars per token
	h.cost = float64(len(token))/4000 * 0.00000375

	// Call callback if set
	if h.onToken != nil {
		h.onToken(token)
	}
}

// OnDone is called when streaming is complete
func (h *StreamHandler) OnDone(response *llm.CompletionResponse) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Update cost from actual usage
	if response.TokensUsed.TotalTokens > 0 {
		inputCost := float64(response.TokensUsed.InputTokens) * 0.000003
		outputCost := float64(response.TokensUsed.OutputTokens) * 0.000015
		h.cost = inputCost + outputCost
	}

	// Call callback if set
	if h.onComplete != nil {
		h.onComplete(response)
	}
}

// OnError is called when an error occurs
func (h *StreamHandler) OnError(err error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.onError != nil {
		h.onError(err)
	}
}

// SetCallbacks sets the callbacks
func (h *StreamHandler) SetCallbacks(onToken func(string), onComplete func(*llm.CompletionResponse), onError func(error)) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.onToken = onToken
	h.onComplete = onComplete
	h.onError = onError
}

// GetTokens returns all accumulated tokens
func (h *StreamHandler) GetTokens() []string {
	h.mu.Lock()
	defer h.mu.Unlock()

	return h.tokens
}

// GetTokenCount returns the total token count
func (h *StreamHandler) GetTokenCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()

	return h.tokenCount
}

// GetContent returns the accumulated content
func (h *StreamHandler) GetContent() string {
	h.mu.Lock()
	defer h.mu.Unlock()

	return strings.Join(h.tokens, "")
}

// GetCost returns the estimated cost
func (h *StreamHandler) GetCost() float64 {
	h.mu.Lock()
	defer h.mu.Unlock()

	return h.cost
}

// GetElapsedTime returns the elapsed time since start
func (h *StreamHandler) GetElapsedTime() time.Duration {
	return time.Since(h.startTime)
}

// Reset clears the handler state
func (h *StreamHandler) Reset() {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.tokens = []string{}
	h.tokenCount = 0
	h.cost = 0.0
	h.startTime = time.Now()
}

// GetModelName returns the model name
func (h *StreamHandler) GetModelName() string {
	return h.modelName
}

// TUIStreamHandler integrates streaming with Bubbletea TUI
type TUIStreamHandler struct {
	*StreamHandler
	streamID string
	provider string
	ch       chan<- tea.Msg

	flushEvery time.Duration

	pendingMu sync.Mutex
	pending   strings.Builder

	endCh chan endEvent
}

type endEvent struct {
	resp *llm.CompletionResponse
	err  error
}

// NewTUIStreamHandler creates a new TUI stream handler
func NewTUIStreamHandler(streamID, modelName, provider string, ch chan<- tea.Msg) *TUIStreamHandler {
	h := &TUIStreamHandler{
		StreamHandler: NewStreamHandler(modelName),
		streamID:      streamID,
		provider:      provider,
		ch:            ch,
		flushEvery:    40 * time.Millisecond,
		endCh:         make(chan endEvent, 1),
	}
	go h.flushLoop()
	return h
}

// OnToken implements llm.StreamHandler.
// IMPORTANT: must never block network streaming goroutines.
func (h *TUIStreamHandler) OnToken(token string) {
	// Update stats/state.
	h.StreamHandler.OnToken(token)

	// Buffer token delta for batched UI updates.
	h.pendingMu.Lock()
	h.pending.WriteString(token)
	h.pendingMu.Unlock()
}

// OnDone implements llm.StreamHandler.
func (h *TUIStreamHandler) OnDone(resp *llm.CompletionResponse) {
	h.StreamHandler.OnDone(resp)
	// Non-blocking signal to flush loop.
	select {
	case h.endCh <- endEvent{resp: resp}:
	default:
		go func() { h.endCh <- endEvent{resp: resp} }()
	}
}

// OnError implements llm.StreamHandler.
func (h *TUIStreamHandler) OnError(err error) {
	h.StreamHandler.OnError(err)
	// Non-blocking signal to flush loop.
	select {
	case h.endCh <- endEvent{err: err}:
	default:
		go func() { h.endCh <- endEvent{err: err} }()
	}
}

func (h *TUIStreamHandler) flushLoop() {
	t := time.NewTicker(h.flushEvery)
	defer t.Stop()

	for {
		select {
		case <-t.C:
			h.flushPending(false)
		case ev := <-h.endCh:
			// Final flush and terminate.
			h.flushPending(true)
			if ev.err != nil {
				h.sendAsync(tuimsg.StreamErrorMsg{StreamID: h.streamID, Role: tuimsg.StreamRoleAssistant, Err: ev.err, OccurredAt: time.Now()})
				h.sendAsync(tuimsg.StatusMsg{StreamID: h.streamID, Model: h.GetModelName(), Provider: h.provider, TokensUsed: h.GetTokenCount(), CostUSD: h.GetCost(), Status: "error", At: time.Now()})
				return
			}
			// Success
			used := 0
			cost := h.GetCost()
			if ev.resp != nil {
				if ev.resp.TokensUsed.TotalTokens > 0 {
					used = ev.resp.TokensUsed.TotalTokens
				}
				// Handler already updated cost in StreamHandler.OnDone.
				cost = h.GetCost()
			}
			h.sendAsync(tuimsg.StreamEndMsg{StreamID: h.streamID, Role: tuimsg.StreamRoleAssistant, FinishedAt: time.Now(), TokensUsed: used, CostUSD: cost})
			h.sendAsync(tuimsg.StatusMsg{StreamID: h.streamID, Model: h.GetModelName(), Provider: h.provider, TokensUsed: used, CostUSD: cost, Status: "complete", At: time.Now()})
			return
		}
	}
}

func (h *TUIStreamHandler) flushPending(final bool) {
	delta := h.takePending()
	if strings.TrimSpace(delta) == "" {
		return
	}
	// This send happens from the handler's own goroutine, not the provider's.
	h.send(tuimsg.TokenDeltaMsg{StreamID: h.streamID, Role: tuimsg.StreamRoleAssistant, Delta: delta, ReceivedAt: time.Now()})
	if !final {
		h.send(tuimsg.StatusMsg{StreamID: h.streamID, Model: h.GetModelName(), Provider: h.provider, TokensUsed: h.GetTokenCount(), CostUSD: h.GetCost(), Status: "running", At: time.Now()})
	}
}

func (h *TUIStreamHandler) takePending() string {
	h.pendingMu.Lock()
	defer h.pendingMu.Unlock()
	if h.pending.Len() == 0 {
		return ""
	}
	out := h.pending.String()
	h.pending.Reset()
	return out
}

func (h *TUIStreamHandler) send(msg tea.Msg) {
	if h.ch == nil {
		return
	}
	h.ch <- msg
}

func (h *TUIStreamHandler) sendAsync(msg tea.Msg) {
	if h.ch == nil {
		return
	}
	go func() { h.ch <- msg }()
}

// FormatProgress formats a progress message
func FormatProgress(current, total int, message string) string {
	if total == 0 {
		return fmt.Sprintf("%s", message)
	}
	percentage := float64(current) / float64(total) * 100
	return fmt.Sprintf("%s [%.0f%%]", message, percentage)
}

// FormatCost formats the cost display
func FormatCost(cost float64) string {
	if cost < 0.01 {
		return fmt.Sprintf("$%.4f", cost)
	}
	if cost < 0.1 {
		return fmt.Sprintf("$%.3f", cost)
	}
	if cost < 1.0 {
		return fmt.Sprintf("$%.2f", cost)
	}
	if cost < 10.0 {
		return fmt.Sprintf("$%.1f", cost)
	}
	return fmt.Sprintf("$%.1f", cost)
}

// FormatTokens formats the token count
func FormatTokens(count int) string {
	if count < 1000 {
		return fmt.Sprintf("%d", count)
	}
	if count < 1000000 {
		return fmt.Sprintf("%.1fk", float64(count)/1000)
	}
	return fmt.Sprintf("%.1fM", float64(count)/1000000)
}

// EstimateCost estimates cost based on token count
func EstimateCost(inputTokens, outputTokens int, modelName string) float64 {
	// Default pricing (can be configured)
	inputCostPer1k := 0.003
	outputCostPer1k := 0.015

	// Adjust for different models
	if strings.Contains(modelName, "haiku") {
		inputCostPer1k = 0.00025
		outputCostPer1k = 0.000125
	} else if strings.Contains(modelName, "gpt") {
		inputCostPer1k = 0.005
		outputCostPer1k = 0.015
	}

	inputCost := float64(inputTokens) / 1000 * inputCostPer1k
	outputCost := float64(outputTokens) / 1000 * outputCostPer1k

	return inputCost + outputCost
}

// BatchTokens batches tokens for efficient sending
func BatchTokens(tokens []string, batchSize int) [][]string {
	if batchSize <= 0 {
		return [][]string{tokens}
	}

	var batches [][]string
	for i := 0; i < len(tokens); i += batchSize {
		end := i + batchSize
		if end > len(tokens) {
			end = len(tokens)
		}
		batches = append(batches, tokens[i:end])
	}

	return batches
}

// GetProgressPercentage returns progress as percentage
func (h *StreamHandler) GetProgressPercentage(expectedTokens int) float64 {
	if expectedTokens <= 0 {
		return 0.0
	}
	return float64(h.tokenCount) / float64(expectedTokens) * 100
}

// FormatElapsedTime formats elapsed time for display
func FormatElapsedTime(d time.Duration) string {
	if d < time.Second {
		return "0s"
	}
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	}
	if d < time.Hour {
		return fmt.Sprintf("%.1fm", d.Minutes())
	}
	return fmt.Sprintf("%.1fh", d.Hours())
}
