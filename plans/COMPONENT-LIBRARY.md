# KOMPLETE-KONTROL-CLI - Component Library Specification

**Version:** 2.0
**Date:** 2025-01-16
**Framework:** Bubbletea (Elm-inspired TUI)

---

## Overview

The component library provides reusable UI elements built on Bubbletea's Elm architecture pattern. All components implement the `View` interface and are composable for building complex TUI layouts.

### Component Design Principles

1. **Pure Rendering**: Components are pure functions that return UI strings
2. **Immutable Props**: Props are passed once and never mutated
3. **Message-Based Updates**: State changes happen via messages, not direct mutation
4. **Composable**: Complex UIs built from simple primitives
5. **Themeable**: All components support theme system

---

## Component Catalog

### 1. StatusBar

**Purpose:** Display system status, model info, tokens, and cost at top of screen

**Location:** `src/tui/components/StatusBar.ts`

**Interface:**

```typescript
interface StatusBarProps {
  model: ModelInfo;
  tokensUsed: number;
  cost: number;
  status: 'idle' | 'running' | 'complete' | 'error';
  streaming?: boolean;
}

class StatusBar implements View {
  constructor(props: StatusBarProps);
  render(): string;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `model` | `ModelInfo` | Current model name and provider | - |
| `tokensUsed` | `number` | Total tokens consumed this session | 0 |
| `cost` | `number` | Total cost in USD | 0.00 |
| `status` | `'idle' \| 'running' \| 'complete' \| 'error'` | Current execution status | 'idle' |
| `streaming` | `boolean` | Is streaming active | false |

**Usage Example:**

```typescript
const statusBar = new StatusBar({
  model: { name: 'Claude Sonnet 4.5', provider: 'anthropic' },
  tokensUsed: 12345,
  cost: 0.0370,
  status: 'running',
  streaming: true,
});

// In view function:
return statusBar.render();
```

**Rendered Output:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ● Claude Sonnet 4.5 (Anthropic) | Tokens: 12,345 | Cost: $0.0370 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. ProgressIndicator

**Purpose:** Show progress bars and status text for long-running operations

**Location:** `src/tui/components/ProgressIndicator.ts`

**Interface:**

```typescript
interface ProgressIndicatorProps {
  progress: number; // 0-100
  total?: number;
  current?: number;
  message?: string;
  showPercentage?: boolean;
  style?: 'bar' | 'dots' | 'spinner';
}

class ProgressIndicator implements View {
  constructor(props: ProgressIndicatorProps);
  render(): string;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `progress` | `number` | Progress percentage (0-100) | 0 |
| `total` | `number` | Total items/operations (optional) | - |
| `current` | `number` | Current item/operation (optional) | - |
| `message` | `string` | Status message to display | 'Processing...' |
| `showPercentage` | `boolean` | Show percentage in bar | true |
| `style` | `'bar' \| 'dots' \| 'spinner'` | Visual style | 'bar' |

**Usage Example:**

```typescript
const progressBar = new ProgressIndicator({
  progress: 65,
  total: 100,
  current: 65,
  message: 'Generating code...',
  showPercentage: true,
  style: 'bar',
});

// Rendered:
// [████████████████████████░░░░░░░░░░] 65% - Generating code...
```

---

### 3. OutputPanel

**Purpose:** Display streaming output, messages, and tool execution results

**Location:** `src/tui/components/OutputPanel.ts`

**Interface:**

```typescript
interface OutputMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool' | 'error';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolResult?: any;
}

interface OutputPanelProps {
  messages: OutputMessage[];
  maxHeight?: number;
  autoScroll?: boolean;
  syntaxHighlight?: boolean;
}

class OutputPanel implements View {
  constructor(props: OutputPanelProps);
  render(): string;
  addMessage(message: OutputMessage): void;
  clear(): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `messages` | `OutputMessage[]` | Array of messages to display | [] |
| `maxHeight` | `number` | Maximum lines to keep in view | 100 |
| `autoScroll` | `boolean` | Auto-scroll to latest message | true |
| `syntaxHighlight` | `boolean` | Highlight code blocks | true |

**Message Types:**

| Type | Color | Icon |
|-------|--------|-------|
| `user` | Blue | `>` |
| `assistant` | Green | `●` |
| `system` | Gray | `ℹ` |
| `tool` | Yellow | `⚙` |
| `error` | Red | `✗` |

**Usage Example:**

```typescript
const outputPanel = new OutputPanel({
  messages: [
    { id: '1', type: 'user', content: 'Create a function', timestamp: new Date() },
    { id: '2', type: 'assistant', content: 'Here is is function...', timestamp: new Date() },
  ],
  maxHeight: 100,
  autoScroll: true,
});

outputPanel.addMessage({
  id: '3',
  type: 'tool',
  content: 'Searching web...',
  toolName: 'tavily_search',
  timestamp: new Date(),
});
```

---

### 4. CodePreview

**Purpose:** Display code with syntax highlighting, line tracking, and file opening

**Location:** `src/tui/components/CodePreview.ts`

**Interface:**

```typescript
interface CodePreviewProps {
  code: string;
  language: string;
  currentLine?: number;
  showLineNumbers?: boolean;
  highlightSyntax?: boolean;
  readOnly?: boolean;
  filePath?: string;
}

class CodePreview implements View {
  constructor(props: CodePreviewProps);
  render(): string;
  updateCode(code: string): void;
  setCurrentLine(line: number): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `code` | `string` | Code content to display | '' |
| `language` | `string` | Language for syntax highlighting | 'typescript' |
| `currentLine` | `number` | Currently executing line | - |
| `showLineNumbers` | `boolean` | Show line numbers | true |
| `highlightSyntax` | `boolean` | Apply syntax highlighting | true |
| `readOnly` | `boolean` | Show as read-only | true |
| `filePath` | `string` | File path for opening | - |

**Usage Example:**

```typescript
const codePreview = new CodePreview({
  code: `function hello() {
    console.log('Hello, World!');
  }`,
  language: 'typescript',
  currentLine: 2,
  showLineNumbers: true,
  highlightSyntax: true,
  filePath: './src/example.ts',
});

// Rendered with syntax highlighting and line 2 highlighted
```

---

### 5. TextInput

**Purpose:** Capture user input for prompts and commands

**Location:** `src/tui/components/TextInput.ts`

**Interface:**

```typescript
interface TextInputProps {
  placeholder?: string;
  value?: string;
  multiline?: boolean;
  maxLength?: number;
  mask?: boolean; // For passwords
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
}

class TextInput implements View {
  constructor(props: TextInputProps);
  render(): string;
  focus(): void;
  blur(): void;
  getValue(): string;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `placeholder` | `string` | Placeholder text | '' |
| `value` | `string` | Initial value | '' |
| `multiline` | `boolean` | Allow multiple lines | false |
| `maxLength` | `number` | Maximum character limit | - |
| `mask` | `boolean` | Hide input (passwords) | false |
| `onSubmit` | `function` | Callback on Enter | - |
| `onChange` | `function` | Callback on input change | - |

**Usage Example:**

```typescript
const promptInput = new TextInput({
  placeholder: 'Enter your prompt...',
  multiline: true,
  maxLength: 1000,
  onSubmit: (value) => {
    console.log('Submitted:', value);
  },
});
```

---

### 6. Table

**Purpose:** Display tabular data with sorting and selection

**Location:** `src/tui/components/Table.ts`

**Interface:**

```typescript
interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface TableRow {
  [key: string]: string | number;
}

interface TableProps {
  columns: TableColumn[];
  rows: TableRow[];
  selectedRow?: number;
  onRowSelect?: (row: number) => void;
  maxHeight?: number;
}

class Table implements View {
  constructor(props: TableProps);
  render(): string;
  setRows(rows: TableRow[]): void;
  sort(column: string): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `columns` | `TableColumn[]` | Column definitions | [] |
| `rows` | `TableRow[]` | Data rows | [] |
| `selectedRow` | `number` | Currently selected row index | - |
| `onRowSelect` | `function` | Callback on row selection | - |
| `maxHeight` | `number` | Maximum rows to display | - |

**Usage Example:**

```typescript
const modelTable = new Table({
  columns: [
    { key: 'name', header: 'Model', width: 30 },
    { key: 'provider', header: 'Provider', width: 20 },
    { key: 'cost', header: 'Cost/1k', align: 'right' },
  ],
  rows: [
    { name: 'Claude Sonnet 4.5', provider: 'Anthropic', cost: '$0.003' },
    { name: 'GPT-4o-mini', provider: 'OpenAI', cost: '$0.001' },
  ],
  onRowSelect: (row) => {
    console.log('Selected:', row);
  },
});
```

---

### 7. Spinner

**Purpose:** Show animated spinner for loading states

**Location:** `src/tui/components/Spinner.ts`

**Interface:**

```typescript
interface SpinnerProps {
  message?: string;
  style?: 'dots' | 'line' | 'arrow' | 'bouncing';
  color?: string;
}

class Spinner implements View {
  constructor(props: SpinnerProps);
  render(): string;
  start(): void;
  stop(): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `message` | `string` | Message to display | 'Loading...' |
| `style` | `'dots' \| 'line' \| 'arrow' \| 'bouncing'` | Animation style | 'dots' |
| `color` | `string` | ANSI color code | yellow |

**Spinner Styles:**

| Style | Animation |
|--------|-----------|
| `dots` | `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏` |
| `line` | `│ ┤ ┴ ┬ ├ ─` |
| `arrow` | `← ↑ → ↓` |
| `bouncing` | `⠁ ⠂ ⠄ ⠂` |

**Usage Example:**

```typescript
const spinner = new Spinner({
  message: 'Connecting to model...',
  style: 'dots',
  color: 'yellow',
});

spinner.start();
// ... do work
spinner.stop();
```

---

### 8. HelpPanel

**Purpose:** Display command help and documentation

**Location:** `src/tui/components/HelpPanel.ts`

**Interface:**

```typescript
interface HelpItem {
  command: string;
  description: string;
  usage: string;
  examples: string[];
}

interface HelpPanelProps {
  commands: HelpItem[];
  filter?: string;
  maxHeight?: number;
}

class HelpPanel implements View {
  constructor(props: HelpPanelProps);
  render(): string;
  setFilter(filter: string): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `commands` | `HelpItem[]` | Command documentation | [] |
| `filter` | `string` | Filter commands by text | '' |
| `maxHeight` | `number` | Maximum items to display | - |

**Usage Example:**

```typescript
const helpPanel = new HelpPanel({
  commands: [
    {
      command: 'auto',
      description: 'Autonomous mode with verification',
      usage: 'komplete auto [prompt]',
      examples: ['komplete auto "Create a REST API"'],
    },
  ],
  filter: 'au', // Shows only 'auto'
});
```

---

### 9. ConfigPanel

**Purpose:** Display and edit configuration settings

**Location:** `src/tui/components/ConfigPanel.ts`

**Interface:**

```typescript
interface ConfigItem {
  key: string;
  label: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[]; // For select type
}

interface ConfigPanelProps {
  items: ConfigItem[];
  onSave?: (key: string, value: any) => void;
}

class ConfigPanel implements View {
  constructor(props: ConfigPanelProps);
  render(): string;
  setValue(key: string, value: any): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `items` | `ConfigItem[]` | Configuration items | [] |
| `onSave` | `function` | Callback on save | - |

**Config Item Types:**

| Type | Input Method |
|-------|-------------|
| `text` | Text input field |
| `number` | Number input with arrows |
| `boolean` | Toggle switch |
| `select` | Dropdown selection |

**Usage Example:**

```typescript
const configPanel = new ConfigPanel({
  items: [
    { key: 'defaultModel', label: 'Default Model', value: 'claude-sonnet-4.5', type: 'select', options: ['claude-sonnet-4.5', 'gpt-4o-mini'] },
    { key: 'streaming', label: 'Enable Streaming', value: true, type: 'boolean' },
    { key: 'maxTokens', label: 'Max Tokens', value: 200000, type: 'number' },
  ],
  onSave: (key, value) => {
    console.log('Saved:', key, value);
  },
});
```

---

### 10. ToolList

**Purpose:** Display available tools and their status

**Location:** `src/tui/components/ToolList.ts`

**Interface:**

```typescript
interface ToolInfo {
  name: string;
  description: string;
  status: 'available' | 'connected' | 'disconnected' | 'error';
  provider: string;
}

interface ToolListProps {
  tools: ToolInfo[];
  filter?: string;
  onToolSelect?: (tool: ToolInfo) => void;
}

class ToolList implements View {
  constructor(props: ToolListProps);
  render(): string;
  setFilter(filter: string): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `tools` | `ToolInfo[]` | Available tools | [] |
| `filter` | `string` | Filter tools by text | '' |
| `onToolSelect` | `function` | Callback on tool selection | - |

**Tool Status Indicators:**

| Status | Icon | Color |
|--------|-------|--------|
| `available` | `✓` | Green |
| `connected` | `●` | Blue |
| `disconnected` | `○` | Gray |
| `error` | `✗` | Red |

**Usage Example:**

```typescript
const toolList = new ToolList({
  tools: [
    { name: 'tavily_search', description: 'Web search', status: 'connected', provider: 'Tavily' },
    { name: 'base44_app', description: 'No-code builder', status: 'available', provider: 'Base44' },
  ],
  onToolSelect: (tool) => {
    console.log('Selected tool:', tool.name);
  },
});
```

---

### 11. Modal

**Purpose:** Display dialogs for confirmations, inputs, and alerts

**Location:** `src/tui/components/Modal.ts`

**Interface:**

```typescript
interface ModalProps {
  title: string;
  message?: string;
  type: 'info' | 'warning' | 'error' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: View;
  showCloseButton?: boolean;
}

class Modal implements View {
  constructor(props: ModalProps);
  render(): string;
  confirm(): void;
  cancel(): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `title` | `string` | Modal title | - |
| `message` | `string` | Content message | - |
| `type` | `'info' \| 'warning' \| 'error' \| 'confirm'` | Modal type | 'info' |
| `onConfirm` | `function` | Callback on confirm | - |
| `onCancel` | `function` | Callback on cancel | - |
| `children` | `View` | Custom content | - |
| `showCloseButton` | `boolean` | Show X button | true |

**Usage Example:**

```typescript
const modal = new Modal({
  title: 'Confirm Action',
  message: 'This will modify 3 files. Continue?',
  type: 'confirm',
  onConfirm: () => {
    console.log('Confirmed!');
  },
  onCancel: () => {
    console.log('Cancelled!');
  },
});

// Rendered:
// ┌─────────────────────────┐
// │  Confirm Action      │
// │                   │
// │ This will modify 3 files. Continue?
// │                   │
// │  [Yes]  [No]     │
// └─────────────────────────┘
```

---

### 12. Dropdown

**Purpose:** Select from list of options

**Location:** `src/tui/components/Dropdown.ts`

**Interface:**

```typescript
interface DropdownProps {
  label?: string;
  options: Array<{ value: string; label: string }>;
  selected?: string;
  onSelect?: (value: string) => void;
  disabled?: boolean;
}

class Dropdown implements View {
  constructor(props: DropdownProps);
  render(): string;
  select(value: string): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `label` | `string` | Field label | - |
| `options` | `Array<{value, label}>` | Available options | [] |
| `selected` | `string` | Currently selected value | - |
| `onSelect` | `function` | Callback on selection | - |
| `disabled` | `boolean` | Disable interaction | false |

**Usage Example:**

```typescript
const dropdown = new Dropdown({
  label: 'Model:',
  options: [
    { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  selected: 'claude-sonnet-4.5',
  onSelect: (value) => {
    console.log('Selected:', value);
  },
});

// Rendered:
// Model:
//   [Claude Sonnet 4.5  ▼]
//   [GPT-4o Mini      ]
//   [Gemini 1.5 Flash    ]
```

---

### 13. Tree

**Purpose:** Hierarchical file/project navigation

**Location:** `src/tui/components/Tree.ts`

**Interface:**

```typescript
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
  icon?: string;
}

interface TreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeExpand?: (node: TreeNode) => void;
  maxHeight?: number;
}

class Tree implements View {
  constructor(props: TreeProps);
  render(): string;
  expandNode(id: string): void;
  collapseNode(id: string): void;
  selectNode(id: string): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `nodes` | `TreeNode[]` | Tree nodes to display | [] |
| `selectedId` | `string` | Currently selected node ID | - |
| `onNodeSelect` | `function` | Callback on node selection | - |
| `onNodeExpand` | `function` | Callback on expand/collapse | - |
| `maxHeight` | `number` | Maximum height | - |

**Usage Example:**

```typescript
const tree = new Tree({
  nodes: [
    {
      id: '1',
      label: 'src',
      icon: '📁',
      children: [
        { id: '2', label: 'tui' },
        { id: '3', label: 'components' },
      ],
    },
    {
      id: '4',
      label: 'src',
      icon: '📁',
      children: [
        { id: '5', label: 'cli' },
        { id: '6', label: 'commands' },
      ],
    },
  ],
  onNodeSelect: (node) => {
    console.log('Selected:', node.label);
  },
});

// Rendered:
// 📁 src
//   ├─ 📁 tui
//   │  ├─ components
//   │  └─ Tree.ts
//   └─ 📁 cli
//       ├─ commands
//       └─ index.ts
```

---

### 14. Chart

**Purpose:** Visual data representation

**Location:** `src/tui/components/Chart.ts`

**Interface:**

```typescript
interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'bar' | 'line' | 'pie';
  width?: number;
  height?: number;
}

class Chart implements View {
  constructor(props: ChartProps);
  render(): string;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `title` | `string` | Chart title | - |
| `data` | `ChartDataPoint[]` | Data points | [] |
| `type` | `'bar' \| 'line' \| 'pie'` | Chart type | 'bar' |
| `width` | `number` | Chart width | - |
| `height` | `number` | Chart height | - |

**Usage Example:**

```typescript
const chart = new Chart({
  title: 'Token Usage by Provider',
  data: [
    { label: 'Anthropic', value: 12345 },
    { label: 'OpenAI', value: 5678 },
    { label: 'Gemini', value: 2345 },
  ],
  type: 'bar',
  width: 40,
  height: 10,
});

// Rendered:
// Token Usage by Provider
// 
// Anthropic ████████████████ 12,345
// OpenAI   ██████░░░░░░░░ 5,678
// Gemini   ███░░░░░░░░░ 2,345
```

---

### 15. Terminal

**Purpose:** Embedded terminal for command execution

**Location:** `src/tui/components/Terminal.ts`

**Interface:**

```typescript
interface TerminalProps {
  command?: string;
  onCommand?: (cmd: string) => void;
  readOnly?: boolean;
  maxHeight?: number;
  showPrompt?: boolean;
}

class Terminal implements View {
  constructor(props: TerminalProps);
  render(): string;
  executeCommand(cmd: string): void;
  setCommand(cmd: string): void;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `command` | `string` | Initial command | - |
| `onCommand` | `function` | Callback on command execution | - |
| `readOnly` | `boolean` | Read-only mode | false |
| `maxHeight` | `number` | Maximum lines | - |
| `showPrompt` | `boolean` | Show prompt line | true |

**Usage Example:**

```typescript
const terminal = new Terminal({
  command: 'ls -la',
  onCommand: (cmd) => {
    console.log('Executing:', cmd);
  },
  showPrompt: true,
});

// Rendered:
// ┌─────────────────────────┐
// │ $ ls -la           │
// │ └─────────────────────────┘
```

---

### 16. DiffView

**Purpose:** Show before/after changes

**Location:** `src/tui/components/DiffView.ts`

**Interface:**

```typescript
interface DiffLine {
  type: 'add' | 'remove' | 'modify';
  content: string;
  lineNumber?: number;
}

interface DiffViewProps {
  before: string;
  after: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
}

class DiffView implements View {
  constructor(props: DiffViewProps);
  render(): string;
}
```

**Props:**

| Prop | Type | Description | Default |
|-------|--------|-------------|----------|
| `before` | `string` | Original content | - |
| `after` | `string` | Modified content | - |
| `language` | `string` | Language for syntax highlighting | - |
| `showLineNumbers` | `boolean` | Show line numbers | true |
| `maxHeight` | `number` | Maximum height | - |

**Usage Example:**

```typescript
const diffView = new DiffView({
  before: 'function hello() {',
  after: 'function hello() {\n  console.log("Hi!");\n}',
  language: 'typescript',
  showLineNumbers: true,
});

// Rendered:
// ┌─────────────────────────┐
// │  1. -function hello() {  │
// │  2. +function hello() {  │
// │  3. |  console.log("Hi!");  │
// │  4. +}                    │
// │  5. |}                    │
// └─────────────────────────┘
```

---

## Component Composition

### Layout Components

**MainLayout** - Combines sidebar and content area

```typescript
class MainLayout implements View {
  constructor(props: {
    sidebar?: View;
    content: View;
  });
  render(): string;
}
```

**SplitLayout** - Horizontal or vertical split

```typescript
class SplitLayout implements View {
  constructor(props: {
    direction: 'horizontal' | 'vertical';
    left: View;
    right: View;
    ratio?: number; // 0-1, default 0.5
  });
  render(): string;
}
```

**Tabs** - Tabbed interface

```typescript
class Tabs implements View {
  constructor(props: {
    tabs: Array<{ id: string; label: string; content: View }>;
    activeTab: string;
  });
  render(): string;
  setActiveTab(id: string): void;
}
```

---

## Event Handling

### Message Types

```typescript
// User input messages
type KeyMsg = { type: 'key'; key: Key };

// Timer messages
type TickMsg = { type: 'tick'; time: Date };

// Window resize messages
type WindowSizeMsg = { type: 'window_size'; width: number; height: number };

// Custom application messages
type AppMsg = 
  | { type: 'start_command'; command: string }
  | { type: 'add_output'; text: string }
  | { type: 'update_progress'; progress: number };
```

### Message Subscription

```typescript
const subscriptions = (model: AppModel) => {
  return [
    tea.Subscribe('tick', () => TickMsg({ type: 'tick', time: new Date() })),
    tea.Subscribe('key', (msg) => KeyMsg({ type: 'key', key: msg.key })),
    tea.Subscribe('window_size', (msg) => WindowSizeMsg({ type: 'window_size', width: msg.width, height: msg.height })),
  ];
};
```

---

## Best Practices

### 1. Pure Functions

```typescript
// Good - Pure function
const updateProgress = (model: AppModel, progress: number): AppModel => ({
  ...model,
  progress,
});

// Bad - Mutation
const updateProgress = (model: AppModel, progress: number) => {
  model.progress = progress; // Don't do this!
  return model;
};
```

### 2. Immutable Updates

```typescript
// Good - Create new object
const newState = { ...model, status: 'running' };

// Bad - Mutate existing
model.status = 'running';
```

### 3. Component Reusability

```typescript
// Create small, focused components
class Button implements View { }
class Input implements View { }
class Label implements View { }

// Compose into larger components
class Form implements View {
  render() {
    return `
      ${new Label({ text: 'Name' }).render()}
      ${new Input({ placeholder: 'Enter name' }).render()}
      ${new Button({ text: 'Submit' }).render()}
    `;
  }
}
```

### 4. Performance

- Batch UI updates when possible
- Limit history display size
- Use efficient string concatenation
- Cache rendered output

### 5. Testing

```typescript
// Pure functions are easy to test
describe('StatusBar', () => {
  it('displays model name', () => {
    const statusBar = new StatusBar({
      model: { name: 'Test', provider: 'test' },
      tokensUsed: 0,
      cost: 0,
      status: 'idle',
    });
    const output = statusBar.render();
    expect(output).toContain('Test');
  });
});
```

---

## Advanced Usage Examples

### Example 1: Command Execution UI

```typescript
import { StatusBar } from './StatusBar';
import { OutputPanel } from './OutputPanel';
import { ProgressIndicator } from './ProgressIndicator';
import { TextInput } from './TextInput';

class CommandUI implements View {
  private statusBar: StatusBar;
  private outputPanel: OutputPanel;
  private progress: ProgressIndicator;
  private input: TextInput;

  constructor() {
    this.statusBar = new StatusBar({
      model: { name: 'Claude Sonnet 4.5', provider: 'anthropic' },
      tokensUsed: 0,
      cost: 0,
      status: 'idle',
    });
    
    this.outputPanel = new OutputPanel({
      messages: [],
      maxHeight: 100,
      autoScroll: true,
    });
    
    this.progress = new ProgressIndicator({
      progress: 0,
      message: 'Ready',
    });
    
    this.input = new TextInput({
      placeholder: 'Enter command...',
      multiline: false,
      onSubmit: this.handleCommand,
    });
  }

  render(): string {
    return `
      ${this.statusBar.render()}
      
      ${this.outputPanel.render()}
      
      ${this.progress.render()}
      
      ${this.input.render()}
    `;
  }

  private handleCommand(cmd: string): void {
    this.outputPanel.addMessage({
      id: Date.now().toString(),
      type: 'user',
      content: cmd,
      timestamp: new Date(),
    });
  }
}
```

### Example 2: Configuration UI

```typescript
import { Modal } from './Modal';
import { Dropdown } from './Dropdown';
import { Table } from './Table';
import { TextInput } from './TextInput';

class ConfigUI implements View {
  render(): string {
    return `
      ${new Modal({
        title: 'Model Configuration',
        children: `
          ${new Dropdown({
            label: 'Default Model',
            options: this.modelOptions,
            selected: this.config.defaultModel,
            onSelect: this.handleModelChange,
          }).render()}          
          ${new Table({
            columns: [
              { key: 'provider', header: 'Provider', width: 20 },
              { key: 'cost', header: 'Cost/1k', align: 'right' },
            ],
            rows: this.providerRows,
          }).render()}
        `,
      }).render()}
    `;
  }
}
```

### Example 3: Streaming Output UI

```typescript
import { CodePreview } from './CodePreview';
import { OutputPanel } from './OutputPanel';
import { StatusBar } from './StatusBar';

class StreamingUI implements View {
  private codePreview: CodePreview;
  private outputPanel: OutputPanel;
  private statusBar: StatusBar;
  private currentCode: string = '';

  constructor() {
    this.codePreview = new CodePreview({
      code: '',
      language: 'typescript',
      showLineNumbers: true,
    });
    
    this.outputPanel = new OutputPanel({
      messages: [],
      maxHeight: 100,
      autoScroll: true,
    });
    
    this.statusBar = new StatusBar({
      model: { name: 'Claude Sonnet 4.5', provider: 'anthropic' },
      tokensUsed: 0,
      cost: 0,
      status: 'running',
      streaming: true,
    });
  }

  updateCode(newCode: string): void {
    this.currentCode = newCode;
    this.codePreview.updateCode(newCode);
  }

  render(): string {
    return `
      ${this.statusBar.render()}
      
      ${this.outputPanel.render()}
      
      ${this.codePreview.render()}
    `;
  }
}
```

---

## Best Practices (Expanded)

### 1. Pure Functions

```typescript
// Good - Pure function
const updateProgress = (model: AppModel, progress: number): AppModel => ({
  ...model,
  progress,
});

// Bad - Mutation
const updateProgress = (model: AppModel, progress: number) => {
  model.progress = progress; // Don't do this!
  return model;
};
```

### 2. Immutable Updates

```typescript
// Good - Create new object
const newState = { ...model, status: 'running' };

// Bad - Mutate existing
model.status = 'running';
```

### 3. Component Reusability

```typescript
// Create small, focused components
class Button implements View { }
class Input implements View { }
class Label implements View { }

// Compose into larger components
class Form implements View {
  render() {
    return `
      ${new Label({ text: 'Name' }).render()}
      ${new Input({ placeholder: 'Enter name' }).render()}
      ${new Button({ text: 'Submit' }).render()}
    `;
  }
}
```

### 4. Performance

- Batch UI updates when possible
- Limit history display size
- Use efficient string concatenation
- Cache rendered output

### 5. Testing

```typescript
// Pure functions are easy to test
describe('StatusBar', () => {
  it('displays model name', () => {
    const statusBar = new StatusBar({
      model: { name: 'Test', provider: 'test' },
      tokensUsed: 0,
      cost: 0,
      status: 'idle',
    });
    const output = statusBar.render();
    expect(output).toContain('Test');
  });
});

describe('Modal', () => {
  it('calls onConfirm when confirmed', () => {
    let confirmed = false;
    const modal = new Modal({
      title: 'Test',
      onConfirm: () => { confirmed = true; },
    });
    modal.confirm();
    expect(confirmed).toBe(true);
  });
});

describe('Dropdown', () => {
  it('calls onSelect when option selected', () => {
    let selected = '';
    const dropdown = new Dropdown({
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
      onSelect: (value) => { selected = value; },
    });
    dropdown.select('b');
    expect(selected).toBe('b');
  });
});
```

---

## Future Components

### Planned Additions

- **Modal** - Dialogs for confirmations and inputs
- **Dropdown** - Select from list of options
- **Tree** - Hierarchical file/project navigation
- **Chart** - Visual data representation
- **Terminal** - Embedded terminal for command execution
- **DiffView** - Show before/after changes

---

## Conclusion

The component library provides a comprehensive set of reusable UI elements built on Bubbletea's Elm architecture. All components are:

1. **Pure and Testable** - Render functions are pure and easy to test
2. **Composable** - Complex UIs built from simple primitives
3. **Themeable** - Consistent styling across all components
4. **Accessible** - Keyboard navigation and screen reader support
5. **Performant** - Efficient rendering with minimal redraws

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for how components integrate into the overall system architecture.
