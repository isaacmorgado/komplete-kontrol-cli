package main

import (
	"context"
	"fmt"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/komplete-kontrol/cli/internal/streaming"
	"github.com/komplete-kontrol/cli/internal/tui"
	"github.com/komplete-kontrol/cli/internal/tools"
	"github.com/spf13/cobra"
)

// NewTUISmokeCommand runs a non-interactive, deterministic end-to-end streaming smoke test.
// It does NOT require a TTY.
//
// Flow:
// ModelManager (mock) -> streaming.TUIStreamHandler -> tea.Msg channel
// and then executes any tool calls returned by the mock provider.
func NewTUISmokeCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "tui-smoke",
		Short: "Non-interactive smoke test for streaming -> tea.Msg pipeline (no TTY)",
		RunE: func(cmd *cobra.Command, args []string) error {
			// Ensure mock provider is enabled.
			_ = os.Setenv("KOMPLETE_USE_MOCK_PROVIDER", "1")

			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}

			mm := newModelManager(cfg)
			tm := tools.NewToolManager(cfg)

			msgCh := make(chan tea.Msg, 2048)
			streamID := fmt.Sprintf("smoke-%d", time.Now().UnixNano())
			modelID := "mock-stream"
			provider := "Mock"

			msgCh <- tui.StreamStartMsg{StreamID: streamID, Role: tui.StreamRoleUser, Prompt: "smoke", Model: modelID, Provider: provider, StartedAt: time.Now()}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			h := streaming.NewTUIStreamHandler(streamID, modelID, provider, msgCh)
			req := &llm.CompletionRequest{
				Model:     modelID,
				Messages:  []llm.Message{{Role: "user", Content: "smoke"}},
				MaxTokens: 200,
				Stream:    true,
				Tools:     tm.ToLLMToolDefinitions(),
			}

			resp, err := mm.StreamComplete(ctx, req, h)
			if err != nil {
				return err
			}

			// Drain messages that were emitted.
			drainUntil := time.After(250 * time.Millisecond)
			for {
				select {
				case m := <-msgCh:
					if m == nil {
						continue
					}
					switch x := m.(type) {
					case tui.TokenDeltaMsg:
						fmt.Printf("TokenDeltaMsg: %q\n", x.Delta)
					case tui.StreamEndMsg:
						fmt.Printf("StreamEndMsg: tokens=%d cost=$%.4f\n", x.TokensUsed, x.CostUSD)
					case tui.StatusMsg:
						fmt.Printf("StatusMsg: %s tokens=%d cost=$%.4f\n", x.Status, x.TokensUsed, x.CostUSD)
					case tui.StreamStartMsg:
						fmt.Printf("StreamStartMsg: %s\n", x.StreamID)
					case tui.StreamErrorMsg:
						fmt.Printf("StreamErrorMsg: %v\n", x.Err)
					default:
						// ignore
					}
				case <-drainUntil:
					goto drained
				}
			}
			drained:

			// Execute any tool calls from the completion.
			for _, tc := range resp.ToolCalls {
				fmt.Printf("ToolCall: %s %v\n", tc.Name, tc.Arguments)
				msgCh <- tui.ToolCallMsg{StreamID: streamID, ToolCallID: tc.ID, Name: tc.Name, Arguments: tc.Arguments, Phase: tui.ToolCallStart, OccurredAt: time.Now()}
				res, err := tm.Execute(ctx, tc.Name, tc.Arguments)
				msgCh <- tui.ToolCallMsg{StreamID: streamID, ToolCallID: tc.ID, Name: tc.Name, Arguments: tc.Arguments, Result: res, Err: err, Phase: tui.ToolCallEnd, OccurredAt: time.Now()}
				if tc.Name == "write_file" {
					path, _ := tc.Arguments["path"].(string)
					fmt.Printf("FileWrite: %s\n", path)
				}
			}

			return nil
		},
	}
	return cmd
}

