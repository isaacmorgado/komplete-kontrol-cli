/**
 * UICodeGenerator - Converts UI analysis to production-ready code
 *
 * Generates React/Vue/Svelte code from VisionCodeAnalyzer output.
 * Supports multiple component libraries (Tailwind, MUI, Chakra, Bootstrap).
 *
 * @module UICodeGenerator
 */

import type {
  UIAnalysis,
  ComponentSpec,
  Framework,
  ComponentLibrary
} from './VisionCodeAnalyzer';

/**
 * Generated code output
 */
export interface GeneratedCode {
  framework: Framework;
  language: 'typescript' | 'javascript';
  files: {
    [filename: string]: string;
  };
  dependencies: Record<string, string>;
  instructions: string;
  metadata: {
    componentCount: number;
    linesOfCode: number;
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: string;
  };
}

/**
 * Code generation options
 */
export interface CodeGenerationOptions {
  framework: Framework;
  typescript: boolean;
  componentLibrary: ComponentLibrary;
  generateTests?: boolean;
  generateStorybook?: boolean;
  includePropTypes?: boolean;
  useTailwindConfig?: boolean;
}

/**
 * UICodeGenerator - Converts UI specifications to production code
 *
 * Generates clean, accessible, production-ready code from VisionCodeAnalyzer output.
 *
 * Features:
 * - React + TypeScript + Tailwind (primary)
 * - Component library integration (MUI, Chakra, Bootstrap)
 * - Accessible markup (ARIA, semantic HTML)
 * - Responsive design patterns
 * - Clean, maintainable code structure
 */
export class UICodeGenerator {
  /**
   * Generate code from UI analysis
   *
   * @param analysis - UI analysis from VisionCodeAnalyzer
   * @param options - Code generation options
   * @returns Generated code with files, dependencies, and instructions
   */
  async generateCode(
    analysis: UIAnalysis,
    options: CodeGenerationOptions
  ): Promise<GeneratedCode> {
    const {
      framework,
      typescript,
      componentLibrary,
      generateTests = false,
      generateStorybook = false,
      includePropTypes = false,
      useTailwindConfig = true
    } = options;

    // Validate analysis confidence
    if (analysis.confidence.overall < 50) {
      console.warn('Low confidence analysis, code generation may be inaccurate');
    }

    // Generate component code based on framework
    const componentCode = await this.generateComponentCode(
      analysis,
      framework,
      typescript,
      componentLibrary
    );

    // Generate supporting files
    const supportingFiles: Record<string, string> = {};

    // Generate types file if TypeScript
    if (typescript) {
      supportingFiles['types.ts'] = this.generateTypesFile(analysis);
    }

    // Generate Tailwind config if requested
    if (componentLibrary === 'tailwind' && useTailwindConfig) {
      supportingFiles['tailwind.config.js'] = this.generateTailwindConfig(analysis);
    }

    // Generate tests if requested
    if (generateTests) {
      const testExt = typescript ? 'tsx' : 'jsx';
      supportingFiles[`Component.test.${testExt}`] = this.generateTests(
        analysis,
        framework,
        typescript
      );
    }

    // Generate Storybook stories if requested
    if (generateStorybook) {
      const storyExt = typescript ? 'tsx' : 'jsx';
      supportingFiles[`Component.stories.${storyExt}`] = this.generateStorybook(
        analysis,
        framework,
        typescript
      );
    }

    // Collect all files
    const files: Record<string, string> = {
      ...componentCode,
      ...supportingFiles
    };

    // Determine dependencies
    const dependencies = this.getDependencies(
      framework,
      componentLibrary,
      generateTests,
      generateStorybook
    );

    // Generate setup instructions
    const instructions = this.generateInstructions(
      framework,
      componentLibrary,
      files,
      dependencies
    );

    // Calculate metadata
    const metadata = this.calculateMetadata(files, analysis);

    return {
      framework,
      language: typescript ? 'typescript' : 'javascript',
      files,
      dependencies,
      instructions,
      metadata
    };
  }

  /**
   * Generate component code
   */
  private async generateComponentCode(
    analysis: UIAnalysis,
    framework: Framework,
    typescript: boolean,
    library: ComponentLibrary
  ): Promise<Record<string, string>> {
    switch (framework) {
      case 'react':
        return this.generateReactComponent(analysis, typescript, library);
      case 'vue':
        return this.generateVueComponent(analysis, typescript, library);
      case 'svelte':
        return this.generateSvelteComponent(analysis, typescript, library);
      case 'vanilla':
        return this.generateVanillaComponent(analysis, typescript, library);
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Generate React component
   */
  private generateReactComponent(
    analysis: UIAnalysis,
    typescript: boolean,
    library: ComponentLibrary
  ): Record<string, string> {
    const ext = typescript ? 'tsx' : 'jsx';
    const files: Record<string, string> = {};

    // Generate main component
    const componentName = 'Component';
    const imports = this.generateReactImports(library, typescript);
    const props = typescript ? this.generateReactPropsInterface(analysis) : '';
    const jsx = this.generateReactJSX(analysis, library);

    const componentCode = `${imports}

${props}

export default function ${componentName}(${typescript ? 'props: ComponentProps' : 'props'}) {
  return (
${jsx}
  );
}`;

    files[`${componentName}.${ext}`] = componentCode;

    // Generate CSS if not using component library
    if (library === 'tailwind' || library === 'custom') {
      files[`${componentName}.css`] = this.generateCSS(analysis);
    }

    return files;
  }

  /**
   * Generate React imports
   */
  private generateReactImports(library: ComponentLibrary, typescript: boolean): string {
    const imports: string[] = ["import React from 'react';"];

    switch (library) {
      case 'tailwind':
        // Tailwind uses utility classes, no component imports needed
        break;
      case 'mui':
        imports.push(
          "import { Box, Button, TextField, Typography } from '@mui/material';"
        );
        break;
      case 'chakra':
        imports.push(
          "import { Box, Button, Input, Text } from '@chakra-ui/react';"
        );
        break;
      case 'bootstrap':
        imports.push(
          "import { Container, Button, Form } from 'react-bootstrap';",
          "import 'bootstrap/dist/css/bootstrap.min.css';"
        );
        break;
    }

    if (typescript) {
      imports.push("import type { FC } from 'react';");
    }

    return imports.join('\n');
  }

  /**
   * Generate React props interface
   */
  private generateReactPropsInterface(analysis: UIAnalysis): string {
    // Generate props based on interactive components
    const props: string[] = [];

    // Add common props
    props.push('  className?: string;');
    props.push('  style?: React.CSSProperties;');

    // Add event handlers for interactive components
    const hasButtons = analysis.components.some(c => c.type === 'button');
    if (hasButtons) {
      props.push('  onButtonClick?: () => void;');
    }

    const hasInputs = analysis.components.some(c => c.type === 'input');
    if (hasInputs) {
      props.push('  onInputChange?: (value: string) => void;');
    }

    return `interface ComponentProps {
${props.join('\n')}
}`;
  }

  /**
   * Generate React JSX
   */
  private generateReactJSX(analysis: UIAnalysis, library: ComponentLibrary): string {
    const { layout, components, styling } = analysis;

    // Generate JSX based on layout type
    const layoutClasses = this.getLayoutClasses(layout.type, library);
    const colorClasses = this.getColorClasses(styling.colors, library);

    // Start with container
    let jsx = `    <div className="${layoutClasses} ${colorClasses}">\n`;

    // Generate component JSX
    for (const component of components) {
      jsx += this.generateComponentJSX(component, library, '      ');
    }

    jsx += '    </div>';

    return jsx;
  }

  /**
   * Generate JSX for individual component
   */
  private generateComponentJSX(
    component: ComponentSpec,
    library: ComponentLibrary,
    indent: string
  ): string {
    switch (component.type) {
      case 'button':
        return this.generateButtonJSX(component, library, indent);
      case 'input':
        return this.generateInputJSX(component, library, indent);
      case 'text':
        return this.generateTextJSX(component, library, indent);
      case 'card':
        return this.generateCardJSX(component, library, indent);
      default:
        return `${indent}<div>/* ${component.type} */</div>\n`;
    }
  }

  /**
   * Generate button JSX
   */
  private generateButtonJSX(
    component: ComponentSpec,
    library: ComponentLibrary,
    indent: string
  ): string {
    const variant = component.variant || 'primary';
    const classes = this.getButtonClasses(variant, library);

    if (library === 'mui') {
      return `${indent}<Button variant="contained" color="${variant}">Button</Button>\n`;
    } else if (library === 'chakra') {
      return `${indent}<Button colorScheme="${variant}">Button</Button>\n`;
    } else {
      return `${indent}<button className="${classes}">Button</button>\n`;
    }
  }

  /**
   * Generate input JSX
   */
  private generateInputJSX(
    component: ComponentSpec,
    library: ComponentLibrary,
    indent: string
  ): string {
    const classes = this.getInputClasses(library);

    if (library === 'mui') {
      return `${indent}<TextField label="Input" variant="outlined" />\n`;
    } else if (library === 'chakra') {
      return `${indent}<Input placeholder="Input" />\n`;
    } else {
      return `${indent}<input type="text" className="${classes}" placeholder="Input" />\n`;
    }
  }

  /**
   * Generate text JSX
   */
  private generateTextJSX(
    component: ComponentSpec,
    library: ComponentLibrary,
    indent: string
  ): string {
    const variant = component.variant || 'body';

    if (library === 'mui') {
      return `${indent}<Typography variant="${variant}">Text</Typography>\n`;
    } else if (library === 'chakra') {
      return `${indent}<Text fontSize="${variant}">Text</Text>\n`;
    } else {
      return `${indent}<p className="text-${variant}">Text</p>\n`;
    }
  }

  /**
   * Generate card JSX
   */
  private generateCardJSX(
    component: ComponentSpec,
    library: ComponentLibrary,
    indent: string
  ): string {
    const classes = this.getCardClasses(library);

    let jsx = `${indent}<div className="${classes}">\n`;
    if (component.children) {
      for (const child of component.children) {
        jsx += this.generateComponentJSX(child, library, indent + '  ');
      }
    }
    jsx += `${indent}</div>\n`;

    return jsx;
  }

  /**
   * Get layout classes
   */
  private getLayoutClasses(layoutType: string, library: ComponentLibrary): string {
    if (library !== 'tailwind' && library !== 'custom') {
      return '';
    }

    switch (layoutType) {
      case 'flex':
        return 'flex flex-col gap-4 p-4';
      case 'grid':
        return 'grid grid-cols-12 gap-4 p-4';
      case 'absolute':
        return 'relative p-4';
      default:
        return 'p-4';
    }
  }

  /**
   * Get color classes
   */
  private getColorClasses(colors: any, library: ComponentLibrary): string {
    if (library !== 'tailwind' && library !== 'custom') {
      return '';
    }

    return 'bg-white text-gray-900';
  }

  /**
   * Get button classes
   */
  private getButtonClasses(variant: string, library: ComponentLibrary): string {
    if (library !== 'tailwind' && library !== 'custom') {
      return '';
    }

    const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      case 'secondary':
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700`;
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
    }
  }

  /**
   * Get input classes
   */
  private getInputClasses(library: ComponentLibrary): string {
    if (library !== 'tailwind' && library !== 'custom') {
      return '';
    }

    return 'px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
  }

  /**
   * Get card classes
   */
  private getCardClasses(library: ComponentLibrary): string {
    if (library !== 'tailwind' && library !== 'custom') {
      return '';
    }

    return 'bg-white border border-gray-200 rounded-lg p-6 shadow-sm';
  }

  /**
   * Generate Vue component (placeholder)
   */
  private generateVueComponent(
    analysis: UIAnalysis,
    typescript: boolean,
    library: ComponentLibrary
  ): Record<string, string> {
    const ext = typescript ? 'vue' : 'vue';
    return {
      [`Component.${ext}`]: `<!-- Vue component generation not yet implemented -->
<template>
  <div class="component">
    <p>Vue component placeholder</p>
  </div>
</template>

<script${typescript ? ' lang="ts"' : ''}>
export default {
  name: 'Component'
}
</script>

<style scoped>
.component {
  padding: 1rem;
}
</style>`
    };
  }

  /**
   * Generate Svelte component (placeholder)
   */
  private generateSvelteComponent(
    analysis: UIAnalysis,
    typescript: boolean,
    library: ComponentLibrary
  ): Record<string, string> {
    const ext = typescript ? 'svelte' : 'svelte';
    return {
      [`Component.${ext}`]: `<script${typescript ? ' lang="ts"' : ''}>
  // Svelte component generation not yet implemented
</script>

<div class="component">
  <p>Svelte component placeholder</p>
</div>

<style>
  .component {
    padding: 1rem;
  }
</style>`
    };
  }

  /**
   * Generate vanilla JS component (placeholder)
   */
  private generateVanillaComponent(
    analysis: UIAnalysis,
    typescript: boolean,
    library: ComponentLibrary
  ): Record<string, string> {
    const ext = typescript ? 'ts' : 'js';
    return {
      [`component.${ext}`]: `// Vanilla JS component generation not yet implemented
export function createComponent(container${typescript ? ': HTMLElement' : ''}) {
  container.innerHTML = '<div class="component"><p>Vanilla component placeholder</p></div>';
}`
    };
  }

  /**
   * Generate types file
   */
  private generateTypesFile(analysis: UIAnalysis): string {
    return `// Component types
export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

// Add more types based on analysis
`;
  }

  /**
   * Generate Tailwind config
   */
  private generateTailwindConfig(analysis: UIAnalysis): string {
    const { colors, typography, spacing } = analysis.styling;

    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '${colors.primary}',
        secondary: '${colors.secondary || colors.primary}',
      },
      fontFamily: {
        sans: ${JSON.stringify(typography.fontFamily)},
      },
    },
  },
  plugins: [],
}`;
  }

  /**
   * Generate tests (placeholder)
   */
  private generateTests(
    analysis: UIAnalysis,
    framework: Framework,
    typescript: boolean
  ): string {
    return `// Test generation not yet implemented
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('renders without crashing', () => {
    render(<Component />);
  });
});`;
  }

  /**
   * Generate Storybook stories (placeholder)
   */
  private generateStorybook(
    analysis: UIAnalysis,
    framework: Framework,
    typescript: boolean
  ): string {
    return `// Storybook generation not yet implemented
import type { Meta, StoryObj } from '@storybook/react';
import Component from './Component';

const meta: Meta<typeof Component> = {
  title: 'Components/Component',
  component: Component,
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {};`;
  }

  /**
   * Generate CSS
   */
  private generateCSS(analysis: UIAnalysis): string {
    const { colors, typography } = analysis.styling;

    return `.component {
  font-family: ${typography.fontFamily.join(', ')};
  color: ${colors.text.primary};
  background-color: ${colors.background};
}

/* Add more styles based on analysis */
`;
  }

  /**
   * Get dependencies
   */
  private getDependencies(
    framework: Framework,
    library: ComponentLibrary,
    includeTests: boolean,
    includeStorybook: boolean
  ): Record<string, string> {
    const deps: Record<string, string> = {};

    // Framework dependencies
    if (framework === 'react') {
      deps['react'] = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
    }

    // Library dependencies
    switch (library) {
      case 'tailwind':
        deps['tailwindcss'] = '^3.3.0';
        deps['autoprefixer'] = '^10.4.0';
        deps['postcss'] = '^8.4.0';
        break;
      case 'mui':
        deps['@mui/material'] = '^5.14.0';
        deps['@emotion/react'] = '^11.11.0';
        deps['@emotion/styled'] = '^11.11.0';
        break;
      case 'chakra':
        deps['@chakra-ui/react'] = '^2.8.0';
        deps['@emotion/react'] = '^11.11.0';
        deps['@emotion/styled'] = '^11.11.0';
        deps['framer-motion'] = '^10.16.0';
        break;
      case 'bootstrap':
        deps['react-bootstrap'] = '^2.9.0';
        deps['bootstrap'] = '^5.3.0';
        break;
    }

    // Test dependencies
    if (includeTests) {
      deps['@testing-library/react'] = '^14.0.0';
      deps['@testing-library/jest-dom'] = '^6.1.0';
      deps['@testing-library/user-event'] = '^14.5.0';
    }

    // Storybook dependencies
    if (includeStorybook) {
      deps['@storybook/react'] = '^7.5.0';
      deps['@storybook/addon-essentials'] = '^7.5.0';
    }

    return deps;
  }

  /**
   * Generate setup instructions
   */
  private generateInstructions(
    framework: Framework,
    library: ComponentLibrary,
    files: Record<string, string>,
    dependencies: Record<string, string>
  ): string {
    const depList = Object.entries(dependencies)
      .map(([name, version]) => `${name}@${version}`)
      .join(' ');

    return `# Setup Instructions

## 1. Install dependencies

\`\`\`bash
npm install ${depList}
\`\`\`

## 2. Files generated

${Object.keys(files).map(f => `- ${f}`).join('\n')}

## 3. Framework: ${framework}
## 4. Component library: ${library}

## 5. Next steps

1. Review generated code
2. Customize styles and content
3. Add interactivity and state management
4. Run tests if generated
5. Build for production

## 6. Run development server

\`\`\`bash
npm run dev
\`\`\`
`;
  }

  /**
   * Calculate metadata
   */
  private calculateMetadata(
    files: Record<string, string>,
    analysis: UIAnalysis
  ): {
    componentCount: number;
    linesOfCode: number;
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: string;
  } {
    const componentCount = analysis.components.length;
    const linesOfCode = Object.values(files)
      .map(content => content.split('\n').length)
      .reduce((a, b) => a + b, 0);

    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (componentCount > 10 || linesOfCode > 300) {
      complexity = 'complex';
    } else if (componentCount > 5 || linesOfCode > 150) {
      complexity = 'moderate';
    }

    const estimatedTime = complexity === 'complex' ? '30-45 minutes' :
                         complexity === 'moderate' ? '15-30 minutes' :
                         '5-15 minutes';

    return {
      componentCount,
      linesOfCode,
      complexity,
      estimatedTime
    };
  }
}
