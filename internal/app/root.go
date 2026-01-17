package app

import (
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "komplete",
	Short: "KOMPLETE-KONTROL-CLI - AI-powered development assistant",
	Long: `KOMPLETE-KONTROL-CLI is an AI-powered development assistant that helps you
write, refactor, and debug code with support for multiple LLM providers,
tool integration via MCP, and real-time streaming output.`,
	Version: "2.0.0",
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// Add global flags here
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "verbose output")
	rootCmd.PersistentFlags().StringP("config", "c", "", "config file (default is $HOME/.komplete/config.yaml)")
	rootCmd.PersistentFlags().StringP("model", "m", "", "model to use")
	rootCmd.PersistentFlags().Bool("tui", true, "enable TUI interface")
	rootCmd.PersistentFlags().Bool("stream", true, "enable streaming output")

	// Initialize subcommands
	initCommands()
}

func initCommands() {
	// Commands will be registered here
	// rootCmd.AddCommand(autoCmd)
	// rootCmd.AddCommand(buildCmd)
	// rootCmd.AddCommand(checkpointCmd)
	// ... more commands
}

// GetRootCommand returns the root command for testing purposes
func GetRootCommand() *cobra.Command {
	return rootCmd
}
