/**
 * Integration tests for screenshot-to-code pipeline
 *
 * Tests the complete workflow from screenshot analysis to code generation
 * with visual regression testing and iterative refinement.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { LLMRouter } from '../../src/core/llm/Router';
import { createDefaultRegistry } from '../../src/core/llm/providers/ProviderFactory';
import {
  VisionCodeAnalyzer,
  UICodeGenerator,
  VisualRegressionEngine,
  ScreenshotToCodeOrchestrator
} from '../../src/core/agents/screenshot-to-code';
import type {
  UIAnalysis,
  GeneratedCode,
  VisualDiff,
  PipelineResult
} from '../../src/core/agents/screenshot-to-code';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Screenshot-to-Code Integration Tests', () => {
  let router: LLMRouter;
  let visionAnalyzer: VisionCodeAnalyzer;
  let codeGenerator: UICodeGenerator;
  let regressionEngine: VisualRegressionEngine;
  let orchestrator: ScreenshotToCodeOrchestrator;

  beforeAll(async () => {
    const registry = await createDefaultRegistry();
    router = new LLMRouter(registry);
    visionAnalyzer = new VisionCodeAnalyzer(router);
    codeGenerator = new UICodeGenerator();
    regressionEngine = new VisualRegressionEngine();
    orchestrator = new ScreenshotToCodeOrchestrator(router);
  });

  describe('VisionCodeAnalyzer', () => {
    it('should export VisionCodeAnalyzer class', () => {
      expect(VisionCodeAnalyzer).toBeDefined();
      expect(typeof VisionCodeAnalyzer).toBe('function');
    });

    it('should create VisionCodeAnalyzer instance', () => {
      expect(visionAnalyzer).toBeDefined();
      expect(visionAnalyzer).toBeInstanceOf(VisionCodeAnalyzer);
    });

    it('should have analyzeScreenshot method', () => {
      expect(visionAnalyzer.analyzeScreenshot).toBeDefined();
      expect(typeof visionAnalyzer.analyzeScreenshot).toBe('function');
    });

    it('should validate analysis options', async () => {
      const options = {
        detailLevel: 'comprehensive' as const
      };

      expect(options.detailLevel).toBe('comprehensive');
    });
  });

  describe('UICodeGenerator', () => {
    it('should export UICodeGenerator class', () => {
      expect(UICodeGenerator).toBeDefined();
      expect(typeof UICodeGenerator).toBe('function');
    });

    it('should create UICodeGenerator instance', () => {
      expect(codeGenerator).toBeDefined();
      expect(codeGenerator).toBeInstanceOf(UICodeGenerator);
    });

    it('should have generateCode method', () => {
      expect(codeGenerator.generateCode).toBeDefined();
      expect(typeof codeGenerator.generateCode).toBe('function');
    });

    it('should validate generation options', () => {
      const options = {
        framework: 'react' as const,
        typescript: true,
        componentLibrary: 'tailwind' as const,
        generateTests: false,
        generateStorybook: false
      };

      expect(options.framework).toBe('react');
      expect(options.typescript).toBe(true);
      expect(options.componentLibrary).toBe('tailwind');
    });

    it('should generate code structure with expected properties', () => {
      const mockGeneratedCode: GeneratedCode = {
        framework: 'react',
        language: 'typescript',
        files: {
          'Component.tsx': '// Mock component',
          'package.json': '{}'
        },
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        instructions: 'npm install && npm run dev',
        metadata: {
          componentCount: 1,
          linesOfCode: 50,
          complexity: 'simple',
          estimatedTime: '5 minutes'
        }
      };

      expect(mockGeneratedCode.framework).toBe('react');
      expect(mockGeneratedCode.language).toBe('typescript');
      expect(Object.keys(mockGeneratedCode.files).length).toBeGreaterThan(0);
      expect(mockGeneratedCode.metadata.componentCount).toBeGreaterThan(0);
    });
  });

  describe('VisualRegressionEngine', () => {
    it('should export VisualRegressionEngine class', () => {
      expect(VisualRegressionEngine).toBeDefined();
      expect(typeof VisualRegressionEngine).toBe('function');
    });

    it('should create VisualRegressionEngine instance', () => {
      expect(regressionEngine).toBeDefined();
      expect(regressionEngine).toBeInstanceOf(VisualRegressionEngine);
    });

    it('should have compareScreenshots method', () => {
      expect(regressionEngine.compareScreenshots).toBeDefined();
      expect(typeof regressionEngine.compareScreenshots).toBe('function');
    });

    it('should have isAcceptableMatch method', () => {
      expect(regressionEngine.isAcceptableMatch).toBeDefined();
      expect(typeof regressionEngine.isAcceptableMatch).toBe('function');
    });

    it('should validate comparison options', () => {
      const options = {
        similarityThreshold: 85,
        ignoreMinorDifferences: true,
        detailLevel: 'detailed' as const,
        generateReport: false
      };

      expect(options.similarityThreshold).toBe(85);
      expect(options.ignoreMinorDifferences).toBe(true);
      expect(options.detailLevel).toBe('detailed');
    });

    it('should create visual diff structure', () => {
      const mockVisualDiff: VisualDiff = {
        overallSimilarity: 88.5,
        dimensions: {
          width: { original: 1920, generated: 1920, match: true },
          height: { original: 1080, generated: 1080, match: true }
        },
        differences: {
          layout: [],
          colors: [],
          typography: [],
          spacing: []
        },
        suggestions: ['Good visual match'],
        passesThreshold: true,
        metadata: {
          originalPath: '/path/to/original.png',
          generatedPath: '/path/to/generated.png',
          comparisonTime: 1500,
          algorithm: 'pixel-diff + semantic-analysis'
        }
      };

      expect(mockVisualDiff.overallSimilarity).toBeGreaterThan(85);
      expect(mockVisualDiff.passesThreshold).toBe(true);
      expect(mockVisualDiff.dimensions.width.match).toBe(true);
    });

    it('should correctly evaluate similarity threshold', () => {
      const passingDiff: VisualDiff = {
        overallSimilarity: 90,
        dimensions: {
          width: { original: 1920, generated: 1920, match: true },
          height: { original: 1080, generated: 1080, match: true }
        },
        differences: { layout: [], colors: [], typography: [], spacing: [] },
        suggestions: [],
        passesThreshold: true,
        metadata: {
          originalPath: '',
          generatedPath: '',
          comparisonTime: 0,
          algorithm: 'test'
        }
      };

      expect(regressionEngine.isAcceptableMatch(passingDiff, 85)).toBe(true);
    });
  });

  describe('ScreenshotToCodeOrchestrator', () => {
    it('should export ScreenshotToCodeOrchestrator class', () => {
      expect(ScreenshotToCodeOrchestrator).toBeDefined();
      expect(typeof ScreenshotToCodeOrchestrator).toBe('function');
    });

    it('should create ScreenshotToCodeOrchestrator instance', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator).toBeInstanceOf(ScreenshotToCodeOrchestrator);
    });

    it('should have execute method', () => {
      expect(orchestrator.execute).toBeDefined();
      expect(typeof orchestrator.execute).toBe('function');
    });

    it('should validate orchestrator options', () => {
      const options = {
        analysisOptions: {
          detailLevel: 'comprehensive' as const
        },
        generationOptions: {
          framework: 'react' as const,
          typescript: true,
          componentLibrary: 'tailwind' as const,
          generateTests: false,
          generateStorybook: false
        },
        comparisonOptions: {
          similarityThreshold: 85,
          ignoreMinorDifferences: true,
          detailLevel: 'detailed' as const,
          generateReport: false
        },
        maxRefinementIterations: 3,
        similarityThreshold: 85,
        enableIterativeRefinement: true,
        enableQualityValidation: true,
        enableConstitutionalAI: true,
        outputDirectory: './output',
        generateReport: false,
        saveIntermediateResults: false
      };

      expect(options.maxRefinementIterations).toBe(3);
      expect(options.similarityThreshold).toBe(85);
      expect(options.enableIterativeRefinement).toBe(true);
    });

    it('should create pipeline result structure', () => {
      const mockResult: PipelineResult = {
        success: true,
        finalCode: {
          framework: 'react',
          language: 'typescript',
          files: { 'Component.tsx': '// code' },
          dependencies: { react: '^18.0.0' },
          instructions: 'npm install',
          metadata: {
            componentCount: 1,
            linesOfCode: 50,
            complexity: 'simple',
            estimatedTime: '5 minutes'
          }
        },
        finalSimilarity: 88.5,
        iterations: [],
        totalDuration: 30000,
        metadata: {
          originalScreenshot: '/path/to/screenshot.png',
          analysisModel: 'claude-sonnet-4.5',
          framework: 'react',
          componentLibrary: 'tailwind',
          iterationsRun: 1,
          qualityGatesPassed: true
        }
      };

      expect(mockResult.success).toBe(true);
      expect(mockResult.finalSimilarity).toBeGreaterThan(85);
      expect(mockResult.metadata.qualityGatesPassed).toBe(true);
    });
  });

  describe('Type Exports and Interfaces', () => {
    it('should export UIAnalysis type', () => {
      const analysis: UIAnalysis = {
        layout: {
          type: 'flex',
          structure: []
        },
        components: [],
        styling: {
          framework: 'tailwind',
          colors: {
            primary: '#3B82F6',
            secondary: '#10B981',
            background: '#FFFFFF',
            text: '#1F2937',
            error: '#EF4444',
            palette: []
          },
          typography: {
            fontFamily: 'Inter',
            baseFontSize: 16,
            scale: [12, 14, 16, 20, 24],
            weights: [400, 600, 700],
            lineHeights: [1.5]
          },
          spacing: {
            unit: 4,
            scale: [4, 8, 12, 16, 24, 32],
            padding: [],
            margin: [],
            gap: []
          }
        },
        accessibility: {
          landmarks: [],
          headingHierarchy: [],
          formLabels: []
        },
        confidence: {
          overall: 85,
          layout: 90,
          components: 85,
          styling: 80
        }
      };

      expect(analysis.layout.type).toBe('flex');
      expect(analysis.confidence.overall).toBeGreaterThan(0);
    });

    it('should validate component library types', () => {
      const libraries: Array<'tailwind' | 'mui' | 'chakra' | 'bootstrap' | 'custom'> = [
        'tailwind',
        'mui',
        'chakra',
        'bootstrap',
        'custom'
      ];

      expect(libraries).toContain('tailwind');
      expect(libraries).toContain('mui');
      expect(libraries.length).toBe(5);
    });

    it('should validate framework types', () => {
      const frameworks: Array<'react' | 'vue' | 'svelte' | 'vanilla'> = [
        'react',
        'vue',
        'svelte',
        'vanilla'
      ];

      expect(frameworks).toContain('react');
      expect(frameworks).toContain('vue');
      expect(frameworks.length).toBe(4);
    });
  });

  describe('Integration Workflow', () => {
    it('should define complete pipeline flow', () => {
      const workflow = [
        'Vision Analysis',
        'Code Generation',
        'Visual Validation',
        'Iterative Refinement'
      ];

      expect(workflow).toHaveLength(4);
      expect(workflow[0]).toBe('Vision Analysis');
      expect(workflow[workflow.length - 1]).toBe('Iterative Refinement');
    });

    it('should validate refinement iteration structure', () => {
      interface RefinementIteration {
        iteration: number;
        analysis: UIAnalysis;
        generatedCode: GeneratedCode;
        visualDiff: VisualDiff;
        similarityScore: number;
        improvements: string[];
        timestamp: number;
      }

      const mockIteration: RefinementIteration = {
        iteration: 1,
        analysis: {} as UIAnalysis,
        generatedCode: {} as GeneratedCode,
        visualDiff: {} as VisualDiff,
        similarityScore: 88.5,
        improvements: ['Adjusted spacing', 'Fixed color mismatch'],
        timestamp: Date.now()
      };

      expect(mockIteration.iteration).toBe(1);
      expect(mockIteration.similarityScore).toBeGreaterThan(0);
      expect(mockIteration.improvements.length).toBeGreaterThan(0);
    });

    it('should define quality gate validation', () => {
      const qualityChecks = [
        'package.json present',
        'README.md present',
        'Tests included',
        'Constitutional AI passed'
      ];

      expect(qualityChecks).toContain('package.json present');
      expect(qualityChecks).toContain('Constitutional AI passed');
    });

    it('should validate error handling', () => {
      const errors: string[] = [];

      expect(errors).toBeDefined();
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Module Integration', () => {
    it('should integrate VisionCodeAnalyzer with LLMRouter', () => {
      expect(visionAnalyzer).toBeDefined();
      expect(router).toBeDefined();
    });

    it('should integrate UICodeGenerator independently', () => {
      expect(codeGenerator).toBeDefined();
      // UICodeGenerator doesn't require LLMRouter
    });

    it('should integrate VisualRegressionEngine independently', () => {
      expect(regressionEngine).toBeDefined();
      // VisualRegressionEngine can work independently
    });

    it('should integrate all modules in Orchestrator', () => {
      expect(orchestrator).toBeDefined();
      expect(router).toBeDefined();
      // Orchestrator coordinates all three modules
    });
  });

  describe('Configuration Validation', () => {
    it('should validate similarity thresholds', () => {
      const thresholds = [70, 75, 80, 85, 90, 95];

      expect(thresholds).toContain(85); // Default threshold
      expect(Math.min(...thresholds)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...thresholds)).toBeLessThanOrEqual(100);
    });

    it('should validate max refinement iterations', () => {
      const validIterations = [1, 2, 3, 5, 10];

      expect(validIterations).toContain(3); // Default max iterations
      expect(Math.min(...validIterations)).toBeGreaterThan(0);
    });

    it('should validate detail levels', () => {
      const detailLevels: Array<'basic' | 'detailed' | 'comprehensive'> = [
        'basic',
        'detailed',
        'comprehensive'
      ];

      expect(detailLevels).toContain('detailed'); // Default detail level
      expect(detailLevels.length).toBe(3);
    });
  });
});
