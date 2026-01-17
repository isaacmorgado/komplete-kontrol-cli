package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func NewCompactCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "compact",
		Short: "Compact last prompt into a short summary (.komplete/compact.txt)",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			b, err := os.ReadFile(filepath.Join(repoDataDir(), "last_prompt.txt"))
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()

			mm := newModelManager(cfg)
			modelID := selectModel(cmd, cfg)
			req := &llm.CompletionRequest{
				Model:       modelID,
				System:      "Summarize the input into <= 12 bullet points. Keep actionable details.",
				Messages:    []llm.Message{{Role: "user", Content: string(b)}},
				MaxTokens:   400,
				Temperature: 0.1,
			}
			resp, err := mm.Complete(ctx, req)
			if err != nil {
				return err
			}

			if err := ensureDir(repoDataDir()); err != nil {
				return err
			}
			outPath := filepath.Join(repoDataDir(), "compact.txt")
			if err := os.WriteFile(outPath, []byte(resp.Message.Content), 0o644); err != nil {
				return err
			}
			fmt.Printf("Wrote: %s\n", outPath)
			fmt.Println(resp.Message.Content)
			return nil
		},
	}
	return cmd
}
