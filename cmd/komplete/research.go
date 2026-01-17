package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/komplete-kontrol/cli/internal/tools"
	"github.com/spf13/cobra"
)

func NewResearchCommand() *cobra.Command {
	var maxResults int
	var depth string

	cmd := &cobra.Command{
		Use:   "research <query>",
		Short: "Research using configured tools (Tavily) or LLM-only fallback",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			_, cfg, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			query := strings.Join(args, " ")
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()

			tm := tools.NewToolManager(cfg)
			tool, err := tm.GetTool("tavily_search")
			if err == nil && tool != nil && tool.Enabled {
				input := map[string]any{"query": query}
				if maxResults > 0 {
					input["max_results"] = maxResults
				}
				if depth != "" {
					input["search_depth"] = depth
				}
				res, err := tm.Execute(ctx, "tavily_search", input)
				if err != nil {
					return err
				}
				fmt.Printf("%v\n", res.Data)
				return nil
			}

			// Fallback: LLM-only research plan
			modelID := selectModel(cmd, cfg)
			mm := newModelManager(cfg)
			req := &llm.CompletionRequest{
				Model: modelID,
				System: "You are a research assistant. Provide a research plan and likely sources. No browsing.",
				Messages: []llm.Message{{Role: "user", Content: query}},
				MaxTokens: 900,
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
	cmd.Flags().IntVar(&maxResults, "max-results", 5, "maximum results (Tavily)")
	cmd.Flags().StringVar(&depth, "depth", "basic", "search depth (Tavily)")
	return cmd
}
