package alignment

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/komplete-kontrol/cli/internal/llm"
)

// ProtocolVersion is the current protocol version
const ProtocolVersion = "2.0"

// MessageType represents a protocol message type
type MessageType string

const (
	MessageTypeRequest  MessageType = "request"
	MessageTypeResponse MessageType = "response"
	MessageTypeError    MessageType = "error"
	MessageTypeEvent   MessageType = "event"
	MessageTypeStream  MessageType = "stream"
)

// ProtocolMessage represents a message in the alignment protocol
type ProtocolMessage struct {
	Version   string
	Type      MessageType
	ID         string
	Timestamp  time.Time
	Data       any
}

// RequestMessage represents a request from VS Code
type RequestMessage struct {
	ProtocolMessage
	Command string
	Args    map[string]any
}

// ResponseMessage represents a response to VS Code
type ResponseMessage struct {
	ProtocolMessage
	Success bool
	Data    any
}

// StreamMessage represents a streaming message
type StreamMessage struct {
	ProtocolMessage
	Token   string
	Done    bool
}

// EventMessage represents an event notification
type EventMessage struct {
	ProtocolMessage
	EventType string
	Data     any
}

// AlignmentLayer handles CLI/VS Code communication
type AlignmentLayer struct {
	listener   net.Listener
	conn       net.Conn
	encoder    *json.Encoder
	decoder    *json.Decoder
	mu         sync.RWMutex
	connected   bool
	tuiProgram *tea.Program
	onMessage   func(ProtocolMessage)
}

// NewAlignmentLayer creates a new alignment layer
func NewAlignmentLayer() *AlignmentLayer {
	return &AlignmentLayer{
		encoder:   json.NewEncoder(os.Stdout),
		decoder:   json.NewDecoder(os.Stdin),
		connected: false,
	}
}

// Start starts the alignment layer server
func (al *AlignmentLayer) Start(addr string) error {
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to start alignment layer: %w", err)
	}

	al.listener = listener
	al.connected = true

	go al.acceptConnections()

	return nil
}

// acceptConnections accepts incoming connections
func (al *AlignmentLayer) acceptConnections() {
	for {
		conn, err := al.listener.Accept()
		if err != nil {
			al.mu.Lock()
			al.connected = false
			al.mu.Unlock()
			return
		}

		go al.handleConnection(conn)
	}
}

// handleConnection handles a single connection
func (al *AlignmentLayer) handleConnection(conn net.Conn) {
	decoder := json.NewDecoder(conn)
	encoder := json.NewEncoder(conn)

	for {
		var msg ProtocolMessage
		err := decoder.Decode(&msg)
		if err != nil {
			break
		}

		// Handle message
		al.handleMessage(&msg, encoder)
	}
}

// handleMessage processes a protocol message
func (al *AlignmentLayer) handleMessage(msg *ProtocolMessage, encoder *json.Encoder) {
	msg.Timestamp = time.Now()
	msg.Version = ProtocolVersion

	switch msg.Type {
	case MessageTypeRequest:
		al.handleRequest(msg, encoder)

	case MessageTypeResponse:
		// Response to our request (shouldn't happen)

	case MessageTypeError:
		// Error from VS Code
		al.onError(msg.Data)

	case MessageTypeEvent:
		al.handleEvent(msg, encoder)

	case MessageTypeStream:
		al.handleStream(msg, encoder)
	}
}

// handleRequest processes a request from VS Code
func (al *AlignmentLayer) handleRequest(msg *ProtocolMessage, encoder *json.Encoder) {
	req, ok := msg.Data.(map[string]any)
	if !ok {
		al.sendError(encoder, "invalid request format")
		return
	}

	command, ok := req["command"].(string)
	if !ok {
		al.sendError(encoder, "missing command")
		return
	}

	// Handle commands
	switch command {
	case "execute":
		al.handleExecute(req, encoder)
	case "list_models":
		al.handleListModels(encoder)
	case "list_tools":
		al.handleListTools(encoder)
	case "get_status":
		al.handleGetStatus(encoder)
	default:
		al.sendError(encoder, fmt.Sprintf("unknown command: %s", command))
	}
}

// handleExecute handles an execute request
func (al *AlignmentLayer) handleExecute(req map[string]any, encoder *json.Encoder) {
	_, ok := req["prompt"].(string)
	if !ok {
		al.sendError(encoder, "missing prompt")
		return
	}

	// Send response
	al.sendResponse(encoder, true, map[string]any{
		"status": "executing",
	})

	// Execute prompt (would call LLM here)
	// For now, just send completion
	al.sendResponse(encoder, true, map[string]any{
		"result": "execution complete",
	})
}

// handleListModels handles a list models request
func (al *AlignmentLayer) handleListModels(encoder *json.Encoder) {
	// Would query ModelManager for available models
	// For now, return mock data
	al.sendResponse(encoder, true, map[string]any{
		"models": []map[string]any{
			{
				"id":   "claude-sonnet-4.5",
				"name": "Claude Sonnet 4.5",
			},
			{
				"id":   "gpt-4o",
				"name": "GPT-4o",
			},
		},
	})
}

// handleListTools handles a list tools request
func (al *AlignmentLayer) handleListTools(encoder *json.Encoder) {
	// Would query ToolManager for available tools
	// For now, return mock data
	al.sendResponse(encoder, true, map[string]any{
		"tools": []map[string]any{
			{
				"id":   "tavily_search",
				"name": "Tavily Search",
			},
			{
				"id":   "base44_app",
				"name": "Base44 App Builder",
			},
		},
	})
}

// handleGetStatus handles a get status request
func (al *AlignmentLayer) handleGetStatus(encoder *json.Encoder) {
	al.sendResponse(encoder, true, map[string]any{
		"status":  "ready",
		"version": ProtocolVersion,
	})
}

// handleEvent processes an event message
func (al *AlignmentLayer) handleEvent(msg *ProtocolMessage, encoder *json.Encoder) {
	data, ok := msg.Data.(map[string]any)
	if !ok {
		return
	}

	eventType, ok := data["event"].(string)
	if !ok {
		return
	}

	// Handle events
	switch eventType {
	case "token":
		// Forward token to TUI
		al.onMessage(ProtocolMessage{
			Type:      MessageTypeStream,
			Timestamp: time.Now(),
			Data: StreamMessage{
				Token: data["token"].(string),
				Done:  false,
			},
		})

	case "complete":
		// Forward completion to TUI
		al.onMessage(ProtocolMessage{
			Type:      MessageTypeStream,
			Timestamp: time.Now(),
			Data: StreamMessage{
				Token: "",
				Done:  true,
			},
		})

	case "error":
		// Forward error to TUI
		al.onMessage(ProtocolMessage{
			Type:      MessageTypeError,
			Timestamp: time.Now(),
			Data:       data["error"].(string),
		})
	}
}

// handleStream processes a streaming message
func (al *AlignmentLayer) handleStream(msg *ProtocolMessage, encoder *json.Encoder) {
	stream, ok := msg.Data.(StreamMessage)
	if !ok {
		return
	}

	// Send acknowledgment
	al.sendEvent(encoder, "stream_received", map[string]any{
		"token_length": len(stream.Token),
	})
}

// sendError sends an error response
func (al *AlignmentLayer) sendError(encoder *json.Encoder, message string) {
	al.sendResponse(encoder, false, map[string]any{
		"error": message,
	})
}

// sendResponse sends a response
func (al *AlignmentLayer) sendResponse(encoder *json.Encoder, success bool, data map[string]any) {
	resp := ResponseMessage{
		ProtocolMessage: ProtocolMessage{
			Version:   ProtocolVersion,
			Type:      MessageTypeResponse,
			Timestamp: time.Now(),
		},
		Success: success,
		Data:    data,
	}

	encoder.Encode(&resp)
}

// sendEvent sends an event message
func (al *AlignmentLayer) sendEvent(encoder *json.Encoder, eventType string, data map[string]any) {
	resp := ResponseMessage{
		ProtocolMessage: ProtocolMessage{
			Version:   ProtocolVersion,
			Type:      MessageTypeEvent,
			Timestamp: time.Now(),
		},
		Success: true,
		Data: map[string]any{
			"event": eventType,
		},
	}

	if data != nil {
		resp.Data = data
	}

	encoder.Encode(&resp)
}

// Stop stops the alignment layer
func (al *AlignmentLayer) Stop() error {
	al.mu.Lock()
	defer al.mu.Unlock()

	if al.listener != nil {
		al.listener.Close()
	}

	al.connected = false

	return nil
}

// SendMessage sends a message to VS Code
func (al *AlignmentLayer) SendMessage(msg ProtocolMessage) error {
	al.mu.RLock()
	defer al.mu.RUnlock()

	if !al.connected {
		return fmt.Errorf("not connected to VS Code")
	}

	msg.Timestamp = time.Now()
	msg.Version = ProtocolVersion

	return al.encoder.Encode(&msg)
}

// SendToken sends a token message to VS Code
func (al *AlignmentLayer) SendToken(token string) error {
	return al.SendMessage(ProtocolMessage{
		Type: MessageTypeStream,
		Data: StreamMessage{
			Token: token,
			Done:  false,
		},
	})
}

// SendComplete sends a completion message to VS Code
func (al *AlignmentLayer) SendComplete(response *llm.CompletionResponse) error {
	return al.SendMessage(ProtocolMessage{
		Type: MessageTypeResponse,
		Data: response,
	})
}

// SendError sends an error message to VS Code
func (al *AlignmentLayer) SendError(err error) error {
	return al.SendMessage(ProtocolMessage{
		Type: MessageTypeError,
		Data: err.Error(),
	})
}

// OnMessage sets the message callback
func (al *AlignmentLayer) OnMessage(callback func(ProtocolMessage)) {
	al.mu.Lock()
	defer al.mu.Unlock()

	al.onMessage = callback
}

// IsConnected returns whether connected to VS Code
func (al *AlignmentLayer) IsConnected() bool {
	al.mu.RLock()
	defer al.mu.RUnlock()

	return al.connected
}

// GetAddress returns the listener address
func (al *AlignmentLayer) GetAddress() string {
	al.mu.RLock()
	defer al.mu.RUnlock()

	if al.listener != nil {
		return al.listener.Addr().String()
	}
	return ""
}

// onError handles errors
func (al *AlignmentLayer) onError(data any) {
	if al.onMessage != nil {
		al.onMessage(ProtocolMessage{
			Type: MessageTypeError,
			Data: data,
		})
	}
}

// SetTUIProgram sets the TUI program for message forwarding
func (al *AlignmentLayer) SetTUIProgram(program *tea.Program) {
	al.mu.Lock()
	defer al.mu.Unlock()

	al.tuiProgram = program
}
