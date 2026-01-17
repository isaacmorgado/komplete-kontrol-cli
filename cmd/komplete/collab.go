package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
)

func NewCollabCommand() *cobra.Command {
	root := &cobra.Command{
		Use:   "collab",
		Short: "Collaboration session (local stub with real state)",
		Long:  "Creates a local session file under .komplete/collab/session.json.",
	}

	start := &cobra.Command{
		Use:   "start",
		Short: "Start a local collaboration session",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			_ = ctx

			dir := filepath.Join(repoDataDir(), "collab")
			if err := ensureDir(dir); err != nil {
				return err
			}
			id := nowID("collab")
			payload := map[string]any{
				"id":         id,
				"started_at": time.Now().UTC().Format(time.RFC3339),
				"status":     "active",
			}
			b, _ := jsonMarshalIndent(payload)
			if err := os.WriteFile(filepath.Join(dir, "session.json"), b, 0o644); err != nil {
				return err
			}
			fmt.Printf("Collab session started: %s\n", id)
			return nil
		},
	}

	status := &cobra.Command{
		Use:   "status",
		Short: "Show current collab session status",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := filepath.Join(repoDataDir(), "collab", "session.json")
			b, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			fmt.Println(string(b))
			return nil
		},
	}

	stop := &cobra.Command{
		Use:   "stop",
		Short: "Stop current collab session",
		RunE: func(cmd *cobra.Command, args []string) error {
			path := filepath.Join(repoDataDir(), "collab", "session.json")
			_ = os.Remove(path)
			fmt.Println("Collab session stopped")
			return nil
		},
	}

	root.AddCommand(start, status, stop)
	return root
}
