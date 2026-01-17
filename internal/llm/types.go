package llm

import "github.com/komplete-kontrol/cli/internal/llmapi"

// Re-export llmapi types to keep internal imports stable.

type ProviderType = llmapi.ProviderType

const (
	ProviderAnthropic = llmapi.ProviderAnthropic
	ProviderOpenAI    = llmapi.ProviderOpenAI
	ProviderGemini    = llmapi.ProviderGemini
	ProviderVSCode    = llmapi.ProviderVSCode
	ProviderLocal     = llmapi.ProviderLocal
	ProviderMCP       = llmapi.ProviderMCP
)

type ModelInfo = llmapi.ModelInfo
type ModelCapabilities = llmapi.ModelCapabilities

type Provider = llmapi.Provider
type StreamHandler = llmapi.StreamHandler

type CompletionRequest = llmapi.CompletionRequest
type CompletionResponse = llmapi.CompletionResponse
type Message = llmapi.Message
type ToolDefinition = llmapi.ToolDefinition
type ToolCall = llmapi.ToolCall
type ToolResult = llmapi.ToolResult
type TokenUsage = llmapi.TokenUsage

