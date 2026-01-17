package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
)

func NewRootCauseCommand() *cobra.Command {
	root := &cobra.Command{
		Use:   "rootcause",
		Short: "Root cause workflows (minimal Go implementation)",
	}

	analyze := &cobra.Command{
		Use:   "analyze",
		Short: "Capture a snapshot and run a reproduction command",
		RunE: func(cmd *cobra.Command, args []string) error {
			bugDesc, _ := cmd.Flags().GetString("bug-description")
			bugType, _ := cmd.Flags().GetString("bug-type")
			testCmd, _ := cmd.Flags().GetString("test-command")
			if testCmd == "" {
				testCmd = "go test ./..."
			}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			defer cancel()

			id := nowID("snapshot")
			dir := filepath.Join(repoDataDir(), "snapshots")
			if err := ensureDir(dir); err != nil {
				return err
			}

			head, _, _ := runShell(ctx, "git rev-parse HEAD")
			diff, _, _ := runShell(ctx, "git diff")
			status, _, _ := runShell(ctx, "git status --porcelain")
			out, code, err := runShell(ctx, testCmd)
			_ = err

			payload := map[string]any{
				"id": id,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"bug_description": bugDesc,
				"bug_type": bugType,
				"test_command": testCmd,
				"exit_code": code,
				"head": head,
				"status": status,
				"diff": diff,
				"output": out,
			}
			b, _ := jsonMarshalIndent(payload)
			if err := os.WriteFile(filepath.Join(dir, id+".json"), b, 0o644); err != nil {
				return err
			}

			fmt.Printf("Before Snapshot: %s\n", id)
			fmt.Printf("Exit Code: %d\n", code)
			fmt.Print(out)
			return nil
		},
	}
	analyze.Flags().String("bug-description", "", "description of the bug")
	analyze.Flags().String("bug-type", "general", "type of bug")
	analyze.Flags().String("test-command", "", "command to reproduce")

	verify := &cobra.Command{
		Use:   "verify",
		Short: "Run verification command and capture after snapshot",
		RunE: func(cmd *cobra.Command, args []string) error {
			beforeID, _ := cmd.Flags().GetString("before-snapshot-id")
			testCmd, _ := cmd.Flags().GetString("test-command")
			if beforeID == "" {
				return fmt.Errorf("--before-snapshot-id is required")
			}
			if testCmd == "" {
				return fmt.Errorf("--test-command is required")
			}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			defer cancel()

			id := nowID("snapshot")
			dir := filepath.Join(repoDataDir(), "snapshots")
			if err := ensureDir(dir); err != nil {
				return err
			}

			head, _, _ := runShell(ctx, "git rev-parse HEAD")
			diff, _, _ := runShell(ctx, "git diff")
			status, _, _ := runShell(ctx, "git status --porcelain")
			out, code, err := runShell(ctx, testCmd)
			_ = err

			payload := map[string]any{
				"id": id,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"before_snapshot_id": beforeID,
				"test_command": testCmd,
				"exit_code": code,
				"head": head,
				"status": status,
				"diff": diff,
				"output": out,
			}
			b, _ := jsonMarshalIndent(payload)
			if err := os.WriteFile(filepath.Join(dir, id+".json"), b, 0o644); err != nil {
				return err
			}

			fmt.Printf("Before Snapshot: %s\n", beforeID)
			fmt.Printf("After Snapshot: %s\n", id)
			fmt.Printf("Exit Code: %d\n", code)
			fmt.Print(out)
			return nil
		},
	}
	verify.Flags().String("before-snapshot-id", "", "snapshot id from analyze")
	verify.Flags().String("test-command", "", "test command to run")
	verify.Flags().String("fix-description", "", "description of the fix")

	root.AddCommand(analyze, verify)
	return root
}
