package main

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
)

func NewBuildCommand() *cobra.Command {
	var out string

	cmd := &cobra.Command{
		Use:   "build",
		Short: "Build the project",
		Long:  `Build the komplete-kontrol CLI project.
Compiles the Go binary with all dependencies and optimizations.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			defer cancel()
			if out == "" {
				out = filepath.Join("dist", "komplete")
			}
			if err := ensureDir(filepath.Dir(out)); err != nil {
				return err
			}
			buildCmd := fmt.Sprintf("go build -ldflags='-s -w' -o %s ./cmd/komplete", out)
			fmt.Println(buildCmd)
			outStr, code, err := runShell(ctx, buildCmd)
			fmt.Print(outStr)
			if err != nil {
				return fmt.Errorf("build failed (exit %d): %w", code, err)
			}
			fmt.Printf("Build complete: %s\n", out)
			return nil
		},
	}
	cmd.Flags().StringVar(&out, "out", "", "output binary path (default dist/komplete)")
	return cmd
}
