package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func NewAutoCommand() *cobra.Command {
	var maxTokens int
	var temperature float64
	var verify bool

	cmd := &cobra.Command{
		Use:   "auto <goal>",
		Short: "Run autonomous mode (minimal Go implementation)",
		Long:  `Run autonomous development mode with auto-continue features.
This command enables hands-off operation with automatic task execution,
checkpoint management, and continuous improvement loops.`,
		Args: cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			modelID := selectModel(cmd, cfg)
			mm := newModelManager(cfg)
			goal := strings.Join(args, " ")

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
			defer cancel()

			req := &llm.CompletionRequest{
				Model:       modelID,
				System:      "You are an autonomous software engineering agent. Provide a concrete plan and next actions.",
				Messages:    []llm.Message{{Role: "user", Content: goal}},
				MaxTokens:   maxTokens,
				Temperature: temperature,
			}

			streaming, _ := cmd.Root().PersistentFlags().GetBool("stream")
			if streaming {
				_, err = mm.StreamComplete(ctx, req, &stdoutStreamHandler{})
				if err != nil {
					return err
				}
				fmt.Println()
			} else {
				resp, err := mm.Complete(ctx, req)
				if err != nil {
					return err
				}
				fmt.Println(resp.Message.Content)
			}

			_ = saveLastPrompt(goal)

			if verify {
				fmt.Println("\nRunning verification: go test ./...")
				out, code, err := runShell(ctx, "go test ./...")
				fmt.Print(out)
				if err != nil {
					return fmt.Errorf("verification failed (exit %d): %w", code, err)
				}
			}

			return nil
		},
	}

	cmd.Flags().IntVar(&maxTokens, "max-tokens", 1200, "max tokens for the run")
	cmd.Flags().Float64Var(&temperature, "temperature", 0.2, "sampling temperature")
	cmd.Flags().BoolVar(&verify, "verify", false, "run 'go test ./...' after completion")

	return cmd
}
