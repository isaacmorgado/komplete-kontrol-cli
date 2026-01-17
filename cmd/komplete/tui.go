package main

import (
	"context"
	"fmt"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/komplete-kontrol/cli/internal/streaming"
	"github.com/komplete-kontrol/cli/internal/tui"
	"github.com/komplete-kontrol/cli/internal/tools"
	"github.com/spf13/cobra"
)

// NewTUICommand starts the interactive Bubbletea UI.
// It wires: ModelManager -> StreamHandler -> tea.Msg channel -> TUI Update loop.
func NewTUICommand() *cobra.Command {
	var maxTokens int
	var temperature float64

	cmd := &cobra.Command{
		Use:   "tui",
		Short: "Run the interactive Bubbletea TUI",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			modelID := selectModel(cmd, cfg)
			mm := newModelManager(cfg)
			tm := tools.NewToolManager(cfg)
			_ = tm.ConnectMCPServer // keep linter happy if not used yet

			// Channel that carries tea.Msg from background streaming + execution.
			msgCh := make(chan tea.Msg, 512)
			promptCh := make(chan string, 16)

			// Create model with channels.
			tuiModel := tui.NewMainModel(cfg.UI.Theme, msgCh, promptCh)
			app := tui.NewApp(tuiModel)

			// Execution goroutine: waits for prompts, starts streaming completions.
			go func() {
				for prompt := range promptCh {
					streamID := fmt.Sprintf("stream-%d", time.Now().UnixNano())
					provider := ""
					if p, err := mm.GetProviderForModel(modelID); err == nil && p != nil {
						provider = p.Name()
					}
					msgCh <- tui.StreamStartMsg{StreamID: streamID, Role: tui.StreamRoleUser, Prompt: prompt, Model: modelID, Provider: provider, StartedAt: time.Now()}

					ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
					// Stream handler batches token updates and forwards to msgCh.
					h := streaming.NewTUIStreamHandler(streamID, modelID, provider, msgCh)
					// Allow deterministic smoke tests without keys.
					if cmd.Flags().Changed("mock") {
						modelID = "mock-stream"
					}

					req := &llm.CompletionRequest{
						Model:       modelID,
						System:      "You are a helpful software engineering assistant.",
						Messages:    []llm.Message{{Role: "user", Content: prompt}},
						MaxTokens:   maxTokens,
						Temperature: temperature,
						Stream:      true,
						Tools:       tm.ToLLMToolDefinitions(),
					}

					resp, _ := mm.StreamComplete(ctx, req, h)
					// If provider returned tool calls, execute them and surface in Tools tab.
					if resp != nil && len(resp.ToolCalls) > 0 {
						for _, tc := range resp.ToolCalls {
							msgCh <- tui.ToolCallMsg{StreamID: streamID, ToolCallID: tc.ID, Name: tc.Name, Arguments: tc.Arguments, Phase: tui.ToolCallStart, OccurredAt: time.Now()}
							res, err := tm.Execute(ctx, tc.Name, tc.Arguments)
							// If this was a file write, show in Files tab.
							if tc.Name == "write_file" {
								path, _ := tc.Arguments["path"].(string)
								content, _ := tc.Arguments["content"].(string)
								preview := content
								if len(preview) > 180 {
									preview = preview[:180] + "..."
								}
								op := tui.FileWriteUpdate
								msgCh <- tui.FileWriteMsg{StreamID: streamID, Path: path, Op: op, Preview: preview, Bytes: len(content), Err: err, OccurredAt: time.Now()}
							}
							msgCh <- tui.ToolCallMsg{StreamID: streamID, ToolCallID: tc.ID, Name: tc.Name, Arguments: tc.Arguments, Result: res, Err: err, Phase: tui.ToolCallEnd, OccurredAt: time.Now()}
						}
					}
					cancel()
				}
			}()

			return app.Run()
		},
	}

	cmd.Flags().IntVar(&maxTokens, "max-tokens", 1200, "max tokens per prompt")
	cmd.Flags().Float64Var(&temperature, "temperature", 0.2, "sampling temperature")
	cmd.Flags().Bool("mock", false, "use mock streaming provider (requires KOMPLETE_USE_MOCK_PROVIDER=1)")
	return cmd
}
