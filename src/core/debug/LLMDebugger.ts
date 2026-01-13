/**
 * LLM-Enhanced Debugger - AI-powered debugging with Debug Orchestrator
 *
 * Integrates Debug Orchestrator with LLM for intelligent debugging
 * Generates fix suggestions, analyzes errors, and provides guidance
 */

import { DebugOrchestrator, createDebugOrchestrator } from './orchestrator';
import type {
  SmartDebugInput,
  VerifyFixInput,
  SmartDebugContext,
  FixRecommendation,
  BugFixRecord
} from './orchestrator';
import { createLLMClient } from '../llm';
import type { LLMResponse } from '../llm';

/**
 * LLM-enhanced debugging configuration
 */
export interface LLMDebugConfig {
  debugDir?: string;
  githubMcpAvailable?: boolean;
  model?: string;
  temperature?: number;
}

/**
 * Fix generation result
 */
export interface FixGeneration {
  approach: string;
  code?: string;
  steps: string[];
  confidence: number;
  alternatives: string[];
}

/**
 * Error analysis result
 */
export interface ErrorAnalysis {
  errorType: string;
  rootCause: string;
  affectedComponents: string[];
  suggestedFixes: string[];
  similarIssues: BugFixRecord[];
}

/**
 * LLM-Enhanced Debugger
 */
export class LLMDebugger {
  private orchestrator: DebugOrchestrator;
  private llmClient: any;
  private config: LLMDebugConfig;

  constructor(config: LLMDebugConfig = {}) {
    this.config = config;
    this.orchestrator = createDebugOrchestrator(
      config.debugDir || '~/.claude/.debug',
      config.githubMcpAvailable || false
    );
  }

  /**
   * Initialize LLM client (async initialization)
   */
  async initialize(): Promise<void> {
    this.llmClient = await createLLMClient();
  }

  /**
   * Analyze an error with AI
   */
  async analyzeError(error: {
    message: string;
    stack?: string;
    context?: string;
  }): Promise<ErrorAnalysis> {
    if (!this.llmClient) await this.initialize();

    // Build analysis prompt
    const prompt = `Analyze this error and provide insights:

Error Message: ${error.message}
${error.stack ? `Stack Trace:\n${error.stack}` : ''}
${error.context ? `Context:\n${error.context}` : ''}

Please analyze:
1. Error type and classification
2. Most likely root cause
3. Affected components
4. Suggested fixes (3-5 specific actionable steps)

Format your response as JSON with keys: errorType, rootCause, affectedComponents (array), suggestedFixes (array)`;

    const response = await this.llmClient.complete(prompt, {
      system: 'You are an expert debugging assistant. Provide concise, actionable analysis.',
      taskType: 'debugging',
      priority: 'quality',
      model: this.config.model
    });

    // Search similar issues in memory
    const similarIssues = await this.orchestrator.searchSimilarBugs(error.message, 3);

    // Parse LLM response (attempt JSON parse, fallback to text parsing)
    try {
      const analysis = this.parseAnalysisResponse(response);
      return {
        ...analysis,
        similarIssues: similarIssues.similarFixes
      };
    } catch (e: any) {
      // Fallback parsing
      return {
        errorType: 'unknown',
        rootCause: error.message,
        affectedComponents: [],
        suggestedFixes: ['Manual investigation required'],
        similarIssues: similarIssues.similarFixes
      };
    }
  }

  /**
   * Generate a fix using AI
   */
  async generateFix(input: {
    bugDescription: string;
    bugType?: string;
    context?: SmartDebugContext;
    constraints?: string[];
  }): Promise<FixGeneration> {
    if (!this.llmClient) await this.initialize();

    // Get debug context if not provided
    const debugContext =
      input.context ||
      (await this.orchestrator.smartDebug({
        bugDescription: input.bugDescription,
        bugType: input.bugType
      }));

    // Build fix generation prompt
    const prompt = this.buildFixPrompt(input.bugDescription, debugContext, input.constraints);

    const response = await this.llmClient.complete(prompt, {
      system: 'You are an expert software engineer. Generate high-quality, tested fixes.',
      taskType: 'coding',
      priority: 'quality',
      model: this.config.model
    });

    return this.parseFixResponse(response);
  }

  /**
   * Smart debug with AI enhancement
   */
  async smartDebug(input: SmartDebugInput): Promise<{
    context: SmartDebugContext;
    analysis: ErrorAnalysis;
    suggestedFix: FixGeneration;
  }> {
    // Get base debug context
    const context = await this.orchestrator.smartDebug(input);

    // Analyze error with AI
    const analysis = await this.analyzeError({
      message: input.bugDescription,
      context: input.context
    });

    // Generate fix suggestion
    const suggestedFix = await this.generateFix({
      bugDescription: input.bugDescription,
      bugType: input.bugType,
      context
    });

    return {
      context,
      analysis,
      suggestedFix
    };
  }

  /**
   * Verify fix with AI-powered analysis
   */
  async verifyFix(input: VerifyFixInput): Promise<{
    recommendation: FixRecommendation;
    aiInsights?: string;
  }> {
    // Run base verification
    const recommendation = await this.orchestrator.verifyFix(input);

    // If regression detected, get AI insights
    if (recommendation.regressionsDetected && this.llmClient) {
      const prompt = `A fix was applied but tests are now failing. Provide insights on:
1. Why might this regression have occurred?
2. What should be checked?
3. How to proceed?

Fix Description: ${input.fixDescription}
Recommendation: ${recommendation.recommendation}
Actions: ${recommendation.actions.join(', ')}`;

      const response = await this.llmClient.complete(prompt, {
        system: 'You are a debugging expert. Provide concise, actionable insights.',
        taskType: 'debugging',
        priority: 'speed',
        model: this.config.model
      });

      const aiInsights = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => (b as any).text)
        .join('\n');

      return {
        recommendation,
        aiInsights
      };
    }

    return { recommendation };
  }

  /**
   * Generate alternative approaches when stuck
   */
  async generateAlternatives(input: {
    bugDescription: string;
    failedApproaches: string[];
    constraints?: string[];
  }): Promise<string[]> {
    if (!this.llmClient) await this.initialize();

    // Search similar bugs in memory
    const similarFixes = await this.orchestrator.searchSimilarBugs(input.bugDescription, 5);

    // Use orchestrator's alternative generation
    const baseAlternatives = this.orchestrator.generateAlternatives(
      input.bugDescription,
      input.failedApproaches,
      similarFixes.similarFixes
    );

    // Enhance with AI
    const prompt = `Generate alternative debugging approaches for this issue:

Bug: ${input.bugDescription}

Failed Approaches:
${input.failedApproaches.map((a, i) => `${i + 1}. ${a}`).join('\n')}

${input.constraints ? `Constraints:\n${input.constraints.join('\n')}` : ''}

Provide 3-5 completely different approaches that avoid the failed strategies.
Be specific and actionable.`;

    const response = await this.llmClient.complete(prompt, {
      system: 'You are a creative problem solver. Think outside the box.',
      taskType: 'debugging',
      priority: 'quality',
      model: this.config.model
    });

    const aiAlternatives = this.parseAlternatives(response);

    // Combine base and AI alternatives, deduplicate
    const all = [...baseAlternatives, ...aiAlternatives];
    return Array.from(new Set(all));
  }

  /**
   * Parse analysis response from LLM
   */
  private parseAnalysisResponse(response: LLMResponse): Omit<ErrorAnalysis, 'similarIssues'> {
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');

    // Try JSON parsing first
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }

    // Fallback: extract from text
    return {
      errorType: this.extractSection(text, 'errorType') || 'unknown',
      rootCause: this.extractSection(text, 'rootCause') || 'Unknown',
      affectedComponents: this.extractArray(text, 'affectedComponents'),
      suggestedFixes: this.extractArray(text, 'suggestedFixes')
    };
  }

  /**
   * Parse fix response from LLM
   */
  private parseFixResponse(response: LLMResponse): FixGeneration {
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');

    // Extract code blocks
    const codeMatch = text.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : undefined;

    return {
      approach: this.extractSection(text, 'approach') || 'Fix generated',
      code,
      steps: this.extractSteps(text),
      confidence: 0.8, // Default confidence
      alternatives: this.extractArray(text, 'alternatives')
    };
  }

  /**
   * Parse alternatives from response
   */
  private parseAlternatives(response: LLMResponse): string[] {
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');

    // Extract numbered or bulleted lists
    const lines = text.split('\n');
    const alternatives: string[] = [];

    for (const line of lines) {
      const match = line.match(/^[\d\-\*\.]+\s+(.+)$/);
      if (match) {
        alternatives.push(match[1].trim());
      }
    }

    return alternatives;
  }

  /**
   * Build fix generation prompt
   */
  private buildFixPrompt(
    bug: string,
    context: SmartDebugContext,
    constraints?: string[]
  ): string {
    return `Fix this bug with a high-quality solution:

Bug: ${bug}

Similar Fixes Found: ${context.similarFixesCount}
${context.similarFixes.similarFixes.length > 0 ? `\nPrevious Solutions:\n${context.similarFixes.similarFixes.map((f: any) => `- ${f.fixDescription}`).join('\n')}` : ''}

${constraints ? `\nConstraints:\n${constraints.join('\n')}` : ''}

Provide:
1. Approach: High-level strategy
2. Code: Implementation (if applicable)
3. Steps: Detailed steps to apply fix
4. Alternatives: Other approaches to consider`;
  }

  /**
   * Extract section from text
   */
  private extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}[:\\s]+(.*?)(?=\\n[a-zA-Z]+:|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract array from text
   */
  private extractArray(text: string, section: string): string[] {
    const sectionText = this.extractSection(text, section);
    if (!sectionText) return [];

    // Try JSON array
    try {
      return JSON.parse(sectionText);
    } catch {}

    // Extract from list
    return sectionText
      .split('\n')
      .map(line => line.replace(/^[\-\*\d\.]+\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  /**
   * Extract steps from text
   */
  private extractSteps(text: string): string[] {
    const stepsText = this.extractSection(text, 'steps') || text;
    return this.extractArray(stepsText, 'steps');
  }
}

/**
 * Create LLM-enhanced debugger
 */
export async function createLLMDebugger(config?: LLMDebugConfig): Promise<LLMDebugger> {
  const instance = new LLMDebugger(config);
  await instance.initialize();
  return instance;
}
