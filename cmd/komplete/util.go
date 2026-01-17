package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/komplete-kontrol/cli/internal/config"
	"github.com/komplete-kontrol/cli/internal/llm"
	"github.com/spf13/cobra"
)

func loadConfigFromFlags(cmd *cobra.Command) (*config.Manager, *config.Config, error) {
	// Respect root --config by using env var honored by config.getConfigPath().
	if cmd != nil && cmd.Root() != nil {
		if p, _ := cmd.Root().PersistentFlags().GetString("config"); p != "" {
			_ = os.Setenv("KOMPLETE_CONFIG", p)
		}
	}

	mgr := config.NewManager()
	if err := mgr.Load(); err != nil {
		return nil, nil, err
	}
	if err := mgr.Validate(); err != nil {
		return nil, nil, err
	}
	return mgr, mgr.Get(), nil
}

func selectModel(cmd *cobra.Command, cfg *config.Config) string {
	if cmd != nil && cmd.Root() != nil {
		if m, _ := cmd.Root().PersistentFlags().GetString("model"); m != "" {
			return m
		}
	}
	if cfg != nil && cfg.Models.Default != "" {
		return cfg.Models.Default
	}
	return ""
}

func newModelManager(cfg *config.Config) *llm.ModelManager {
	return llm.NewModelManager(cfg)
}

type stdoutStreamHandler struct{}

func (h *stdoutStreamHandler) OnToken(token string) {
	_, _ = os.Stdout.WriteString(token)
}

func (h *stdoutStreamHandler) OnDone(_ *llm.CompletionResponse) {}

func (h *stdoutStreamHandler) OnError(err error) {
	_, _ = fmt.Fprintf(os.Stderr, "\nerror: %v\n", err)
}

func runShell(ctx context.Context, command string) (string, int, error) {
	// Use sh for portability on macOS.
	c := exec.CommandContext(ctx, "/bin/sh", "-c", command)
	var out bytes.Buffer
	var stderr bytes.Buffer
	c.Stdout = &out
	c.Stderr = &stderr
	err := c.Run()
	exitCode := 0
	if c.ProcessState != nil {
		exitCode = c.ProcessState.ExitCode()
	}
	if err != nil {
		// include stderr in error
		return out.String() + stderr.String(), exitCode, err
	}
	return out.String() + stderr.String(), exitCode, nil
}

func ensureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

func nowID(prefix string) string {
	return fmt.Sprintf("%s-%s", prefix, time.Now().UTC().Format("20060102T150405Z"))
}

func repoDataDir() string {
	return filepath.Join(".komplete")
}

func saveLastPrompt(prompt string) error {
	if strings.TrimSpace(prompt) == "" {
		return nil
	}
	if err := ensureDir(repoDataDir()); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(repoDataDir(), "last_prompt.txt"), []byte(prompt), 0o644)
}

func jsonMarshalIndent(v any) ([]byte, error) {
	return json.MarshalIndent(v, "", "  ")
}
