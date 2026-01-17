package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func NewVoiceCommand() *cobra.Command {
	var text string

	cmd := &cobra.Command{
		Use:   "voice",
		Short: "Voice mode (fallback: read text and send to LLM)",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			if strings.TrimSpace(text) == "" {
				// Read one line from stdin.
				s := bufio.NewScanner(os.Stdin)
				if !s.Scan() {
					return fmt.Errorf("no input")
				}
				text = s.Text()
			}

			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()
			mm := newModelManager(cfg)
			modelID := selectModel(cmd, cfg)
			req := &llm.CompletionRequest{
				Model:       modelID,
				System:      "You are a voice-driven assistant. Respond succinctly.",
				Messages:    []llm.Message{{Role: "user", Content: text}},
				MaxTokens:   800,
				Temperature: 0.3,
			}
			resp, err := mm.Complete(ctx, req)
			if err != nil {
				return err
			}
			fmt.Println(resp.Message.Content)
			return nil
		},
	}
	cmd.Flags().StringVar(&text, "text", "", "text input (simulating voice transcription)")
	return cmd
}
