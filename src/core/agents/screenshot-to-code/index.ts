/**
 * Screenshot-to-Code Pipeline - Phase 4
 *
 * Complete end-to-end screenshot-to-code implementation with:
 * - Vision analysis using Claude Sonnet 4.5 + Gemini MCP fallback
 * - React + Tailwind code generation with multiple component libraries
 * - Visual regression testing with similarity scoring
 * - Iterative refinement loop (max 3 iterations)
 * - Quality validation gates
 *
 * @module screenshot-to-code
 */

// Core orchestrator
export { ScreenshotToCodeOrchestrator } from './ScreenshotToCodeOrchestrator';
export type {
  OrchestratorOptions,
  RefinementIteration,
  PipelineResult
} from './ScreenshotToCodeOrchestrator';

// Vision analysis
export { VisionCodeAnalyzer } from './VisionCodeAnalyzer';
export type {
  UIAnalysis,
  AnalysisOptions,
  LayoutType,
  LayoutNode,
  ComponentSpec,
  ColorPalette,
  TypographySpec,
  SpacingSystem,
  Framework,
  ComponentLibrary
} from './VisionCodeAnalyzer';

// Code generation
export { UICodeGenerator } from './UICodeGenerator';
export type {
  GeneratedCode,
  CodeGenerationOptions
} from './UICodeGenerator';

// Visual regression
export { VisualRegressionEngine } from './VisualRegressionEngine';
export type {
  VisualDiff,
  ComparisonOptions,
  LayoutDiff,
  ColorDiff,
  TypographyDiff,
  SpacingDiff
} from './VisualRegressionEngine';
