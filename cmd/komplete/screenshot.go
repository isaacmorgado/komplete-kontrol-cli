package main

import (
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func NewScreenshotToCodeCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "screenshot <image>",
		Short: "Inspect a screenshot file (dimensions/format) (minimal Go implementation)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			f, err := os.Open(args[0])
			if err != nil {
				return err
			}
			defer f.Close()
			cfg, format, err := image.DecodeConfig(f)
			if err != nil {
				return err
			}
			fmt.Printf("Format: %s\n", format)
			fmt.Printf("Width: %d\nHeight: %d\n", cfg.Width, cfg.Height)
			return nil
		},
	}
	return cmd
}
