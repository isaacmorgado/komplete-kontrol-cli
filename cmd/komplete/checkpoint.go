package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
)

func NewCheckpointCommand() *cobra.Command {
	root := &cobra.Command{
		Use:   "checkpoint",
		Short: "Checkpoint management (minimal Go implementation)",
		Long:  "Create lightweight snapshots under .komplete/checkpoints/.",
	}

	create := &cobra.Command{
		Use:   "create",
		Short: "Create a checkpoint (git status + diff + HEAD)",
		RunE: func(cmd *cobra.Command, args []string) error {
			name, _ := cmd.Flags().GetString("name")
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()

			id := nowID("checkpoint")
			if name != "" {
				id = fmt.Sprintf("%s-%s", id, name)
			}
			dir := filepath.Join(repoDataDir(), "checkpoints")
			if err := ensureDir(dir); err != nil {
				return err
			}

			head, _, _ := runShell(ctx, "git rev-parse HEAD")
			status, _, _ := runShell(ctx, "git status --porcelain")
			diff, _, _ := runShell(ctx, "git diff")

			payload := map[string]any{
				"id":        id,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"head":      head,
				"status":    status,
				"diff":      diff,
			}
			b, _ := jsonMarshalIndent(payload)
			if err := os.WriteFile(filepath.Join(dir, id+".json"), b, 0o644); err != nil {
				return err
			}

			fmt.Printf("Checkpoint created: %s\n", id)
			return nil
		},
	}
	create.Flags().String("name", "", "optional human label")

	list := &cobra.Command{
		Use:   "list",
		Short: "List checkpoints",
		RunE: func(cmd *cobra.Command, args []string) error {
			dir := filepath.Join(repoDataDir(), "checkpoints")
			entries, err := os.ReadDir(dir)
			if err != nil {
				return err
			}
			for _, e := range entries {
				fmt.Println(e.Name())
			}
			return nil
		},
	}

	root.AddCommand(create, list)
	return root
}
