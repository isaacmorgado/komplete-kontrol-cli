package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func NewReflectCommand() *cobra.Command {
	var iterations int
	var verbose bool

	cmd := &cobra.Command{
		Use:   "reflect <goal>",
		Short: "Run ReAct + Reflexion loop (planning-only in Go rewrite)",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}

			modelID := selectModel(cmd, cfg)
			mm := newModelManager(cfg)
			goal := strings.Join(args, " ")

			if iterations <= 0 {
				iterations = 1
			}

			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()

			var last string
			for i := 1; i <= iterations; i++ {
				prompt := fmt.Sprintf(
					"Goal: %s\n\nCycle %d/%d. Provide:\n- Thought\n- Action (concrete next step)\n- Observation (what to check)\n- Reflection\n- Next\n\nPrior cycle output:\n%s",
					goal, i, iterations, last,
				)

				req := &llm.CompletionRequest{
					Model: modelID,
					System: "You are a software engineering assistant. Use ReAct + Reflexion. Be concise.",
					Messages: []llm.Message{{Role: "user", Content: prompt}},
					MaxTokens: 800,
					Temperature: 0.2,
				}

				resp, err := mm.Complete(ctx, req)
				if err != nil {
					return err
				}
				last = resp.Message.Content
				if verbose {
					fmt.Printf("\n--- Cycle %d/%d ---\n", i, iterations)
				}
				fmt.Println(last)
			}
			return nil
		},
	}

	cmd.Flags().IntVar(&iterations, "iterations", 3, "number of reflexion cycles")
	cmd.Flags().BoolVar(&verbose, "verbose", false, "verbose output")

	return cmd
}
