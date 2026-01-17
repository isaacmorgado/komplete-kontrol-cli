package main

import (
	"fmt"
	"os"

	"github.com/komplete-kontrol/cli/internal/app"
)

func main() {
	// Initialize commands
	rootCmd := app.GetRootCommand()
	
	// Add all subcommands
	rootCmd.AddCommand(NewAutoCommand())
	rootCmd.AddCommand(NewBuildCommand())
	rootCmd.AddCommand(NewCheckpointCommand())
	rootCmd.AddCommand(NewCollabCommand())
	rootCmd.AddCommand(NewCommitCommand())
	rootCmd.AddCommand(NewCompactCommand())
	rootCmd.AddCommand(NewInitCommand())
	rootCmd.AddCommand(NewMultiRepoCommand())
	rootCmd.AddCommand(NewPersonalityCommand())
	rootCmd.AddCommand(NewReCommand())
	rootCmd.AddCommand(NewReflectCommand())
	rootCmd.AddCommand(NewReflexionCommand())
	rootCmd.AddCommand(NewResearchApiCommand())
	rootCmd.AddCommand(NewResearchCommand())
	rootCmd.AddCommand(NewRootCauseCommand())
	rootCmd.AddCommand(NewScreenshotToCodeCommand())
	rootCmd.AddCommand(NewSPARCCommand())
	rootCmd.AddCommand(NewSwarmCommand())
	rootCmd.AddCommand(NewTUICommand())
	rootCmd.AddCommand(NewTUISmokeCommand())
	rootCmd.AddCommand(NewVoiceCommand())
	
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
