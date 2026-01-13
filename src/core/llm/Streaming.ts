/**
 * Streaming utilities for LLM responses
 *
 * Provides stream handlers and utilities for real-time responses
 */

import type { StreamEvent, StreamHandler, ContentBlock } from './types';

/**
 * Accumulated streaming response
 */
export interface StreamAccumulator {
  content: ContentBlock[];
  currentIndex: number;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stopReason?: string;
}

/**
 * Create a stream accumulator
 */
export function createStreamAccumulator(): StreamAccumulator {
  return {
    content: [],
    currentIndex: 0,
    usage: {
      input_tokens: 0,
      output_tokens: 0
    }
  };
}

/**
 * Update accumulator with stream event
 */
export function updateAccumulator(acc: StreamAccumulator, event: StreamEvent): void {
  if (event.type === 'message_start') {
    if (event.message.usage) {
      acc.usage.input_tokens = event.message.usage.input_tokens || 0;
      acc.usage.output_tokens = event.message.usage.output_tokens || 0;
    }
  } else if (event.type === 'content_block_start') {
    acc.content[event.index] = event.content_block;
    acc.currentIndex = event.index;
  } else if (event.type === 'content_block_delta') {
    const block = acc.content[event.index];
    if (block && block.type === 'text' && event.delta.type === 'text_delta') {
      block.text = (block.text || '') + (event.delta.text || '');
    }
  } else if (event.type === 'message_delta') {
    if (event.delta.stop_reason) {
      acc.stopReason = event.delta.stop_reason;
    }
    if (event.usage) {
      acc.usage.output_tokens = event.usage.output_tokens || acc.usage.output_tokens;
    }
  }
}

/**
 * Create a console logging stream handler
 */
export function createConsoleHandler(): StreamHandler {
  return (event: StreamEvent) => {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text || '');
    } else if (event.type === 'message_stop') {
      process.stdout.write('\n');
    } else if (event.type === 'error') {
      console.error('\nError:', event.error.message);
    }
  };
}

/**
 * Create a callback-based stream handler
 */
export function createCallbackHandler(
  onText?: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: any) => void
): StreamHandler {
  return (event: StreamEvent) => {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onText?.(event.delta.text || '');
    } else if (event.type === 'message_stop') {
      onComplete?.();
    } else if (event.type === 'error') {
      onError?.(event.error);
    }
  };
}

/**
 * Create a buffered stream handler
 * Accumulates text and calls callback periodically
 */
export function createBufferedHandler(
  callback: (text: string) => void,
  bufferSize: number = 10
): StreamHandler {
  let buffer = '';
  let tokenCount = 0;

  return (event: StreamEvent) => {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      buffer += event.delta.text || '';
      tokenCount++;

      if (tokenCount >= bufferSize) {
        callback(buffer);
        buffer = '';
        tokenCount = 0;
      }
    } else if (event.type === 'message_stop') {
      if (buffer.length > 0) {
        callback(buffer);
      }
    }
  };
}

/**
 * Combine multiple stream handlers
 */
export function combineHandlers(...handlers: StreamHandler[]): StreamHandler {
  return async (event: StreamEvent) => {
    for (const handler of handlers) {
      await handler(event);
    }
  };
}

/**
 * Extract full text from accumulated content
 */
export function extractText(content: ContentBlock[]): string {
  return content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('\n');
}
