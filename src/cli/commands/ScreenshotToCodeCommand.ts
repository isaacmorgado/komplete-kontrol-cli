/**
 * ScreenshotToCodeCommand - CLI command for screenshot-to-code pipeline
 *
 * Converts UI screenshots into production-ready React code with iterative refinement.
 *
 * @module ScreenshotToCodeCommand
 */

import { Command } from 'commander';
import { createDefaultRegistry } from '../../core/llm/providers/ProviderFactory';
import { LLMRouter } from '../../core/llm/Router';
import { ScreenshotToCodeOrchestrator, type OrchestratorOptions } from '../../core/agents/screenshot-to-code';
import type { ComponentLibrary } from '../../core/agents/screenshot-to-code/VisionCodeAnalyzer';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ScreenshotToCodeOptions {
  output?: string;
  framework?: 'react' | 'vue' | 'svelte';
  library?: ComponentLibrary;
  typescript?: boolean;
  maxIterations?: number;
  threshold?: number;
  tests?: boolean;
  storybook?: boolean;
  report?: boolean;
  saveIntermediate?: boolean;
  detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  preferredModel?: string;
}

/**
 * Create screenshot-to-code CLI command
 */
export function createScreenshotToCodeCommand(): Command {
  const command = new Command('screenshot-to-code');

  command
    .description('Convert UI screenshots to production-ready code')
    .argument('<screenshot>', 'Path to screenshot file (PNG, JPG, JPEG)')
    .option('-o, --output <path>', 'Output directory for generated code', './output')
    .option('-f, --framework <framework>', 'Target framework (react, vue, svelte)', 'react')
    .option('-l, --library <library>', 'Component library (tailwind, mui, chakra, bootstrap)', 'tailwind')
    .option('--typescript', 'Generate TypeScript code', true)
    .option('--no-typescript', 'Generate JavaScript code')
    .option('-i, --max-iterations <number>', 'Max refinement iterations', '3')
    .option('-t, --threshold <number>', 'Similarity threshold (0-100)', '85')
    .option('--tests', 'Generate test files', false)
    .option('--storybook', 'Generate Storybook stories', false)
    .option('-r, --report', 'Generate HTML comparison report', false)
    .option('--save-intermediate', 'Save intermediate iteration results', false)
    .option('-d, --detail-level <level>', 'Analysis detail level (basic, detailed, comprehensive)', 'detailed')
    .option('-m, --preferred-model <model>', 'Preferred LLM model', 'claude-sonnet-4.5')
    .action(async (screenshotPath: string, options: ScreenshotToCodeOptions) => {
      try {
        await executeScreenshotToCode(screenshotPath, options);
      } catch (error) {
        console.error('❌ Screenshot-to-code failed:', error);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Execute screenshot-to-code pipeline
 */
async function executeScreenshotToCode(
  screenshotPath: string,
  options: ScreenshotToCodeOptions
): Promise<void> {
  console.log('🚀 Starting screenshot-to-code pipeline...\n');

  // Validate screenshot file
  await validateScreenshot(screenshotPath);

  // Initialize LLM Router
  console.log('🔧 Initializing LLM Router...');
  const registry = await createDefaultRegistry();
  const router = new LLMRouter(registry);
  console.log('✅ Router initialized\n');

  // Initialize orchestrator
  console.log('🔧 Initializing screenshot-to-code orchestrator...');
  const orchestrator = new ScreenshotToCodeOrchestrator(router);
  console.log('✅ Orchestrator initialized\n');

  // Build orchestrator options
  const orchestratorOptions: OrchestratorOptions = {
    analysisOptions: {
      detailLevel: (options.detailLevel ?? 'detailed') as 'basic' | 'detailed' | 'comprehensive'
    },
    generationOptions: {
      framework: options.framework ?? 'react',
      typescript: options.typescript ?? true,
      componentLibrary: (options.library ?? 'tailwind') as ComponentLibrary,
      generateTests: options.tests ?? false,
      generateStorybook: options.storybook ?? false
    },
    comparisonOptions: {
      similarityThreshold: Number(options.threshold ?? 85),
      ignoreMinorDifferences: true,
      detailLevel: (options.detailLevel ?? 'detailed') as 'basic' | 'detailed' | 'comprehensive',
      generateReport: false // Handled separately by orchestrator
    },
    maxRefinementIterations: Number(options.maxIterations ?? 3),
    similarityThreshold: Number(options.threshold ?? 85),
    enableIterativeRefinement: true,
    enableQualityValidation: true,
    enableConstitutionalAI: true,
    outputDirectory: options.output ?? './output',
    generateReport: options.report ?? false,
    saveIntermediateResults: options.saveIntermediate ?? false
  };

  // Display configuration
  console.log('⚙️  Configuration:');
  console.log(`   Screenshot: ${screenshotPath}`);
  console.log(`   Output: ${orchestratorOptions.outputDirectory}`);
  console.log(`   Framework: ${orchestratorOptions.generationOptions?.framework}`);
  console.log(`   Library: ${orchestratorOptions.generationOptions?.componentLibrary}`);
  console.log(`   TypeScript: ${orchestratorOptions.generationOptions?.typescript ? 'Yes' : 'No'}`);
  console.log(`   Max Iterations: ${orchestratorOptions.maxRefinementIterations}`);
  console.log(`   Similarity Threshold: ${orchestratorOptions.similarityThreshold}%`);
  console.log(`   Generate Tests: ${orchestratorOptions.generationOptions?.generateTests ? 'Yes' : 'No'}`);
  console.log(`   Generate Storybook: ${orchestratorOptions.generationOptions?.generateStorybook ? 'Yes' : 'No'}`);
  console.log(`   HTML Report: ${orchestratorOptions.generateReport ? 'Yes' : 'No'}`);
  console.log('');

  // Execute pipeline
  const result = await orchestrator.execute(screenshotPath, orchestratorOptions);

  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '⚠️ INCOMPLETE'}`);
  console.log(`Final Similarity: ${result.finalSimilarity.toFixed(1)}%`);
  console.log(`Iterations: ${result.iterations.length}/${result.metadata.iterationsRun}`);
  console.log(`Duration: ${(result.totalDuration / 1000).toFixed(1)}s`);
  console.log(`Files Generated: ${Object.keys(result.finalCode.files).length}`);
  console.log(`Total Lines: ${result.finalCode.metadata.linesOfCode}`);
  console.log(`Quality Gates: ${result.metadata.qualityGatesPassed ? '✅ PASSED' : '⚠️ FAILED'}`);
  console.log('');

  // Display iteration history
  if (result.iterations.length > 1) {
    console.log('📈 Iteration History:');
    result.iterations.forEach((iter, _idx) => {
      const status = iter.visualDiff.passesThreshold ? '✅' : '⏳';
      console.log(`   ${status} Iteration ${iter.iteration}: ${iter.similarityScore.toFixed(1)}% similarity`);
    });
    console.log('');
  }

  // Display errors if any
  if (result.errors && result.errors.length > 0) {
    console.log('⚠️  Errors Encountered:');
    result.errors.forEach(err => console.log(`   ❌ ${err}`));
    console.log('');
  }

  // Display output location
  console.log('📁 Output Location:');
  console.log(`   ${path.resolve(orchestratorOptions.outputDirectory!)}`);

  if (orchestratorOptions.generateReport) {
    console.log(`   Report: ${path.resolve(orchestratorOptions.outputDirectory!, 'comparison-report.html')}`);
  }
  console.log('');

  // Display next steps
  console.log('🚀 Next Steps:');
  console.log(`   1. Review generated code in ${orchestratorOptions.outputDirectory}`);
  console.log(`   2. Run: cd ${orchestratorOptions.outputDirectory} && npm install`);
  console.log(`   3. Start dev server: npm run dev`);

  if (orchestratorOptions.generationOptions?.generateTests) {
    console.log(`   4. Run tests: npm test`);
  }

  if (orchestratorOptions.generationOptions?.generateStorybook) {
    console.log(`   5. View Storybook: npm run storybook`);
  }

  console.log('');
  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

/**
 * Validate screenshot file exists and is correct format
 */
async function validateScreenshot(screenshotPath: string): Promise<void> {
  try {
    // Check file exists
    await fs.access(screenshotPath);

    // Check file extension
    const ext = path.extname(screenshotPath).toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    if (!validExtensions.includes(ext)) {
      throw new Error(`Invalid file format: ${ext}. Supported: ${validExtensions.join(', ')}`);
    }

    console.log(`✅ Screenshot validated: ${screenshotPath}\n`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Screenshot file not found: ${screenshotPath}`);
    }
    throw error;
  }
}

/**
 * Export for use in main CLI
 */
export default createScreenshotToCodeCommand;
