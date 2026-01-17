package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

func NewCommitCommand() *cobra.Command {
	var message string
	var all bool

	cmd := &cobra.Command{
		Use:   "commit",
		Short: "Create a git commit (minimal wrapper)",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()

			if strings.TrimSpace(message) == "" {
				return fmt.Errorf("--message is required")
			}
			if all {
				_, _, _ = runShell(ctx, "git add -A")
			}
			out, code, err := runShell(ctx, fmt.Sprintf("git commit -m %q", message))
			fmt.Print(out)
			if err != nil {
				return fmt.Errorf("git commit failed (exit %d): %w", code, err)
			}
			return nil
		},
	}
	cmd.Flags().StringVarP(&message, "message", "m", "", "commit message")
	cmd.Flags().BoolVar(&all, "all", false, "stage all changes before commit")
	return cmd
}
