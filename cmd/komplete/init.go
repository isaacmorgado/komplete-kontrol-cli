package main

import (
	"fmt"

	"github.com/komplete-kontrol/cli/internal/config"
	"github.com/spf13/cobra"
)

func NewInitCommand() *cobra.Command {
	var force bool

	cmd := &cobra.Command{
		Use:   "init",
		Short: "Initialize configuration (creates ~/.komplete/config.yaml by default)",
		RunE: func(cmd *cobra.Command, args []string) error {
			mgr, _, err := loadConfigFromFlags(cmd)
			if err != nil {
				return err
			}
			if force {
				if err := mgr.Set(config.DefaultConfig()); err != nil {
					return err
				}
			}
			fmt.Printf("Config ready: %s\n", mgr.GetConfigPath())
			return nil
		},
	}
	cmd.Flags().BoolVar(&force, "force", false, "overwrite existing config with defaults")
	return cmd
}
