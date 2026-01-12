/**
 * KOMPLETE-KONTROL CLI Entry Point
 * 
 * The ultimate agentic coding CLI tool with AI intelligence,
 * reverse engineering, and multi-agent capabilities.
 */

import { runCLI } from './dist/index.js';

// Run the CLI
runCLI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
