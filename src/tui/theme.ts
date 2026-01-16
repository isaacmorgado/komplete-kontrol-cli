/**
 * TUI Theme System
 * 
 * Provides color schemes and styling for the Bubbletea TUI.
 * Supports dark, light, and auto themes based on terminal capabilities.
 */

// ============================================================================
// Color Types
// ============================================================================

export type ColorName =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted'
  | 'border'
  | 'background'
  | 'foreground'
  | 'highlight';

export interface ColorScheme {
  [key: string]: string;
}

// ============================================================================
// Theme Types
// ============================================================================

export type ThemeType = 'dark' | 'light' | 'auto';

export interface Theme {
  name: string;
  type: ThemeType;
  colors: ColorScheme;
  styles: {
    border: string;
    header: string;
    footer: string;
    highlight: string;
    dim: string;
    bold: string;
    italic: string;
    underline: string;
  };
}

// ============================================================================
// Dark Theme
// ============================================================================

export const darkTheme: Theme = {
  name: 'Dark',
  type: 'dark',
  colors: {
    primary: '\x1b[38;5;39m',      // Blue
    secondary: '\x1b[38;5;147m',   // Light purple
    success: '\x1b[38;5;46m',      // Green
    warning: '\x1b[38;5;226m',     // Yellow
    error: '\x1b[38;5;196m',       // Red
    info: '\x1b[38;5;39m',         // Blue
    muted: '\x1b[38;5;245m',       // Gray
    border: '\x1b[38;5;238m',      // Dark gray
    background: '\x1b[48;5;234m',  // Very dark gray
    foreground: '\x1b[38;5;255m',  // White
    highlight: '\x1b[48;5;39m',    // Blue background
  },
  styles: {
    border: '\x1b[38;5;238m',
    header: '\x1b[1;38;5;39m',
    footer: '\x1b[38;5;245m',
    highlight: '\x1b[1;38;5;255;48;5;39m',
    dim: '\x1b[38;5;245m',
    bold: '\x1b[1m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
  },
};

// ============================================================================
// Light Theme
// ============================================================================

export const lightTheme: Theme = {
  name: 'Light',
  type: 'light',
  colors: {
    primary: '\x1b[38;5;27m',       // Blue
    secondary: '\x1b[38;5;99m',    // Purple
    success: '\x1b[38;5;28m',       // Green
    warning: '\x1b[38;5;208m',      // Orange
    error: '\x1b[38;5;124m',       // Red
    info: '\x1b[38;5;27m',         // Blue
    muted: '\x1b[38;5;244m',       // Gray
    border: '\x1b[38;5;248m',      // Light gray
    background: '\x1b[48;5;255m',  // White
    foreground: '\x1b[38;5;234m',  // Dark gray
    highlight: '\x1b[48;5;27m',    // Blue background
  },
  styles: {
    border: '\x1b[38;5;248m',
    header: '\x1b[1;38;5;27m',
    footer: '\x1b[38;5;244m',
    highlight: '\x1b[1;38;5;255;48;5;27m',
    dim: '\x1b[38;5;244m',
    bold: '\x1b[1m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
  },
};

// ============================================================================
// Reset Code
// ============================================================================

export const RESET = '\x1b[0m';

// ============================================================================
// Theme Manager
// ============================================================================

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme;
  private themeType: ThemeType;

  private constructor() {
    this.themeType = 'auto';
    this.currentTheme = this.detectTheme();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Detect appropriate theme based on terminal
   */
  private detectTheme(): Theme {
    if (this.themeType === 'auto') {
      // Check if terminal supports dark mode detection
      const term = process.env.TERM || '';
      const colorMode = process.env.COLORFGBG || '';
      
      // If COLORFGBG is set and first number is light, use light theme
      if (colorMode && colorMode.split(';')[0] === '0') {
        return lightTheme;
      }
      
      // Default to dark theme
      return darkTheme;
    }
    
    return this.themeType === 'light' ? lightTheme : darkTheme;
  }

  /**
   * Get current theme
   */
  public getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Set theme type
   */
  public setThemeType(type: ThemeType): void {
    this.themeType = type;
    this.currentTheme = this.detectTheme();
  }

  /**
   * Get color by name
   */
  public getColor(name: ColorName): string {
    return this.currentTheme.colors[name] || RESET;
  }

  /**
   * Get style by name
   */
  public getStyle(name: keyof Theme['styles']): string {
    return this.currentTheme.styles[name] || RESET;
  }

  /**
   * Apply color to text
   */
  public colorize(text: string, color: ColorName): string {
    return `${this.getColor(color)}${text}${RESET}`;
  }

  /**
   * Apply style to text
   */
  public stylize(text: string, style: keyof Theme['styles']): string {
    return `${this.getStyle(style)}${text}${RESET}`;
  }

  /**
   * Apply both color and style to text
   */
  public format(text: string, color: ColorName, style?: keyof Theme['styles']): string {
    const colorCode = this.getColor(color);
    const styleCode = style ? this.getStyle(style) : '';
    return `${styleCode}${colorCode}${text}${RESET}`;
  }

  /**
   * Draw a horizontal line
   */
  public drawLine(width: number, char: string = '─'): string {
    return char.repeat(width);
  }

  /**
   * Draw a box
   */
  public drawBox(
    width: number,
    height: number,
    title?: string
  ): string {
    const horizontal = this.drawLine(width - 2, '─');
    const vertical = '│';
    
    let output = '';
    
    // Top border
    if (title) {
      const titlePadding = Math.max(0, width - title.length - 4);
      output += `┌─${title}${' '.repeat(titlePadding)}─┐\n`;
    } else {
      output += `┌${horizontal}┐\n`;
    }
    
    // Middle lines
    for (let i = 0; i < height - 2; i++) {
      output += `${vertical}${' '.repeat(width - 2)}${vertical}\n`;
    }
    
    // Bottom border
    output += `└${horizontal}┘`;
    
    return output;
  }

  /**
   * Format status icon
   */
  public getStatusIcon(status: 'idle' | 'running' | 'complete' | 'error'): string {
    switch (status) {
      case 'idle':
        return this.colorize('○', 'muted');
      case 'running':
        return this.colorize('●', 'primary');
      case 'complete':
        return this.colorize('✓', 'success');
      case 'error':
        return this.colorize('✗', 'error');
    }
  }

  /**
   * Format message type icon
   */
  public getMessageIcon(type: 'user' | 'assistant' | 'system' | 'tool' | 'error'): string {
    switch (type) {
      case 'user':
        return this.colorize('>', 'primary');
      case 'assistant':
        return this.colorize('●', 'success');
      case 'system':
        return this.colorize('ℹ', 'info');
      case 'tool':
        return this.colorize('⚙', 'warning');
      case 'error':
        return this.colorize('✗', 'error');
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const theme = ThemeManager.getInstance();
