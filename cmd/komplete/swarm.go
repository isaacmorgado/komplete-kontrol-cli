package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

func NewSwarmCommand() *cobra.Command {
	var agents int

	cmd := &cobra.Command{
		Use:   "swarm <task>",
		Short: "Record a swarm request to .komplete/swarm/request.json (minimal Go implementation)",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if agents <= 0 {
				agents = 3
			}
			if err := ensureDir(filepath.Join(repoDataDir(), "swarm")); err != nil {
				return err
			}
			payload := map[string]any{
				"created_at": time.Now().UTC().Format(time.RFC3339),
				"agents":     agents,
				"task":       strings.Join(args, " "),
				"note":       "Go rewrite stores request only; hooks/swarm-orchestrator.sh is the current executor.",
			}
			b, _ := jsonMarshalIndent(payload)
			path := filepath.Join(repoDataDir(), "swarm", "request.json")
			if err := os.WriteFile(path, b, 0o644); err != nil {
				return err
			}
			fmt.Printf("Wrote: %s\n", path)
			return nil
		},
	}
	cmd.Flags().IntVar(&agents, "agents", 3, "number of agents")
	return cmd
}
