package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/tools"
	"github.com/spf13/cobra"
)

func NewResearchApiCommand() *cobra.Command {
	var maxResults int
	var depth string

	cmd := &cobra.Command{
		Use:   "research-api <query>",
		Short: "Research via Tavily API (requires tavily.enabled + api_key)",
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
			input := map[string]any{"query": query, "max_results": float64(maxResults), "search_depth": depth}
			res, err := tm.Execute(ctx, "tavily_search", input)
			if err != nil {
				return err
			}
			fmt.Printf("%v\n", res.Data)
			return nil
		},
	}
	cmd.Flags().IntVar(&maxResults, "max-results", 5, "maximum results")
	cmd.Flags().StringVar(&depth, "depth", "basic", "search depth")
	return cmd
}
