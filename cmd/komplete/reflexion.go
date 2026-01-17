package main

import (
	"github.com/spf13/cobra"
)

func NewReflexionCommand() *cobra.Command {
	// Alias to `reflect` for now.
	cmd := NewReflectCommand()
	cmd.Use = "reflexion <goal>"
	cmd.Short = "Alias for reflect"
	return cmd
}
