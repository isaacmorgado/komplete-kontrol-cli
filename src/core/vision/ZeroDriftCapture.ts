/**
 * Zero-Drift Capture Module
 * Reliable screenshot capture with drift detection using Playwright
 * Based on Playwright best practices from playwright.dev
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  ScreenshotCapture,
  VisionCaptureOptions,
  CaptureResult,
  DriftDetection,
  DOMExtraction,
  DOMElement
} from './types';

export class ZeroDriftCapture {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private baselines: Map<string, ScreenshotCapture> = new Map();

  /**
   * Initialize browser instance
   */
  async initialize(headless: boolean = true): Promise<void> {
    this.browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
  }

  /**
   * Capture screenshot with zero drift
   * Uses Playwright's reliable capture methods
   */
  async capture(options: VisionCaptureOptions): Promise<CaptureResult> {
    const errors: string[] = [];

    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = this.page!;

      // Navigate to URL with proper wait conditions
      await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 30000
      });

      // Wait for page stability
      await this.waitForStability(page);

      // Capture screenshot
      const screenshot = await this.takeScreenshot(page, options);

      // Extract DOM if requested
      let dom: DOMExtraction | undefined;
      if (options.extractDOM) {
        dom = await this.extractDOM(page, options.url, options.accessibilityCheck);
      }

      // Calculate quality score
      const quality = await this.calculateQuality(screenshot, dom);

      return {
        screenshot,
        dom,
        quality,
        errors
      };

    } catch (error) {
      errors.push(`Capture failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Screenshot capture failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Take screenshot using Playwright's optimized capture
   */
  private async takeScreenshot(
    page: Page,
    options: VisionCaptureOptions
  ): Promise<ScreenshotCapture> {
    const timestamp = new Date();
    const format = options.format || 'png';
    const quality = options.quality || 90;

    const screenshot = await page.screenshot({
      type: format as 'png' | 'jpeg',
      quality: format === 'jpeg' ? quality : undefined,
      fullPage: options.fullPage !== false,
      clip: options.clip
    });

    // Generate hash for drift detection
    const hash = crypto.createHash('sha256').update(screenshot).digest('hex');

    const capture: ScreenshotCapture = {
      id: `capture-${timestamp.getTime()}`,
      url: options.url,
      timestamp,
      hash,
      path: this.getStoragePath(options.url, timestamp, format),
      width: await page.evaluate(() => (globalThis as any).innerWidth),
      height: await page.evaluate(() => (globalThis as any).innerHeight),
      format,
      quality
    };

    // Save screenshot to disk
    await fs.mkdir(path.dirname(capture.path), { recursive: true });
    await fs.writeFile(capture.path, screenshot);

    return capture;
  }

  /**
   * Extract DOM structure with quality scoring
   */
  private async extractDOM(
    page: Page,
    url: string,
    accessibilityCheck: boolean = true
  ): Promise<DOMExtraction> {
    // Inject script to extract DOM - returns serializable plain objects
    const extractionData = await page.evaluate((checkAccessibility) => {
      // Cast to any to access browser globals
      const win = (globalThis as any);
      const doc = (globalThis as any).document;
      const nodeFilter = (globalThis as any).NodeFilter;
      
      // Type definitions for browser context
      interface SimpleElement {
        id: string;
        tag: string;
        text: string;
        attributes: Record<string, string>;
        visible: boolean;
        accessible: boolean;
        interactionScore: number;
        contentScore: number;
        position: {
          x: number;
          y: number;
          width: number;
          height: number;
        };
      }

      const extractElement = (element: any): SimpleElement | null => {
        // Skip invisible elements
        const style = win.getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          return null;
        }

        // Get element data
        const rect = element.getBoundingClientRect();
        const id = `el-${Math.random().toString(36).substr(2, 9)}`;
        const tag = element.tagName.toLowerCase();

        // Calculate scores
        const text = element.textContent?.trim() || '';
        const interactionScore = calculateInteractionScore(element);
        const contentScore = calculateContentScore(element, text);

        // Check accessibility
        let accessible = true;
        if (checkAccessibility) {
          accessible = isAccessible(element);
        }

        return {
          id,
          tag,
          text: text.substring(0, 200), // Limit text length
          attributes: getRelevantAttributes(element),
          visible: style.display !== 'none',
          accessible,
          interactionScore,
          contentScore,
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
      };

      const calculateInteractionScore = (element: any): number => {
        const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
        const hasClickHandler = element.hasAttribute('onclick');
        const isInteractive = interactiveTags.includes(element.tagName.toLowerCase());
        const hasTabIndex = element.hasAttribute('tabindex');

        let score = 0;
        if (isInteractive) score += 3;
        if (hasClickHandler) score += 2;
        if (hasTabIndex) score += 1;

        return Math.min(score, 5);
      };

      const calculateContentScore = (element: any, text: string): number => {
        if (text.length > 50) return 5;
        if (text.length > 20) return 4;
        if (text.length > 10) return 3;
        if (text.length > 0) return 2;
        return 0;
      };

      const getRelevantAttributes = (element: any): Record<string, string> => {
        const relevant = ['id', 'class', 'role', 'aria-label', 'type', 'name', 'href'];
        const result: Record<string, string> = {};

        relevant.forEach(attr => {
          const value = element.getAttribute(attr);
          if (value) result[attr] = value;
        });

        return result;
      };

      const isAccessible = (element: any): boolean => {
        // Basic accessibility check
        if (element.hasAttribute('aria-hidden') && element.getAttribute('aria-hidden') === 'true') {
          return false;
        }

        const style = win.getComputedStyle(element);
        if (style.visibility === 'hidden') {
          return false;
        }

        return true;
      };

      // Walk the DOM tree
      const allElements: SimpleElement[] = [];
      const walker = doc.createTreeWalker(
        doc.body,
        nodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (_node: any) => {
            return nodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node = walker.nextNode();
      while (node) {
        const element = extractElement(node);
        if (element) {
          allElements.push(element);
        }
        node = walker.nextNode();
      }

      // Calculate metadata
      const visible = allElements.filter(e => e.visible).length;
      const accessible = allElements.filter(e => e.accessible).length;
      const interactive = allElements.filter(e => e.interactionScore > 0).length;

      const totalElements = allElements.length || 1; // Prevent division by zero
      const metadata = {
        totalElements: allElements.length,
        visibleElements: visible,
        accessibleElements: accessible,
        interactiveElements: interactive,
        score: Math.round((visible + accessible + interactive) / totalElements * 100)
      };

      return {
        url: win.location.href,
        timestamp: new Date().toISOString(),
        elements: allElements.slice(0, 500), // Limit to 500 elements
        metadata
      };
    }, accessibilityCheck);

    // Convert to proper types and generate hash
    const elements: DOMElement[] = extractionData.elements as DOMElement[];
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(elements))
      .digest('hex');

    return {
      url: extractionData.url,
      timestamp: new Date(extractionData.timestamp),
      hash,
      elements,
      metadata: extractionData.metadata
    };
  }

  /**
   * Calculate quality score for screenshot
   */
  private async calculateQuality(
    screenshot: ScreenshotCapture,
    dom?: DOMExtraction
  ): Promise<{
    clarity: number;
    completeness: number;
    missingElements: string[];
    overall: number;
    timestamp: Date;
  }> {
    // Simulate quality assessment (in production, use actual image analysis)
    const clarity = Math.min(90 + Math.random() * 10, 100);
    const completeness = dom ? Math.min(dom.metadata.score, 100) : 80;
    const missingElements: string[] = [];

    // Check for common missing elements
    if (dom && dom.elements && dom.elements.length > 0) {
      const hasNavigation = dom.elements.some(e => e.tag === 'nav');
      const hasHeader = dom.elements.some(e => e.tag === 'header');
      const hasFooter = dom.elements.some(e => e.tag === 'footer');

      if (!hasNavigation) missingElements.push('navigation');
      if (!hasHeader) missingElements.push('header');
      if (!hasFooter) missingElements.push('footer');
    }

    const overall = (clarity + completeness) / 2 - (missingElements.length * 5);

    return {
      clarity: Math.round(clarity),
      completeness: Math.round(completeness),
      missingElements,
      overall: Math.round(Math.max(0, overall)),
      timestamp: new Date()
    };
  }

  /**
   * Detect drift between baseline and current capture
   */
  async detectDrift(baselineId: string, currentCapture: ScreenshotCapture): Promise<DriftDetection> {
    const baseline = this.baselines.get(baselineId);

    if (!baseline) {
      throw new Error(`Baseline ${baselineId} not found`);
    }

    const driftDetected = baseline.hash !== currentCapture.hash;
    const driftScore = driftDetected ? 1 : 0;

    return {
      baselineHash: baseline.hash,
      currentHash: currentCapture.hash,
      driftDetected,
      driftScore,
      timestamp: new Date(),
      changes: driftDetected ? {
        added: [],
        removed: [],
        modified: []
      } : undefined
    };
  }

  /**
   * Set baseline capture for drift detection
   */
  async setBaseline(id: string, capture: ScreenshotCapture): Promise<void> {
    this.baselines.set(id, capture);
  }

  /**
   * Wait for page stability (animations, loading, etc.)
   */
  private async waitForStability(page: Page): Promise<void> {
    // Wait for images to load
    await page.waitForFunction(() => {
      const doc = (globalThis as any).document;
      const images = Array.from(doc.images);
      return images.every((img: any) => img.complete);
    }, { timeout: 5000 }).catch(() => {}); // Ignore timeout

    // Small delay for any remaining animations
    await page.waitForTimeout(500);
  }

  /**
   * Get storage path for screenshots
   */
  private getStoragePath(url: string, timestamp: Date, format: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toISOString().split('T')[1].split('.')[0];
    return path.join(
      process.cwd(),
      '.screenshots',
      dateStr,
      `${hash}-${timeStr}.${format}`
    );
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

export default ZeroDriftCapture;
