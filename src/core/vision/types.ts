/**
 * Vision Capture & DOM Extraction Types
 * Defines types for zero-drift capture, DOM extraction, and vision integration
 */

export interface ScreenshotCapture {
  id: string;
  url: string;
  timestamp: Date;
  hash: string;
  path: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
}

export interface DOMElement {
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

export interface DOMExtraction {
  url: string;
  timestamp: Date;
  hash: string;
  elements: DOMElement[];
  metadata: {
    totalElements: number;
    visibleElements: number;
    accessibleElements: number;
    interactiveElements: number;
    score: number;
  };
}

export interface VisionCaptureOptions {
  url: string;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  extractDOM?: boolean;
  accessibilityCheck?: boolean;
}

export interface QualityScore {
  clarity: number;
  completeness: number;
  missingElements: string[];
  overall: number;
  timestamp: Date;
}

export interface CaptureResult {
  screenshot: ScreenshotCapture;
  dom?: DOMExtraction;
  quality?: QualityScore;
  errors: string[];
}

export interface DriftDetection {
  baselineHash: string;
  currentHash: string;
  driftDetected: boolean;
  driftScore: number;
  timestamp: Date;
  changes?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

export interface VisionModelInput {
  imageData: Buffer;
  domStructure: DOMElement[];
  url: string;
  timestamp: Date;
}
