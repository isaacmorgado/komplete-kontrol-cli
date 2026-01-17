package main

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
)

func NewMultiRepoCommand() *cobra.Command {
	var root string

	cmd := &cobra.Command{
		Use:   "multi-repo",
		Short: "Multi-repo helpers (minimal scan)",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if root == "" {
				root = "."
			}
			root = filepath.Clean(root)
			out, _, err := runShell(ctx, fmt.Sprintf("find %q -maxdepth 3 -type d -name .git -print", root))
			if err != nil {
				return err
			}
			fmt.Print(out)
			return nil
		},
	}
	cmd.Flags().StringVar(&root, "root", ".", "root directory to scan")
	return cmd
}
