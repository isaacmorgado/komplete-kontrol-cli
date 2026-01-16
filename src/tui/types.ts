/**
 * TUI Message Types
 * 
 * This file defines all message types used in the Bubbletea TUI system.
 * Messages are the primary way components communicate state changes.
 */

// ============================================================================
// Core Bubbletea Messages
// ============================================================================

export interface InitMsg {
  type: 'init';
}

export interface UpdateMsg {
  type: 'update';
  time: Date;
}

export interface TickMsg {
  type: 'tick';
  time: Date;
}

export interface QuitMsg {
  type: 'quit';
}

// ============================================================================
// User Input Messages
// ============================================================================

export interface KeyMsg {
  type: 'key';
  key: string;
  alt: boolean;
  ctrl: boolean;
}

export interface MouseMsg {
  type: 'mouse';
  x: number;
  y: number;
  button: string;
}

// ============================================================================
// Window Messages
// ============================================================================

export interface WindowSizeMsg {
  type: 'window_size';
  width: number;
  height: number;
}

// ============================================================================
// Application Messages
// ============================================================================

export interface StartCommandMsg {
  type: 'start_command';
  command: string;
  args: string[];
}

export interface AddOutputMsg {
  type: 'add_output';
  text: string;
  messageType?: 'user' | 'assistant' | 'system' | 'tool' | 'error';
}

export interface UpdateProgressMsg {
  type: 'update_progress';
  progress: number; // 0-100
  message?: string;
}

export interface UpdateStatusMsg {
  type: 'update_status';
  status: 'idle' | 'running' | 'complete' | 'error';
  message?: string;
}

export interface UpdateModelMsg {
  type: 'update_model';
  model: {
    name: string;
    provider: string;
  };
}

export interface UpdateTokensMsg {
  type: 'update_tokens';
  tokensUsed: number;
  cost: number;
}

export interface ShowModalMsg {
  type: 'show_modal';
  modal: {
    title: string;
    message?: string;
    modalType: 'info' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
    onCancel?: () => void;
  };
}

export interface HideModalMsg {
  type: 'hide_modal';
}

export interface ShowHelpMsg {
  type: 'show_help';
}

export interface HideHelpMsg {
  type: 'hide_help';
}

export interface ShowConfigMsg {
  type: 'show_config';
}

export interface HideConfigMsg {
  type: 'hide_config';
}

export interface NavigateMsg {
  type: 'navigate';
  view: 'main' | 'help' | 'config' | 'tools';
}

export interface ThemeChangeMsg {
  type: 'theme_change';
  theme: 'dark' | 'light' | 'auto';
}

// ============================================================================
// Streaming Messages
// ============================================================================

export interface StreamStartMsg {
  type: 'stream_start';
  model: string;
  provider: string;
}

export interface StreamTokenMsg {
  type: 'stream_token';
  token: string;
}

export interface StreamCompleteMsg {
  type: 'stream_complete';
  totalTokens: number;
  cost: number;
}

export interface StreamErrorMsg {
  type: 'stream_error';
  error: string;
}

// ============================================================================
// Tool Messages
// ============================================================================

export interface ToolStartMsg {
  type: 'tool_start';
  toolName: string;
  input: unknown;
}

export interface ToolCompleteMsg {
  type: 'tool_complete';
  toolName: string;
  result: unknown;
}

export interface ToolErrorMsg {
  type: 'tool_error';
  toolName: string;
  error: string;
}

export interface ToolListUpdateMsg {
  type: 'tool_list_update';
  tools: Array<{
    name: string;
    description: string;
    status: 'available' | 'connected' | 'disconnected' | 'error';
    provider: string;
  }>;
}

// ============================================================================
// Verification Messages
// ============================================================================

export interface VerificationStartMsg {
  type: 'verification_start';
  steps: number;
}

export interface VerificationStepMsg {
  type: 'verification_step';
  step: number;
  name: string;
  status: 'running' | 'passed' | 'failed';
}

export interface VerificationCompleteMsg {
  type: 'verification_complete';
  passed: boolean;
  failedSteps: string[];
}

export interface RepairPromptMsg {
  type: 'repair_prompt';
  step: string;
  repairStrategy: string;
  onApprove: () => void;
  onReject: () => void;
}

// ============================================================================
// Union Type for All Messages
// ============================================================================

export type Msg =
  // Core
  | InitMsg
  | UpdateMsg
  | TickMsg
  | QuitMsg
  // User Input
  | KeyMsg
  | MouseMsg
  // Window
  | WindowSizeMsg
  // Application
  | StartCommandMsg
  | AddOutputMsg
  | UpdateProgressMsg
  | UpdateStatusMsg
  | UpdateModelMsg
  | UpdateTokensMsg
  | ShowModalMsg
  | HideModalMsg
  | ShowHelpMsg
  | HideHelpMsg
  | ShowConfigMsg
  | HideConfigMsg
  | NavigateMsg
  | ThemeChangeMsg
  // Streaming
  | StreamStartMsg
  | StreamTokenMsg
  | StreamCompleteMsg
  | StreamErrorMsg
  // Tools
  | ToolStartMsg
  | ToolCompleteMsg
  | ToolErrorMsg
  | ToolListUpdateMsg
  // Verification
  | VerificationStartMsg
  | VerificationStepMsg
  | VerificationCompleteMsg
  | RepairPromptMsg;
