/**
 * Tests for Codebase Indexing modules
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TreeSitterIntegration, Language, NodeType, getTreeSitter } from '../src/core/indexing/tree-sitter';
import {
  CodeStructureUnderstanding,
  SymbolType,
  Visibility,
  getCodeStructure,
} from '../src/core/indexing/structure';
import {
  DependencyGraphQueries,
  GraphNodeType,
  GraphEdgeType,
  getDependencyGraphQueries,
} from '../src/core/indexing/dependencies';
import {
  SmartContextStuffing,
  ContextItemType,
  ContextPriority,
  StuffingStrategy,
  getSmartContextStuffing,
} from '../src/core/indexing/context-stuffing';
import { Logger } from '../src/utils/logger';

describe('TreeSitterIntegration', () => {
  let treeSitter: TreeSitterIntegration;
  const logger = new Logger();

  beforeEach(() => {
    treeSitter = new TreeSitterIntegration({ logger });
  });

  afterEach(() => {
    treeSitter.clearCache();
  });

  describe('parse', () => {
    it('should parse TypeScript code', () => {
      const code = `
        function testFunction() {
          return 42;
        }
      `;

      const result = treeSitter.parse(code, Language.TYPESCRIPT);

      expect(result.success).toBe(true);
      expect(result.language).toBe(Language.TYPESCRIPT);
      expect(result.nodes.size).toBeGreaterThan(0);
    });

    it('should parse JavaScript code', () => {
      const code = 'const x = 10;';

      const result = treeSitter.parse(code, Language.JAVASCRIPT);

      expect(result.success).toBe(true);
      expect(result.language).toBe(Language.JAVASCRIPT);
    });

    it('should parse Python code', () => {
      const code = 'def test(): pass';

      const result = treeSitter.parse(code, Language.PYTHON);

      expect(result.success).toBe(true);
      expect(result.language).toBe(Language.PYTHON);
    });

    it('should parse JSON code', () => {
      const code = '{"key": "value"}';

      const result = treeSitter.parse(code, Language.JSON);

      expect(result.success).toBe(true);
      expect(result.language).toBe(Language.JSON);
    });

    it('should handle invalid code', () => {
      const code = 'invalid code {{{';

      const result = treeSitter.parse(code, Language.TYPESCRIPT);

      expect(result.success).toBe(true); // Simple parser doesn't fail
    });
  });

  describe('detectLanguage', () => {
    it('should detect TypeScript from .ts extension', () => {
      const language = treeSitter.detectLanguage('test.ts');
      expect(language).toBe(Language.TYPESCRIPT);
    });

    it('should detect JavaScript from .js extension', () => {
      const language = treeSitter.detectLanguage('test.js');
      expect(language).toBe(Language.JAVASCRIPT);
    });

    it('should detect Python from .py extension', () => {
      const language = treeSitter.detectLanguage('test.py');
      expect(language).toBe(Language.PYTHON);
    });

    it('should detect JSON from .json extension', () => {
      const language = treeSitter.detectLanguage('test.json');
      expect(language).toBe(Language.JSON);
    });

    it('should return undefined for unknown extension', () => {
      const language = treeSitter.detectLanguage('test.xyz');
      expect(language).toBeUndefined();
    });
  });

  describe('getNodesByType', () => {
    it('should return nodes of specified type', () => {
      const code = `
        function testFunction() {
          return 42;
        }
      `;

      const result = treeSitter.parse(code, Language.TYPESCRIPT);
      const functions = treeSitter.getNodesByType(result, NodeType.FUNCTION);

      expect(functions.length).toBeGreaterThan(0);
      expect(functions[0].type).toBe(NodeType.FUNCTION);
    });
  });

  describe('getChildren', () => {
    it('should return children of a node', () => {
      const code = 'const x = 10;';

      const result = treeSitter.parse(code, Language.TYPESCRIPT);
      const root = result.nodes.get(result.rootId);

      if (root) {
        const children = treeSitter.getChildren(result, root.id);
        expect(Array.isArray(children)).toBe(true);
      }
    });
  });

  describe('cache', () => {
    it('should cache parse results', () => {
      const code = 'function test() { return 1; }';

      const result1 = treeSitter.parse(code, Language.TYPESCRIPT);
      const result2 = treeSitter.parse(code, Language.TYPESCRIPT);

      expect(result1.rootId).toBe(result2.rootId);
    });

    it('should clear cache', () => {
      const code = 'function test() { return 1; }';

      treeSitter.parse(code, Language.TYPESCRIPT);
      treeSitter.clearCache();

      const stats = treeSitter.getCacheStatistics();
      expect(stats.size).toBe(0);
    });
  });

  describe('global instance', () => {
    it('should return global instance', () => {
      const instance = getTreeSitter();
      expect(instance).toBeInstanceOf(TreeSitterIntegration);
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = getTreeSitter();
      const instance2 = getTreeSitter();
      expect(instance1).toBe(instance2);
    });
  });
});

describe('CodeStructureUnderstanding', () => {
  let structure: CodeStructureUnderstanding;
  const logger = new Logger();

  beforeEach(() => {
    structure = new CodeStructureUnderstanding({ logger });
  });

  afterEach(() => {
    structure.clearCache();
  });

  describe('analyzeFile', () => {
    it('should analyze TypeScript file', async () => {
      const code = `
        export function testFunction() {
          return 42;
        }
      `;

      // Create temporary file
      const tempFile = '/tmp/test-code.ts';
      await Bun.write(tempFile, code);

      const result = await structure.analyzeFile(tempFile);

      expect(result.filePath).toBe(tempFile);
      expect(result.symbols.size).toBeGreaterThan(0);
      expect(result.imports.length).toBeGreaterThanOrEqual(0);
      expect(result.exports.length).toBeGreaterThan(0);

      // Clean up
      await Bun.file(tempFile).delete();
    });

    it('should track dependencies when enabled', async () => {
      const code = `
        import { something } from './other';
        function test() { return something; }
      `;

      const tempFile = '/tmp/test-deps.ts';
      await Bun.write(tempFile, code);

      const result = await structure.analyzeFile(tempFile, {
        trackDependencies: true,
      });

      const deps = structure.getDependencies(tempFile);
      expect(deps.length).toBeGreaterThan(0);

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('getSymbolsByType', () => {
    it('should return symbols of specified type', async () => {
      const code = `
        function testFunction() {
          return 42;
        }
      `;

      const tempFile = '/tmp/test-symbols.ts';
      await Bun.write(tempFile, code);

      await structure.analyzeFile(tempFile);
      const functions = structure.getSymbolsByType(tempFile, SymbolType.FUNCTION);

      expect(functions.length).toBeGreaterThan(0);
      expect(functions[0].type).toBe(SymbolType.FUNCTION);

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('getTopLevelSymbols', () => {
    it('should return top-level symbols', async () => {
      const code = `
        export function testFunction() {
          return 42;
        }
      `;

      const tempFile = '/tmp/test-toplevel.ts';
      await Bun.write(tempFile, code);

      await structure.analyzeFile(tempFile);
      const topLevel = structure.getTopLevelSymbols(tempFile);

      expect(topLevel.length).toBeGreaterThan(0);

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('getChildren', () => {
    it('should return children of a symbol', async () => {
      const code = `
        class TestClass {
          method() { return 1; }
        }
      `;

      const tempFile = '/tmp/test-children.ts';
      await Bun.write(tempFile, code);

      await structure.analyzeFile(tempFile);
      const classes = structure.getSymbolsByType(tempFile, SymbolType.CLASS);

      if (classes.length > 0) {
        const children = structure.getChildren(tempFile, classes[0].id);
        expect(Array.isArray(children)).toBe(true);
      }

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('findSymbol', () => {
    it('should find symbol by name across all files', async () => {
      const code = `
        export function testFunction() {
          return 42;
        }
      `;

      const tempFile = '/tmp/test-find.ts';
      await Bun.write(tempFile, code);

      await structure.analyzeFile(tempFile);
      const symbols = structure.findSymbol('testFunction');

      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols[0].name).toBe('testFunction');

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('cache', () => {
    it('should cache analysis results', async () => {
      const code = 'function test() { return 1; }';

      const tempFile = '/tmp/test-cache.ts';
      await Bun.write(tempFile, code);

      await structure.analyzeFile(tempFile);
      const result1 = structure.getStructure(tempFile);
      const result2 = structure.getStructure(tempFile);

      expect(result1).toBe(result2);

      // Clean up
      await Bun.file(tempFile).delete();
    });

    it('should clear cache', async () => {
      structure.clearCache();

      const stats = structure.getCacheStatistics();
      expect(stats.structures).toBe(0);
      expect(stats.dependencies).toBe(0);
    });
  });

  describe('global instance', () => {
    it('should return global instance', () => {
      const instance = getCodeStructure();
      expect(instance).toBeInstanceOf(CodeStructureUnderstanding);
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = getCodeStructure();
      const instance2 = getCodeStructure();
      expect(instance1).toBe(instance2);
    });
  });
});

describe('DependencyGraphQueries', () => {
  let graphQueries: DependencyGraphQueries;
  const logger = new Logger();

  beforeEach(() => {
    graphQueries = new DependencyGraphQueries({ logger });
  });

  afterEach(() => {
    graphQueries.clearGraphs();
  });

  describe('createGraph', () => {
    it('should create a new graph', () => {
      const graph = graphQueries.createGraph('test-graph');

      expect(graph.id).toBe('test-graph');
      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
    });

    it('should set active graph', () => {
      graphQueries.createGraph('test-graph');

      const active = graphQueries.getActiveGraph();
      expect(active?.id).toBe('test-graph');
    });
  });

  describe('addNode', () => {
    it('should add node to graph', () => {
      const graph = graphQueries.createGraph('test-graph');

      const node = graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test.ts',
        value: '/path/to/test.ts',
        metadata: {},
      });

      expect(node.id).toBe('node1');
      expect(graph.nodes.has('node1')).toBe(true);
    });

    it('should throw for non-existent graph', () => {
      expect(() => {
        graphQueries.addNode('non-existent', {
          id: 'node1',
          type: GraphNodeType.FILE,
          label: 'test',
          value: 'test',
          metadata: {},
        });
      }).toThrow('Graph not found');
    });
  });

  describe('addEdge', () => {
    it('should add edge to graph', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      const edge = graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      expect(edge.id).toBe('edge1');
      expect(graph.edges.has('edge1')).toBe(true);
      expect(graph.adjacency.get('node1')?.has('node2')).toBe(true);
    });
  });

  describe('buildGraph', () => {
    it('should build graph from dependencies', () => {
      const dependencies = [
        {
          id: 'dep1',
          sourcePath: '/path/to/file1.ts',
          target: '/path/to/file2.ts',
          type: 'import' as any,
          isExternal: false,
          line: 1,
          metadata: {},
        },
      ];

      const graph = graphQueries.buildGraph(dependencies, 'test-graph');

      expect(graph.nodes.size).toBe(2);
      expect(graph.edges.size).toBe(1);
    });
  });

  describe('getDependencies', () => {
    it('should get direct dependencies', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const deps = graphQueries.getDependencies('test-graph', 'node1', {
        transitive: false,
      });

      expect(deps).toContain('node2');
    });

    it('should get transitive dependencies', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node3',
        type: GraphNodeType.FILE,
        label: 'test3',
        value: 'test3',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge2',
        sourceId: 'node2',
        targetId: 'node3',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const deps = graphQueries.getDependencies('test-graph', 'node1', {
        transitive: true,
      });

      expect(deps).toContain('node2');
      expect(deps).toContain('node3');
    });
  });

  describe('getDependents', () => {
    it('should get direct dependents', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const dependents = graphQueries.getDependents('test-graph', 'node2', {
        transitive: false,
      });

      expect(dependents).toContain('node1');
    });
  });

  describe('findPath', () => {
    it('should find path between nodes', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const path = graphQueries.findPath('test-graph', 'node1', 'node2');

      expect(path).toBeDefined();
      expect(path?.nodes).toEqual(['node1', 'node2']);
    });

    it('should return undefined for no path', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      const path = graphQueries.findPath('test-graph', 'node1', 'node2');

      expect(path).toBeUndefined();
    });
  });

  describe('analyzeImpact', () => {
    it('should analyze impact of node changes', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const impact = graphQueries.analyzeImpact('test-graph', 'node2');

      expect(impact.sourceId).toBe('node2');
      expect(impact.directlyAffected).toContain('node1');
      expect(impact.impactScore).toBeGreaterThanOrEqual(0);
      expect(impact.impactScore).toBeLessThanOrEqual(1);
    });
  });

  describe('detectCycles', () => {
    it('should detect cycles in graph', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge2',
        sourceId: 'node2',
        targetId: 'node1',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const result = graphQueries.detectCycles('test-graph');

      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should not detect cycles in acyclic graph', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const result = graphQueries.detectCycles('test-graph');

      expect(result.hasCycles).toBe(false);
    });
  });

  describe('getTopologicalSort', () => {
    it('should return topological order', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const order = graphQueries.getTopologicalSort('test-graph');

      expect(order.length).toBe(2);
      expect(order.indexOf('node1')).toBeLessThan(order.indexOf('node2'));
    });
  });

  describe('getStatistics', () => {
    it('should return graph statistics', () => {
      const graph = graphQueries.createGraph('test-graph');

      graphQueries.addNode('test-graph', {
        id: 'node1',
        type: GraphNodeType.FILE,
        label: 'test1',
        value: 'test1',
        metadata: {},
      });

      graphQueries.addNode('test-graph', {
        id: 'node2',
        type: GraphNodeType.FILE,
        label: 'test2',
        value: 'test2',
        metadata: {},
      });

      graphQueries.addEdge('test-graph', {
        id: 'edge1',
        sourceId: 'node1',
        targetId: 'node2',
        type: GraphEdgeType.IMPORTS,
        weight: 1,
        metadata: {},
      });

      const stats = graphQueries.getStatistics('test-graph');

      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.avgDegree).toBe(0.5);
      expect(stats.maxDegree).toBe(1);
    });
  });

  describe('global instance', () => {
    it('should return global instance', () => {
      const instance = getDependencyGraphQueries();
      expect(instance).toBeInstanceOf(DependencyGraphQueries);
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = getDependencyGraphQueries();
      const instance2 = getDependencyGraphQueries();
      expect(instance1).toBe(instance2);
    });
  });
});

describe('SmartContextStuffing', () => {
  let contextStuffing: SmartContextStuffing;
  const logger = new Logger();

  beforeEach(() => {
    contextStuffing = new SmartContextStuffing({ logger });
  });

  afterEach(() => {
    contextStuffing.clearCache();
  });

  describe('stuffContext', () => {
    it('should stuff context for a file', async () => {
      const code = `
        export function testFunction() {
          return 42;
        }
      `;

      const tempFile = '/tmp/test-context.ts';
      await Bun.write(tempFile, code);

      const result = await contextStuffing.stuffContext(tempFile, {
        maxTokens: 10000,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeLessThanOrEqual(10000);
      expect(result.strategy).toBe(StuffingStrategy.HYBRID);
      expect(result.coverageScore).toBeGreaterThanOrEqual(0);
      expect(result.coverageScore).toBeLessThanOrEqual(1);

      // Clean up
      await Bun.file(tempFile).delete();
    });

    it('should use relevance strategy', async () => {
      const code = 'export function test() { return 1; }';

      const tempFile = '/tmp/test-relevance.ts';
      await Bun.write(tempFile, code);

      const result = await contextStuffing.stuffContext(tempFile, {
        strategy: StuffingStrategy.RELEVANCE,
      });

      expect(result.strategy).toBe(StuffingStrategy.RELEVANCE);

      // Clean up
      await Bun.file(tempFile).delete();
    });

    it('should use dependency strategy', async () => {
      const code = 'export function test() { return 1; }';

      const tempFile = '/tmp/test-dependency.ts';
      await Bun.write(tempFile, code);

      const result = await contextStuffing.stuffContext(tempFile, {
        strategy: StuffingStrategy.DEPENDENCY,
      });

      expect(result.strategy).toBe(StuffingStrategy.DEPENDENCY);

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate relevance score for context item', async () => {
      const code = 'export function test() { return 1; }';

      const tempFile = '/tmp/test-score.ts';
      await Bun.write(tempFile, code);

      const structure = await contextStuffing['structure'].analyzeFile(tempFile);

      const item = {
        id: 'test-item',
        type: ContextItemType.FUNCTION,
        filePath: tempFile,
        content: 'function test() { return 1; }',
        startLine: 1,
        endLine: 1,
        relevanceScore: 0,
        priority: ContextPriority.HIGH,
        dependencies: [],
        tokens: 10,
        metadata: {},
      };

      const score = contextStuffing.calculateRelevanceScore(item, structure);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);

      // Clean up
      await Bun.file(tempFile).delete();
    });
  });

  describe('updateRelevanceFactors', () => {
    it('should update relevance factors', () => {
      const newFactors = {
        directDependency: 0.5,
        indirectDependency: 0.3,
      };

      contextStuffing.updateRelevanceFactors(newFactors);

      const factors = contextStuffing.getRelevanceFactors();

      expect(factors.directDependency).toBe(0.5);
      expect(factors.indirectDependency).toBe(0.3);
    });
  });

  describe('global instance', () => {
    it('should return global instance', () => {
      const instance = getSmartContextStuffing();
      expect(instance).toBeInstanceOf(SmartContextStuffing);
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = getSmartContextStuffing();
      const instance2 = getSmartContextStuffing();
      expect(instance1).toBe(instance2);
    });
  });
});
