/**
 * TUI Types for Komplete Kontrol CLI
 * Defines interfaces for TUI components and models
 */

// ============================================================================
// Message Types (Elm-inspired architecture)
// ============================================================================

export type AppMsg =
  | InitMsg
  | UpdateMsg
  | TickMsg
  | QuitMsg
  | KeyMsg
  | WindowSizeMsg
  | CommandMsg
  | OutputMsg
  | ProgressMsg
  | StatusMsg
  | ThemeMsg;

export interface InitMsg {
  type: 'init';
}

export interface UpdateMsg {
  type: 'update';
  data: unknown;
}

export interface TickMsg {
  type: 'tick';
  time: Date;
}

export interface QuitMsg {
  type: 'quit';
}

export interface KeyMsg {
  type: 'key';
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

export interface WindowSizeMsg {
  type: 'window_size';
  width: number;
  height: number;
}

export interface CommandMsg {
  type: 'command';
  command: string;
  args?: string[];
}

export interface OutputMsg {
  type: 'output';
  text: string;
  category?: 'user' | 'assistant' | 'system' | 'tool' | 'error';
  timestamp?: Date;
}

export interface ProgressMsg {
  type: 'progress';
  progress: number;
  total?: number;
  current?: number;
  message?: string;
}

export interface StatusMsg {
  type: 'status';
  status: 'idle' | 'running' | 'complete' | 'error';
  message?: string;
}

export interface ThemeMsg {
  type: 'theme';
  mode: 'dark' | 'light' | 'auto';
}

// ============================================================================
// Model Types
// ============================================================================

export interface AppState {
  status: 'idle' | 'running' | 'complete' | 'error';
  currentCommand?: string;
  messages: OutputMessage[];
  progress: number;
  theme: 'dark' | 'light' | 'auto';
  modelInfo?: ModelInfo;
  tokensUsed: number;
  cost: number;
  streaming: boolean;
}

export interface ModelInfo {
  name: string;
  provider: string;
  version?: string;
  capabilities?: string[];
}

// ============================================================================
// Component Types
// ============================================================================

export interface OutputMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool' | 'error';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: unknown;
}

export interface ToolInfo {
  name: string;
  description: string;
  status: 'available' | 'connected' | 'disconnected' | 'error';
  provider: string;
}

export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableRow {
  [key: string]: string | number;
}

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
  icon?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ConfigItem {
  key: string;
  label: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
}

export interface HelpItem {
  command: string;
  description: string;
  usage: string;
  examples: string[];
}

// ============================================================================
// View Interface
// ============================================================================

export interface View {
  render(): string;
}

// ============================================================================
// Update Interface (Elm-inspired)
// ============================================================================

export type Cmd = () => void;
export type Sub<T> = () => T;

export interface Update<Model, Msg> {
  model: Model;
  cmd?: Cmd;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface StatusBarProps {
  model: ModelInfo;
  tokensUsed: number;
  cost: number;
  status: 'idle' | 'running' | 'complete' | 'error';
  streaming?: boolean;
}

export interface ProgressIndicatorProps {
  progress: number;
  total?: number;
  current?: number;
  message?: string;
  showPercentage?: boolean;
  style?: 'bar' | 'dots' | 'spinner';
}

export interface OutputPanelProps {
  messages: OutputMessage[];
  maxHeight?: number;
  autoScroll?: boolean;
  syntaxHighlight?: boolean;
}

export interface CodePreviewProps {
  code: string;
  language: string;
  currentLine?: number;
  showLineNumbers?: boolean;
  highlightSyntax?: boolean;
  readOnly?: boolean;
  filePath?: string;
}

export interface TextInputProps {
  placeholder?: string;
  value?: string;
  multiline?: boolean;
  maxLength?: number;
  mask?: boolean;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
}

export interface TableProps {
  columns: TableColumn[];
  rows: TableRow[];
  selectedRow?: number;
  onRowSelect?: (row: number) => void;
  maxHeight?: number;
}

export interface SpinnerProps {
  message?: string;
  style?: 'dots' | 'line' | 'arrow' | 'bouncing';
  color?: string;
}

export interface HelpPanelProps {
  commands: HelpItem[];
  filter?: string;
  maxHeight?: number;
}

export interface ConfigPanelProps {
  items: ConfigItem[];
  onSave?: (key: string, value: unknown) => void;
}

export interface ToolListProps {
  tools: ToolInfo[];
  filter?: string;
  onToolSelect?: (tool: ToolInfo) => void;
}

export interface ModalProps {
  title: string;
  message?: string;
  type: 'info' | 'warning' | 'error' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: View;
  showCloseButton?: boolean;
}

export interface DropdownProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  selected?: string;
  onSelect?: (value: string) => void;
  disabled?: boolean;
}

export interface TreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeExpand?: (node: TreeNode) => void;
  maxHeight?: number;
}

export interface ChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'pie';
  width?: number;
  height?: number;
}

export interface TerminalProps {
  command?: string;
  onCommand?: (cmd: string) => void;
  readOnly?: boolean;
  maxHeight?: number;
  showPrompt?: boolean;
}

export interface DiffViewProps {
  before: string;
  after: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
