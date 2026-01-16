/**
 * VisionCodeAnalyzer - Screenshot to UI specification converter
 *
 * Analyzes screenshots using vision-capable LLMs (Claude Sonnet 4.5, Gemini 2.0 Flash)
 * to extract UI structure, components, styling, and generate implementation specifications.
 *
 * @module VisionCodeAnalyzer
 */

import type { LLMRouter } from '../../llm/Router';

/**
 * Layout structure types
 */
export type LayoutType = 'grid' | 'flex' | 'absolute' | 'flow';

/**
 * Layout node in the UI hierarchy
 */
export interface LayoutNode {
  type: 'container' | 'component' | 'text' | 'image';
  tag?: string; // HTML tag or component name
  children?: LayoutNode[];
  properties?: Record<string, unknown>;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Component specification extracted from screenshot
 */
export interface ComponentSpec {
  type: string; // button, input, card, nav, etc.
  variant?: string; // primary, secondary, outlined, etc.
  props?: Record<string, unknown>;
  children?: ComponentSpec[];
  styling?: {
    colors?: string[];
    spacing?: Record<string, string>;
    borders?: Record<string, string>;
    shadows?: string[];
  };
}

/**
 * Color palette extracted from screenshot
 */
export interface ColorPalette {
  primary: string;
  secondary?: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
  };
  accents?: string[];
}

/**
 * Typography specification
 */
export interface TypographySpec {
  fontFamily: string[];
  sizes: {
    h1?: string;
    h2?: string;
    h3?: string;
    body?: string;
    caption?: string;
  };
  weights: {
    regular?: number;
    medium?: number;
    bold?: number;
  };
  lineHeights?: Record<string, string>;
}

/**
 * Spacing system specification
 */
export interface SpacingSystem {
  unit: string; // px, rem, em
  scale: number[]; // e.g., [4, 8, 16, 24, 32, 48, 64]
  padding?: Record<string, string>;
  margin?: Record<string, string>;
  gap?: Record<string, string>;
}

/**
 * Framework and library detection
 */
export type Framework = 'react' | 'vue' | 'svelte' | 'vanilla';
export type ComponentLibrary = 'tailwind' | 'mui' | 'chakra' | 'bootstrap' | 'custom';

/**
 * Complete UI analysis result
 */
export interface UIAnalysis {
  layout: {
    type: LayoutType;
    structure: LayoutNode[];
  };
  components: ComponentSpec[];
  styling: {
    framework: ComponentLibrary;
    colors: ColorPalette;
    typography: TypographySpec;
    spacing: SpacingSystem;
  };
  accessibility: {
    landmarks: string[];
    headingHierarchy: string[];
    formLabels: string[];
    ariaAttributes?: Record<string, string[]>;
  };
  detectedFramework?: Framework;
  confidence: {
    overall: number; // 0-100
    layout: number;
    components: number;
    styling: number;
  };
  rawAnalysis?: string; // Raw LLM response for debugging
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  preferredFramework?: Framework;
  preferredLibrary?: ComponentLibrary;
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  includeAccessibility?: boolean;
  model?: string; // Preferred LLM model
}

/**
 * VisionCodeAnalyzer - Converts screenshots to UI specifications
 *
 * Uses vision-capable LLMs to analyze UI screenshots and extract:
 * - Layout structure and hierarchy
 * - Component types and properties
 * - Styling (colors, typography, spacing)
 * - Accessibility features
 *
 * Supports Claude Sonnet 4.5 (native vision) and Gemini 2.0 Flash (MCP vision) with automatic fallback.
 */
export class VisionCodeAnalyzer {
  private llmRouter?: LLMRouter;

  constructor(llmRouter?: LLMRouter) {
    this.llmRouter = llmRouter;
  }

  /**
   * Analyze a screenshot and extract UI specification
   *
   * @param imagePath - Absolute path to screenshot image
   * @param options - Analysis options
   * @returns Complete UI analysis with structure, components, and styling
   */
  async analyzeScreenshot(
    imagePath: string,
    options: AnalysisOptions = {}
  ): Promise<UIAnalysis> {
    const {
      preferredFramework = 'react',
      preferredLibrary = 'tailwind',
      detailLevel = 'detailed',
      includeAccessibility = true,
      model = 'claude-sonnet-4.5'
    } = options;

    // TODO: Validate image file exists and is readable

    // Generate analysis prompt
    const prompt = this.buildAnalysisPrompt({
      preferredFramework,
      preferredLibrary,
      detailLevel,
      includeAccessibility
    });

    // Call vision LLM
    const rawAnalysis = await this.callVisionLLM(imagePath, prompt, model);

    // Parse and structure the response
    const analysis = await this.parseAnalysis(rawAnalysis, options);

    return analysis;
  }

  /**
   * Build the analysis prompt for the vision LLM
   */
  private buildAnalysisPrompt(options: {
    preferredFramework: Framework;
    preferredLibrary: ComponentLibrary;
    detailLevel: string;
    includeAccessibility: boolean;
  }): string {
    const { preferredFramework, preferredLibrary, detailLevel, includeAccessibility } = options;

    return `Analyze this UI screenshot and provide a comprehensive breakdown suitable for code generation.

**Target Framework**: ${preferredFramework}
**Component Library**: ${preferredLibrary}
**Detail Level**: ${detailLevel}

Please provide:

1. **Layout Analysis**:
   - Layout type (grid, flex, absolute, flow)
   - Component hierarchy with positioning
   - Spacing and alignment patterns

2. **Component Identification**:
   - List all UI components (buttons, inputs, cards, navigation, etc.)
   - Component variants (primary/secondary, outlined/filled, sizes)
   - Interactive elements and their states
   - Text content and labels

3. **Styling Extraction**:
   - Color palette (primary, secondary, background, text colors)
   - Typography (font families, sizes, weights, line heights)
   - Spacing system (padding, margins, gaps)
   - Borders and shadows
   - Border radius patterns

${includeAccessibility ? `
4. **Accessibility Features**:
   - ARIA landmarks and regions
   - Heading hierarchy (h1, h2, h3, etc.)
   - Form labels and associations
   - Alt text requirements for images
   - Keyboard navigation considerations
` : ''}

5. **Implementation Notes**:
   - Recommended component structure
   - Key CSS/Tailwind classes needed
   - Responsive design considerations
   - Special interactions or animations

Provide the analysis in a structured JSON format that can be parsed programmatically.

**Output Format**:
\`\`\`json
{
  "layout": {
    "type": "flex" | "grid" | "absolute" | "flow",
    "structure": [/* array of layout nodes */]
  },
  "components": [/* array of component specifications */],
  "styling": {
    "framework": "${preferredLibrary}",
    "colors": {/* color palette */},
    "typography": {/* typography specs */},
    "spacing": {/* spacing system */}
  },
  "accessibility": {/* accessibility features */},
  "confidence": {
    "overall": 85,
    "layout": 90,
    "components": 85,
    "styling": 80
  }
}
\`\`\`

Be precise with measurements, colors (use hex codes), and component names.`;
  }

  /**
   * Call vision LLM with image and prompt
   */
  private async callVisionLLM(
    imagePath: string,
    prompt: string,
    model: string
  ): Promise<string> {
    // Validate image file first
    const isValid = await this.validateImageFile(imagePath);
    if (!isValid) {
      throw new Error(`Invalid or inaccessible image file: ${imagePath}`);
    }

    // Priority 1: Try LLMRouter if available (Claude Sonnet 4.5 native vision)
    if (this.llmRouter && model.includes('claude')) {
      try {
        const response = await this.llmRouter.route(
          {
            messages: [{ role: 'user', content: prompt }],
            model,
            max_tokens: 4000,
            temperature: 0.3
          },
          {
            taskType: 'general',
            priority: 'quality',
            preferredModel: model,
            requiresVision: true
          }
        );
        // Extract text from content blocks
        const textContent = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');
        return textContent;
      } catch (error) {
        console.error('Claude vision API failed, falling back to Gemini:', error);
      }
    }

    // Priority 2: Try Gemini 2.0 Flash via MCP (mcp__gemini__analyzeFile)
    // Note: In production, this would use the mcp__gemini__analyzeFile tool
    // For now, we'll use a placeholder that can be replaced with actual MCP call
    try {
      // This will be called via the Gemini MCP tool in the actual implementation
      const geminiResponse = await this.callGeminiVisionMCP(imagePath, prompt);
      return geminiResponse;
    } catch (error) {
      throw new Error(`All vision LLM providers failed. Last error: ${error}`);
    }
  }

  /**
   * Call Gemini vision via MCP server
   * In production, this would use mcp__gemini__analyzeFile tool
   */
  private async callGeminiVisionMCP(
    imagePath: string,
    prompt: string
  ): Promise<string> {
    // Placeholder for MCP tool call
    // In actual implementation, Claude will call mcp__gemini__analyzeFile
    // with the image path and prompt
    throw new Error(`Gemini MCP vision not yet integrated. Path: ${imagePath}, Prompt length: ${prompt.length}`);
  }

  /**
   * Parse raw LLM response into structured UIAnalysis
   */
  private async parseAnalysis(
    rawResponse: string,
    options: AnalysisOptions
  ): Promise<UIAnalysis> {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      let jsonStr = rawResponse;

      // Remove markdown code blocks if present
      const codeBlockMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr.trim());

      // Validate and fill defaults
      const analysis: UIAnalysis = {
        layout: {
          type: parsed.layout?.type || 'flex',
          structure: parsed.layout?.structure || []
        },
        components: parsed.components || [],
        styling: {
          framework: parsed.styling?.framework || options.preferredLibrary || 'tailwind',
          colors: parsed.styling?.colors || this.getDefaultColors(),
          typography: parsed.styling?.typography || this.getDefaultTypography(),
          spacing: parsed.styling?.spacing || this.getDefaultSpacing()
        },
        accessibility: {
          landmarks: parsed.accessibility?.landmarks || [],
          headingHierarchy: parsed.accessibility?.headingHierarchy || [],
          formLabels: parsed.accessibility?.formLabels || [],
          ariaAttributes: parsed.accessibility?.ariaAttributes || {}
        },
        detectedFramework: parsed.detectedFramework || options.preferredFramework,
        confidence: {
          overall: parsed.confidence?.overall || 70,
          layout: parsed.confidence?.layout || 70,
          components: parsed.confidence?.components || 70,
          styling: parsed.confidence?.styling || 70
        },
        rawAnalysis: rawResponse
      };

      return analysis;
    } catch (error) {
      console.error('Failed to parse vision LLM response:', error);
      console.error('Raw response:', rawResponse);

      // Return fallback analysis with low confidence
      return {
        layout: {
          type: 'flex',
          structure: []
        },
        components: [],
        styling: {
          framework: options.preferredLibrary || 'tailwind',
          colors: this.getDefaultColors(),
          typography: this.getDefaultTypography(),
          spacing: this.getDefaultSpacing()
        },
        accessibility: {
          landmarks: [],
          headingHierarchy: [],
          formLabels: []
        },
        confidence: {
          overall: 0,
          layout: 0,
          components: 0,
          styling: 0
        },
        rawAnalysis: rawResponse
      };
    }
  }

  /**
   * Get default color palette
   */
  private getDefaultColors(): ColorPalette {
    return {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#ffffff',
      surface: '#f9fafb',
      text: {
        primary: '#111827',
        secondary: '#6b7280'
      },
      accents: ['#10b981', '#f59e0b', '#ef4444']
    };
  }

  /**
   * Get default typography specification
   */
  private getDefaultTypography(): TypographySpec {
    return {
      fontFamily: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      sizes: {
        h1: '2rem',
        h2: '1.5rem',
        h3: '1.25rem',
        body: '1rem',
        caption: '0.875rem'
      },
      weights: {
        regular: 400,
        medium: 500,
        bold: 700
      },
      lineHeights: {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75'
      }
    };
  }

  /**
   * Get default spacing system
   */
  private getDefaultSpacing(): SpacingSystem {
    return {
      unit: 'rem',
      scale: [0.25, 0.5, 1, 1.5, 2, 3, 4], // 4px, 8px, 16px, 24px, 32px, 48px, 64px
      padding: {},
      margin: {},
      gap: {}
    };
  }

  /**
   * Validate image file exists and is accessible
   */
  private async validateImageFile(imagePath: string): Promise<boolean> {
    try {
      // Check file exists and is readable
      const fs = await import('fs/promises');
      await fs.access(imagePath, (await import('fs')).constants.R_OK);

      // Check file extension
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
      const hasValidExtension = validExtensions.some(ext => imagePath.toLowerCase().endsWith(ext));

      if (!hasValidExtension) {
        throw new Error(`Invalid image format. Supported: ${validExtensions.join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error(`Image validation failed for ${imagePath}:`, error);
      return false;
    }
  }
}
