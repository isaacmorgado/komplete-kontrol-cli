package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func NewSPARCCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sparc <problem>",
		Short: "Run SPARC-style analysis using the configured LLM",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()
			mm := newModelManager(cfg)
			modelID := selectModel(cmd, cfg)
			problem := strings.Join(args, " ")
			req := &llm.CompletionRequest{
				Model:       modelID,
				System:      "Apply SPARC (Situation, Problem, Analysis, Resolution, Checks).",
				Messages:    []llm.Message{{Role: "user", Content: problem}},
				MaxTokens:   1000,
				Temperature: 0.2,
			}
			resp, err := mm.Complete(ctx, req)
			if err != nil {
				return err
			}
			fmt.Println(resp.Message.Content)
			return nil
		},
	}
	return cmd
}
