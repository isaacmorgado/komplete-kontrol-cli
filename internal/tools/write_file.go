package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// WriteFileHandler implements a simple local file writer tool.
// It is intentionally minimal and intended for controlled, explicit calls.
type WriteFileHandler struct{}

func NewWriteFileHandler() *WriteFileHandler { return &WriteFileHandler{} }

func (h *WriteFileHandler) Execute(ctx context.Context, input map[string]any) (*ToolResult, error) {
	_ = ctx
	path, _ := input["path"].(string)
	content, _ := input["content"].(string)
	mode, _ := input["mode"].(string)
	mkdir, _ := input["mkdir"].(bool)

	path = strings.TrimSpace(path)
	if path == "" {
		return &ToolResult{Success: false, Error: "missing path"}, fmt.Errorf("missing path")
	}
	// Basic safety: disallow writing outside the repo via absolute paths.
	if filepath.IsAbs(path) {
		return &ToolResult{Success: false, Error: "absolute paths are not allowed"}, fmt.Errorf("absolute paths are not allowed")
	}

	if mkdir {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return &ToolResult{Success: false, Error: err.Error()}, err
		}
	}

	if strings.EqualFold(mode, "append") {
		f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
		if err != nil {
			return &ToolResult{Success: false, Error: err.Error()}, err
		}
		defer f.Close()
		if _, err := f.WriteString(content); err != nil {
			return &ToolResult{Success: false, Error: err.Error()}, err
		}
		return &ToolResult{Success: true, Data: map[string]any{"path": path, "bytes": len(content), "mode": "append"}}, nil
	}

	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return &ToolResult{Success: false, Error: err.Error()}, err
	}
	return &ToolResult{Success: true, Data: map[string]any{"path": path, "bytes": len(content), "mode": "overwrite"}}, nil
}

