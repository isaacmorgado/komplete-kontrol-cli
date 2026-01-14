import type { CommandContext, CommandResult } from '../types';
import { existsSync, readFileSync } from 'fs';
import chalk from 'chalk';

export interface ReOptions {
  target?: string;
  action?: 'extract' | 'analyze' | 'deobfuscate';
}

export class ReCommand {
  name = 're';

  async execute(context: CommandContext, options: ReOptions): Promise<CommandResult> {
    try {
      const action = options.action || 'analyze';
      const target = options.target;

      if (!target) {
        return {
          success: false,
          message: 'Target required. Use: /re [target-type] [path/url]'
        };
      }

      console.log(chalk.bold('\n=== Reverse Engineering Mode ==='));
      console.log(chalk.cyan(`Target: ${target}`));
      console.log(chalk.cyan(`Action: ${action}\n`));

      switch (action) {
        case 'extract':
          return this.extractTarget(context, target);
        case 'analyze':
          return this.analyzeTarget(context, target);
        case 'deobfuscate':
          return this.deobfuscateTarget(context, target);
        default:
          return {
            success: false,
            message: `Unknown action: ${action}. Use: extract, analyze, deobfuscate`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Reverse engineering command failed'
      };
    }
  }

  private extractTarget(context: CommandContext, target: string): CommandResult {
    console.log(chalk.yellow('Step 1: Determining target type...'));

    // Chrome Extension
    if (target.endsWith('.crx')) {
      console.log(chalk.green('Detected: Chrome Extension'));
      console.log(chalk.gray('\nInstructions:'));
      console.log(chalk.gray('1. Extract CRX file (rename to .zip and unzip)'));
      console.log(chalk.gray('2. Read manifest.json'));
      console.log(chalk.gray('3. Analyze background scripts and content scripts\n'));
      return {
        success: true,
        message: 'Chrome extension detected. Extract and analyze manually.'
      };
    }

    // Electron App
    if (target.endsWith('.app')) {
      console.log(chalk.green('Detected: Electron App'));
      console.log(chalk.gray('\nInstructions:'));
      console.log(chalk.gray('1. Install: npm install -g @electron/asar'));
      console.log(chalk.gray('2. Navigate to: AppName.app/Contents/Resources'));
      console.log(chalk.gray('3. Extract: asar extract app.asar ./output'));
      console.log(chalk.gray('4. Read package.json and main entry files\n'));
      return {
        success: true,
        message: 'Electron app detected. Extract and analyze manually.'
      };
    }

    // JavaScript file
    if (target.endsWith('.js')) {
      console.log(chalk.green('Detected: JavaScript file'));
      console.log(chalk.gray('\nInstructions:'));
      console.log(chalk.gray('1. Beautify: js-beautify -f input.js -o output.js'));
      console.log(chalk.gray('2. Or use: https://deobfuscate.io/'));
      console.log(chalk.gray('3. Or use: https://beautifier.io/\n'));
      return {
        success: true,
        message: 'JavaScript file detected. Use beautification tools.'
      };
    }

    // URL
    if (target.startsWith('http://') || target.startsWith('https://')) {
      console.log(chalk.green('Detected: URL'));
      console.log(chalk.gray('\nInstructions:'));
      console.log(chalk.gray('1. Use /research-api for web API research'));
      console.log(chalk.gray('2. Use /re for mobile app analysis\n'));
      return {
        success: true,
        message: 'URL detected. Use /research-api for API analysis.'
      };
    }

    // macOS App
    if (target.endsWith('.app')) {
      console.log(chalk.green('Detected: macOS Application'));
      console.log(chalk.gray('\nInstructions:'));
      console.log(chalk.gray('1. Right-click → Show Package Contents'));
      console.log(chalk.gray('2. Or: cd /Applications/AppName.app/Contents'));
      console.log(chalk.gray('3. Check: Resources, Frameworks directories\n'));
      return {
        success: true,
        message: 'macOS app detected. Explore bundle structure.'
      };
    }

    console.log(chalk.yellow('Unknown target type. Manual analysis required.\n'));

    return {
      success: true,
      message: 'Target type unknown. Analyze manually.'
    };
  }

  private analyzeTarget(context: CommandContext, target: string): CommandResult {
    console.log(chalk.yellow('Step 1: Reading target file...'));

    if (!existsSync(target)) {
      return {
        success: false,
        message: `Target not found: ${target}`
      };
    }

    const content = readFileSync(target, 'utf-8');
    const ext = target.split('.').pop();

    console.log(chalk.yellow('Step 2: Analyzing structure...'));

    if (ext === 'json') {
      try {
        const json = JSON.parse(content);
        console.log(chalk.green('Valid JSON detected'));
        console.log(chalk.gray('\nStructure:'));
        console.log(chalk.gray(JSON.stringify(json, null, 2)));
      } catch (e) {
        console.log(chalk.red('Invalid JSON'));
      }
    }

    if (ext === 'js') {
      console.log(chalk.green('JavaScript detected'));
      console.log(chalk.gray('\nLines: ' + content.split('\n').length));
      console.log(chalk.gray('Characters: ' + content.length));
      console.log(chalk.gray('\nRecommendations:'));
      console.log(chalk.gray('- Use js-beautify to format'));
      console.log(chalk.gray('- Check for minification patterns'));
    }

    if (ext === 'md') {
      console.log(chalk.green('Markdown detected'));
      console.log(chalk.gray('\nLines: ' + content.split('\n').length));
      console.log(chalk.gray('Headings: ' + (content.match(/^#+\s/g) || []).length));
    }

    console.log(chalk.gray('\nAnalysis complete.\n'));

    return {
      success: true,
      message: 'Analysis complete'
    };
  }

  private deobfuscateTarget(context: CommandContext, target: string): CommandResult {
    console.log(chalk.yellow('Step 1: Checking for obfuscation...'));

    if (!existsSync(target)) {
      return {
        success: false,
        message: `Target not found: ${target}`
      };
    }

    const content = readFileSync(target, 'utf-8');
    const lines = content.split('\n');

    // Check for minification indicators
    const isMinified = lines.length === 1 && content.length > 1000 && !content.includes('\n');
    const hasShortNames = /^[a-z0-9_$]{1,2}\b/.test(content);
    const isObfuscated = isMinified || hasShortNames;

    if (!isObfuscated) {
      console.log(chalk.green('No obfuscation detected'));
      console.log(chalk.gray('\nFile appears to be already readable.\n'));
      return {
        success: true,
        message: 'No obfuscation detected'
      };
    }

    console.log(chalk.yellow('Obfuscation detected'));
    console.log(chalk.gray('\nRecommendations:'));
    console.log(chalk.gray('1. Use js-beautify: npm install -g js-beautify'));
    console.log(chalk.gray('2. Use online tools:'));
    console.log(chalk.gray('   - https://deobfuscate.io/'));
    console.log(chalk.gray('   - https://beautifier.io/'));
    console.log(chalk.gray('3. Use AST Explorer: https://astexplorer.net/\n'));

    console.log(chalk.cyan('\nManual deobfuscation required.\n'));

    return {
      success: true,
      message: 'Obfuscation detected. Use beautification tools.'
    };
  }
}
