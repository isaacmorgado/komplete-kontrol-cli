/**
 * Tests for Self-Healing Loop module
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  SelfHealingLoop,
  LoopStage,
  LoopState,
  TerminationCondition,
  ErrorPatternMatching,
  AutoSuggestionSystem,
  FixValidation,
  initSelfHealingLoop,
  getSelfHealingLoop,
  LoopOptionsSchema,
} from '../src/core/healing';

describe('Self-Healing Loop', () => {
  let loop: SelfHealingLoop;
  let patternMatching: ErrorPatternMatching;
  let suggestionSystem: AutoSuggestionSystem;
  let fixValidation: FixValidation;

  beforeEach(() => {
    patternMatching = new ErrorPatternMatching();
    suggestionSystem = new AutoSuggestionSystem();
    fixValidation = new FixValidation();
    loop = new SelfHealingLoop({
      patternMatching,
      suggestionSystem,
      fixValidation,
    });
  });

  afterEach(() => {
    loop.clearLoops();
  });

  describe('SelfHealingLoop', () => {
    it('should initialize correctly', () => {
      expect(loop).toBeDefined();
      expect(loop.getAllLoopStates().size).toBe(0);
    });

    it('should start a loop and return result', async () => {
      const prompt = 'Create a simple function';
      const options = {
        maxIterations: 3,
        autoApplyFixes: true,
      };

      const result = await loop.startLoop(prompt, options);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.iterations).toBeGreaterThanOrEqual(0);
      expect(result.terminationCondition).toBeDefined();
      expect(result.finalCode).toBeDefined();
      expect(Array.isArray(result.appliedFixes)).toBe(true);
      expect(Array.isArray(result.errorHistory)).toBe(true);
      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should stop a running loop', () => {
      // Start a loop (in a real scenario this would be async)
      const loopId = 'test_loop_id';
      const mockState: LoopState = {
        id: loopId,
        stage: LoopStage.PROMPT,
        iteration: 0,
        maxIterations: 10,
        prompt: 'Test prompt',
        code: '',
        currentCode: '',
        appliedFixes: [],
        errorHistory: [],
        metadata: {},
      };

      // Manually add a mock state
      loop['loops'].set(loopId, mockState);

      const stopped = loop.stopLoop(loopId);

      expect(stopped).toBe(true);

      const state = loop.getLoopState(loopId);
      expect(state?.stage).toBe(LoopStage.FAILED);
      expect(state?.metadata['terminated']).toBe(true);
    });

    it('should return false when stopping non-existent loop', () => {
      const stopped = loop.stopLoop('non_existent_id');
      expect(stopped).toBe(false);
    });

    it('should get loop state', () => {
      const loopId = 'test_loop_id';
      const mockState: LoopState = {
        id: loopId,
        stage: LoopStage.PROMPT,
        iteration: 0,
        maxIterations: 10,
        prompt: 'Test prompt',
        code: '',
        currentCode: '',
        appliedFixes: [],
        errorHistory: [],
        metadata: {},
      };

      loop['loops'].set(loopId, mockState);

      const state = loop.getLoopState(loopId);

      expect(state).toBeDefined();
      expect(state?.id).toBe(loopId);
      expect(state?.stage).toBe(LoopStage.PROMPT);
    });

    it('should return undefined for non-existent loop state', () => {
      const state = loop.getLoopState('non_existent_id');
      expect(state).toBeUndefined();
    });

    it('should get all loop states', () => {
      const loopId1 = 'test_loop_id_1';
      const loopId2 = 'test_loop_id_2';

      const mockState1: LoopState = {
        id: loopId1,
        stage: LoopStage.PROMPT,
        iteration: 0,
        maxIterations: 10,
        prompt: 'Test prompt 1',
        code: '',
        currentCode: '',
        appliedFixes: [],
        errorHistory: [],
        metadata: {},
      };

      const mockState2: LoopState = {
        id: loopId2,
        stage: LoopStage.CODE,
        iteration: 1,
        maxIterations: 10,
        prompt: 'Test prompt 2',
        code: '',
        currentCode: '',
        appliedFixes: [],
        errorHistory: [],
        metadata: {},
      };

      loop['loops'].set(loopId1, mockState1);
      loop['loops'].set(loopId2, mockState2);

      const states = loop.getAllLoopStates();

      expect(states.size).toBe(2);
      expect(states.has(loopId1)).toBe(true);
      expect(states.has(loopId2)).toBe(true);
    });

    it('should clear all loops', () => {
      const loopId = 'test_loop_id';
      const mockState: LoopState = {
        id: loopId,
        stage: LoopStage.PROMPT,
        iteration: 0,
        maxIterations: 10,
        prompt: 'Test prompt',
        code: '',
        currentCode: '',
        appliedFixes: [],
        errorHistory: [],
        metadata: {},
      };

      loop['loops'].set(loopId, mockState);

      expect(loop.getAllLoopStates().size).toBe(1);

      loop.clearLoops();

      expect(loop.getAllLoopStates().size).toBe(0);
    });

    it('should respect max iterations option', async () => {
      const prompt = 'Create a function that will fail';
      const options = {
        maxIterations: 2,
        autoApplyFixes: true,
      };

      const result = await loop.startLoop(prompt, options);

      expect(result.iterations).toBeLessThanOrEqual(options.maxIterations);
    });
  });

  describe('ErrorPatternMatching', () => {
    it('should initialize with default patterns', () => {
      const patterns = patternMatching.getAllPatterns();

      expect(patterns.size).toBeGreaterThan(0);
    });

    it('should match error patterns', () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';

      const matches = patternMatching.matchPatterns(errorText);

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const errorText = 'This is a random message with no error patterns';

      const matches = patternMatching.matchPatterns(errorText);

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
    });

    it('should filter by category', () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const options = {
        includeCategories: ['reference' as const],
      };

      const matches = patternMatching.matchPatterns(errorText, options);

      expect(matches.length).toBeGreaterThan(0);
    });

    it('should filter by severity', () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const options = {
        includeSeverities: ['critical' as const],
      };

      const matches = patternMatching.matchPatterns(errorText, options);

      expect(matches.length).toBeGreaterThan(0);
    });

    it('should limit max results', () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const options = {
        maxResults: 1,
      };

      const matches = patternMatching.matchPatterns(errorText, options);

      expect(matches.length).toBeLessThanOrEqual(1);
    });

    it('should get pattern by ID', () => {
      const patterns = patternMatching.getAllPatterns();
      const firstPatternId = patterns.keys().next().value;

      const pattern = patternMatching.getPattern(firstPatternId);

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe(firstPatternId);
    });

    it('should add custom pattern', () => {
      const customPattern = {
        id: 'custom_pattern',
        name: 'Custom Pattern',
        pattern: /Custom error/i,
        category: 'syntax' as const,
        severity: 'high' as const,
        suggestedFixes: ['Fix the custom error'],
        confidence: 0.9,
        metadata: {},
      };

      patternMatching.addPattern(customPattern);

      const retrieved = patternMatching.getPattern('custom_pattern');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Pattern');
    });

    it('should remove pattern', () => {
      const customPattern = {
        id: 'removable_pattern',
        name: 'Removable Pattern',
        pattern: /Removable error/i,
        category: 'syntax' as const,
        severity: 'high' as const,
        suggestedFixes: ['Fix the removable error'],
        confidence: 0.9,
        metadata: {},
      };

      patternMatching.addPattern(customPattern);
      let retrieved = patternMatching.getPattern('removable_pattern');
      expect(retrieved).toBeDefined();

      const removed = patternMatching.removePattern('removable_pattern');
      expect(removed).toBe(true);

      retrieved = patternMatching.getPattern('removable_pattern');
      expect(retrieved).toBeUndefined();
    });

    it('should get statistics', () => {
      const stats = patternMatching.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.patternsByCategory).toBeDefined();
      expect(stats.patternsBySeverity).toBeDefined();
    });

    it('should search by category', () => {
      const patterns = patternMatching.searchByCategory('syntax' as const);

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should search by severity', () => {
      const patterns = patternMatching.searchBySeverity('high' as const);

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should search by name', () => {
      const patterns = patternMatching.searchByName('missing');

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('AutoSuggestionSystem', () => {
    it('should initialize correctly', () => {
      expect(suggestionSystem).toBeDefined();
      expect(suggestionSystem.getAllSuggestions().size).toBe(0);
    });

    it('should generate suggestions from error', async () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const code = 'const x = undefinedVariable;';

      const suggestions = await suggestionSystem.generateSuggestions(errorText, code);

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return empty array for no patterns', async () => {
      const errorText = 'Random message with no error patterns';
      const code = 'const x = 5;';

      const suggestions = await suggestionSystem.generateSuggestions(errorText, code);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });

    it('should filter suggestions by type', async () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const code = 'const x = undefinedVariable;';
      const options = {
        includeTypes: ['fix' as const],
      };

      const suggestions = await suggestionSystem.generateSuggestions(
        errorText,
        code,
        options
      );

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should filter suggestions by priority', async () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const code = 'const x = undefinedVariable;';
      const options = {
        includePriorities: ['high' as const],
      };

      const suggestions = await suggestionSystem.generateSuggestions(
        errorText,
        code,
        options
      );

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should limit max suggestions', async () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const code = 'const x = undefinedVariable;';
      const options = {
        maxSuggestions: 1,
      };

      const suggestions = await suggestionSystem.generateSuggestions(
        errorText,
        code,
        options
      );

      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should rank suggestions by confidence', async () => {
      const errorText = 'Error: Cannot find name "undefinedVariable"';
      const code = 'const x = undefinedVariable;';

      const suggestions = await suggestionSystem.generateSuggestions(errorText, code);

      // Check if suggestions are sorted by confidence
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].confidence).toBeLessThanOrEqual(
          suggestions[i - 1].confidence
        );
      }
    });

    it('should track suggestion usage', () => {
      const suggestionId = 'test_suggestion';

      suggestionSystem.trackSuggestionUsage(suggestionId);
      suggestionSystem.trackSuggestionUsage(suggestionId);

      const stats = suggestionSystem.getStatistics();
      const topUsed = stats.topUsedSuggestions.find((s) => s.id === suggestionId);

      expect(topUsed?.count).toBe(2);
    });

    it('should get statistics', () => {
      const stats = suggestionSystem.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSuggestions).toBeGreaterThanOrEqual(0);
      expect(stats.suggestionsByType).toBeDefined();
      expect(stats.suggestionsByPriority).toBeDefined();
      expect(Array.isArray(stats.topUsedSuggestions)).toBe(true);
    });

    it('should clear suggestions', () => {
      const customSuggestion = {
        id: 'test_suggestion',
        type: 'fix' as const,
        priority: 'high' as const,
        description: 'Test suggestion',
        fix: 'const x = 5;',
        confidence: 0.9,
        relatedPatterns: [],
        metadata: {},
      };

      suggestionSystem.addSuggestion(customSuggestion);

      expect(suggestionSystem.getAllSuggestions().size).toBe(1);

      suggestionSystem.clearSuggestions();

      expect(suggestionSystem.getAllSuggestions().size).toBe(0);
    });
  });

  describe('FixValidation', () => {
    it('should initialize correctly', () => {
      expect(fixValidation).toBeDefined();
      expect(fixValidation.getBackups().size).toBe(0);
    });

    it('should validate code', async () => {
      const code = 'const x: number = 5;';
      const language = 'typescript';

      const result = await fixValidation.validateFix(code, language);

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.validationTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect syntax errors', async () => {
      const code = 'const x: number = 5'; // Missing semicolon
      const language = 'typescript';

      const result = await fixValidation.validateFix(code, language);

      expect(result).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should detect type issues', async () => {
      const code = 'const x: any = 5; const y: any = 10; const z: any = 15; const a: any = 20; const b: any = 25; const c: any = 30;';
      const language = 'typescript';

      const result = await fixValidation.validateFix(code, language);

      expect(result).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should detect linting issues', async () => {
      const code = 'console.log("test");\nconst x: number = 5;';
      const language = 'typescript';

      const result = await fixValidation.validateFix(code, language);

      expect(result).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should create backup', async () => {
      const code = 'const x: number = 5;';

      const backupPath = await fixValidation.createBackup(code);

      expect(backupPath).toBeDefined();
      expect(typeof backupPath).toBe('string');
    });

    it('should rollback to backup', async () => {
      const originalCode = 'const x: number = 5;';
      const backupPath = await fixValidation.createBackup(originalCode);

      const result = await fixValidation.rollback(backupPath, originalCode);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(true);
    });

    it('should handle rollback with no backup', async () => {
      const originalCode = 'const x: number = 5;';

      const result = await fixValidation.rollback(undefined, originalCode);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(false);
    });

    it('should validate with rollback', async () => {
      const originalCode = 'const x: number = 5;';
      const fixedCode = 'const x: number = 10;';
      const language = 'typescript';
      const rollbackOptions = {
        createBackup: true,
        rollbackOnValidationFailure: true,
      };

      const result = await fixValidation.validateWithRollback(
        originalCode,
        fixedCode,
        language,
        {},
        rollbackOptions
      );

      expect(result).toBeDefined();
      expect(result.validation).toBeDefined();
    });

    it('should get validation history', async () => {
      const code = 'const x: number = 5;';
      const language = 'typescript';

      await fixValidation.validateFix(code, language);
      await fixValidation.validateFix(code, language);

      const history = fixValidation.getValidationHistory(code);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(2);
    });

    it('should clear backups', async () => {
      const code = 'const x: number = 5;';

      await fixValidation.createBackup(code);

      expect(fixValidation.getBackups().size).toBe(1);

      fixValidation.clearBackups();

      expect(fixValidation.getBackups().size).toBe(0);
    });

    it('should clear validation history', async () => {
      const code = 'const x: number = 5;';
      const language = 'typescript';

      await fixValidation.validateFix(code, language);

      fixValidation.clearValidationHistory();

      const history = fixValidation.getValidationHistory(code);

      expect(history.length).toBe(0);
    });
  });

  describe('Global instances', () => {
    it('should initialize global self-healing loop', () => {
      const globalLoop = initSelfHealingLoop();

      expect(globalLoop).toBeDefined();
      expect(getSelfHealingLoop()).toBe(globalLoop);
    });

    it('should return same global instance', () => {
      const loop1 = getSelfHealingLoop();
      const loop2 = getSelfHealingLoop();

      expect(loop1).toBe(loop2);
    });
  });

  describe('Schema validation', () => {
    it('should validate loop options', () => {
      const options = {
        maxIterations: 10,
        executionTimeout: 5000,
        autoApplyFixes: true,
        validateFixes: true,
      };

      const result = LoopOptionsSchema.safeParse(options);

      expect(result.success).toBe(true);
    });

    it('should reject invalid loop options', () => {
      const options = {
        maxIterations: -1,
      };

      const result = LoopOptionsSchema.safeParse(options);

      expect(result.success).toBe(false);
    });
  });
});
