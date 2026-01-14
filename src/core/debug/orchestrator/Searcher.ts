/**
 * Bug Solution Searcher
 * Source: /auto hooks/debug-orchestrator.sh (lines 245-260)
 *
 * Searches for similar bugs and solutions
 * Integrates with GitHub MCP for external solutions
 */

export interface GitHubIssue {
  title: string;
  url: string;
  state?: string;
  labels?: string[];
}

export interface GitHubSearchResult {
  available: boolean;
  mcpAvailable?: boolean;
  issues?: GitHubIssue[];
  note?: string;
}

export interface SearchContext {
  bugDescription: string;
  bugType: string;
  similarFixesFromMemory: any;
  githubSolutions: GitHubSearchResult;
}

/**
 * Search for bug solutions from multiple sources
 */
export class Searcher {
  private githubMcpAvailable: boolean;

  constructor(githubMcpAvailable: boolean = false) {
    this.githubMcpAvailable = githubMcpAvailable;
  }

  /**
   * Search GitHub for similar issues
   * Integrates with GitHub MCP if available
   */
  async searchGitHub(_bugDescription: string, _limit: number = 3): Promise<GitHubSearchResult> {
    if (this.githubMcpAvailable) {
      // GitHub MCP is available - signal to use mcp__grep__searchGitHub
      return {
        available: true,
        mcpAvailable: true,
        note: 'Use mcp__grep__searchGitHub for searching similar issues'
      };
    }

    // No GitHub search available
    return {
      available: false
    };
  }

  /**
   * Build search query for GitHub
   */
  buildGitHubQuery(bugDescription: string, bugType: string): string {
    // Extract key terms from bug description
    const keywords = this.extractKeywords(bugDescription);

    // Combine with bug type for better results
    const query = [...keywords, bugType].filter(Boolean).join(' ');

    return query;
  }

  /**
   * Extract keywords from bug description
   */
  private extractKeywords(text: string): string[] {
    // Remove common words, extract meaningful terms
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !this.isCommonWord(word))
      .slice(0, 5); // Limit to top 5 keywords
  }

  /**
   * Check if word is too common for search
   */
  private isCommonWord(word: string): boolean {
    const common = new Set([
      'the',
      'and',
      'for',
      'that',
      'this',
      'with',
      'from',
      'have',
      'been',
      'error',
      'issue',
      'problem',
      'help',
      'need'
    ]);
    return common.has(word);
  }

  /**
   * Search codebase for similar error patterns
   * Uses Grep tool for fast search
   */
  async searchCodebase(_errorPattern: string, _fileGlob?: string): Promise<string[]> {
    // Placeholder - LLM integration will use Grep tool
    // Pattern: Search for similar error handling or patterns in code
    return [];
  }

  /**
   * Build comprehensive search context
   */
  async buildSearchContext(
    bugDescription: string,
    bugType: string,
    similarFixesFromMemory: any
  ): Promise<SearchContext> {
    const githubSolutions = await this.searchGitHub(bugDescription);

    return {
      bugDescription,
      bugType,
      similarFixesFromMemory,
      githubSolutions
    };
  }

  /**
   * Generate search recommendations
   */
  generateSearchRecommendations(bugType: string, keywords: string[]): string[] {
    const recommendations: string[] = [];

    // Type-specific recommendations
    if (bugType === 'test_failure') {
      recommendations.push('Search for test framework-specific issues');
      recommendations.push('Look for async test patterns');
    } else if (bugType === 'type_error') {
      recommendations.push('Search for TypeScript type definitions');
      recommendations.push('Check for interface mismatches');
    } else if (bugType === 'runtime_error') {
      recommendations.push('Search for error stack traces');
      recommendations.push('Check for null/undefined handling');
    }

    // Keyword-based recommendations
    if (keywords.includes('async') || keywords.includes('promise')) {
      recommendations.push('Review async/await patterns');
    }
    if (keywords.includes('import') || keywords.includes('module')) {
      recommendations.push('Check module resolution');
    }

    return recommendations;
  }
}
