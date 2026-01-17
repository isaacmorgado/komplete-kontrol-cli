package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func NewReCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "re",
		Short: "Resume from last prompt (.komplete/last_prompt.txt)",
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			b, err := os.ReadFile(filepath.Join(repoDataDir(), "last_prompt.txt"))
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()

			mm := newModelManager(cfg)
			modelID := selectModel(cmd, cfg)
			user := "Continue from the prior task."
			if len(args) > 0 {
				user = strings.Join(args, " ")
			}
			req := &llm.CompletionRequest{
				Model:       modelID,
				System:      "You are a software engineering assistant. Continue the task.",
				Messages:    []llm.Message{{Role: "user", Content: string(b) + "\n\n" + user}},
				MaxTokens:   1000,
				Temperature: 0.2,
			}
			streaming, _ := cmd.Root().PersistentFlags().GetBool("stream")
			if streaming {
				_, err = mm.StreamComplete(ctx, req, &stdoutStreamHandler{})
				fmt.Println()
				return err
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
