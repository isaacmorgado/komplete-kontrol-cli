package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
)

func NewPersonalityCommand() *cobra.Command {
	root := &cobra.Command{
		Use:   "personality",
		Short: "Manage personalities (minimal Go implementation)",
	}

	list := &cobra.Command{
		Use:   "list",
		Short: "List available personalities (from personalities/*.yaml)",
		RunE: func(cmd *cobra.Command, args []string) error {
			entries, err := os.ReadDir("personalities")
			if err != nil {
				return err
			}
			for _, e := range entries {
				if strings.HasSuffix(e.Name(), ".yaml") {
					fmt.Println(strings.TrimSuffix(e.Name(), ".yaml"))
				}
			}
			return nil
		},
	}

	set := &cobra.Command{
		Use:   "set <name>",
		Short: "Set current personality (writes .komplete/personality.txt)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := ensureDir(repoDataDir()); err != nil {
				return err
			}
			path := filepath.Join(repoDataDir(), "personality.txt")
			if err := os.WriteFile(path, []byte(args[0]), 0o644); err != nil {
				return err
			}
			fmt.Printf("Personality set: %s\n", args[0])
			return nil
		},
	}

	get := &cobra.Command{
		Use:   "get",
		Short: "Get current personality",
		RunE: func(cmd *cobra.Command, args []string) error {
			b, err := os.ReadFile(filepath.Join(repoDataDir(), "personality.txt"))
			if err != nil {
				return err
			}
			fmt.Println(strings.TrimSpace(string(b)))
			return nil
		},
	}

	root.AddCommand(list, set, get)
	return root
}
