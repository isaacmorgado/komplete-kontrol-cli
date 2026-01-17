/**
 * Theme System for Komplete Kontrol CLI TUI
 * Provides color schemes and styling for all UI components
 */

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface ThemeColors {
  // Status colors
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // UI element colors
  background: string;
  foreground: string;
  border: string;
  muted: string;
  
  // Status indicators
  idle: string;
  running: string;
  complete: string;
  
  // Syntax highlighting
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
}

export const darkTheme: ThemeColors = {
  primary: '#60a5fa',
  secondary: '#94a3b8',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#0f172a',
  foreground: '#f8fafc',
  border: '#334155',
  muted: '#64748b',
  idle: '#64748b',
  running: '#eab308',
  complete: '#22c55e',
  keyword: '#c678dd',
  string: '#98c379',
  number: '#d19a66',
  comment: '#5c6370',
  function: '#61afef',
  variable: '#e06c75',
};

export const lightTheme: ThemeColors = {
  primary: '#2563eb',
  secondary: '#475569',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  info: '#1d4ed8',
  background: '#ffffff',
  foreground: '#0f172a',
  border: '#e2e8f0',
  muted: '#94a3b8',
  idle: '#94a3b8',
  running: '#ca8a04',
  complete: '#16a34a',
  keyword: '#6b21a8',
  string: '#166534',
  number: '#9a3412',
  comment: '#6b7280',
  function: '#1e40af',
  variable: '#991b1b',
};

export class ThemeManager {
  private static instance: ThemeManager;
  private currentMode: ThemeMode = 'auto';
  private currentTheme: ThemeColors = darkTheme;

  private constructor() {
    this.detectTheme();
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    this.applyTheme(mode);
  }

  getMode(): ThemeMode {
    return this.currentMode;
  }

  getTheme(): ThemeColors {
    return this.currentTheme;
  }

  getColor(name: keyof ThemeColors): string {
    return this.currentTheme[name];
  }

  private detectTheme(): void {
    if (this.currentMode === 'auto') {
      // Try to detect system theme
      const isDark = this.isDarkMode();
      this.currentTheme = isDark ? darkTheme : lightTheme;
    }
  }

  private isDarkMode(): boolean {
    // Check for environment variables
    if (process.env.TERM_PROGRAM === 'vscode') {
      return process.env.VSCODE_THEME?.includes('dark') ?? true;
    }
    // Default to dark mode
    return true;
  }

  private applyTheme(mode: ThemeMode): void {
    if (mode === 'auto') {
      this.detectTheme();
    } else if (mode === 'dark') {
      this.currentTheme = darkTheme;
    } else {
      this.currentTheme = lightTheme;
    }
  }

  toggleTheme(): void {
    if (this.currentMode === 'dark') {
      this.setMode('light');
    } else if (this.currentMode === 'light') {
      this.setMode('dark');
    } else {
      // Auto mode - toggle based on current
      this.setMode(this.currentTheme === darkTheme ? 'light' : 'dark');
    }
  }
}

export const theme = ThemeManager.getInstance();
