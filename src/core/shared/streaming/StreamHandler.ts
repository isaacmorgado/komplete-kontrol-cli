/**
 * StreamHandler
 * Manages token-by-token streaming with progress tracking
 */

/**
 * Stream Callback
 */
export interface StreamCallback {
  onToken?: (token: string) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Stream Options
 */
export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Stream State
 */
export interface StreamState {
  status: 'idle' | 'streaming' | 'paused' | 'completed' | 'error';
  currentToken: number;
  totalTokens: number;
  accumulatedContent: string;
}

/**
 * StreamHandler class
 * Handles token-by-token streaming from LLM providers
 */
export class StreamHandler {
  private streams: Map<string, AsyncIterable<LLMStreamChunk>> = new Map();
  private activeStreamId: string | null = null;

  /**
   * Start a new stream
   */
  async startStream(
    streamId: string,
    generator: AsyncIterable<LLMStreamChunk>,
    options: StreamOptions,
  ): Promise<void> {
    const state: StreamState = {
      status: 'streaming',
      currentToken: 0,
      totalTokens: 0,
      accumulatedContent: '',
    };

    this.streams.set(streamId, generator);
    this.activeStreamId = streamId;

    try {
      for await (const chunk of generator) {
        state.accumulatedContent += chunk.content;
        state.currentToken++;
        state.totalTokens = chunk.tokens || state.totalTokens;

        // Call callbacks
        if (options.onToken) {
          options.onToken(chunk.content);
        }
        if (options.onProgress) {
          options.onProgress(state.currentToken, state.totalTokens);
        }
        if (chunk.done) {
          state.status = 'completed';
          if (options.onComplete) {
            options.onComplete(state.accumulatedContent);
          }
          this.endStream(streamId);
          return;
        }
      }
    } catch (error) {
      state.status = 'error';
      if (options.onError) {
        const err = error instanceof Error ? error : new Error(String(error));
        options.onError(err);
      }
      this.endStream(streamId);
    }
  }

  /**
   * Pause a stream
   */
  pauseStream(streamId: string): void {
    if (this.activeStreamId === streamId) {
      const stream = this.streams.get(streamId);
      if (stream) {
        // For now, streams are generators and can't be paused
        console.warn(`Stream ${streamId} cannot be paused`);
      }
    }
  }

  /**
   * Resume a stream
   */
  resumeStream(streamId: string): void {
    if (this.activeStreamId === streamId) {
      const stream = this.streams.get(streamId);
      if (stream) {
        console.warn(`Stream ${streamId} cannot be resumed`);
      }
    }
  }

  /**
   * Cancel a stream
   */
  cancelStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      this.streams.delete(streamId);
      if (this.activeStreamId === streamId) {
        this.activeStreamId = null;
      }
    }
  }

  /**
   * End a stream
   */
  private endStream(streamId: string): void {
    this.streams.delete(streamId);
    if (this.activeStreamId === streamId) {
      this.activeStreamId = null;
    }
  }

  /**
   * Get stream state
   */
  getStreamState(streamId: string): StreamState | null {
    const stream = this.streams.get(streamId);
    if (!stream) return null;

    return {
      status: 'idle',
      currentToken: 0,
      totalTokens: 0,
      accumulatedContent: '',
    };
  }

  /**
   * Get active stream ID
   */
  getActiveStreamId(): string | null {
    return this.activeStreamId;
  }

  /**
   * Get all stream IDs
   */
  getAllStreamIds(): string[] {
    return Array.from(this.streams.keys());
  }

  /**
   * Cleanup all streams
   */
  cleanup(): void {
    for (const streamId of this.streams.keys()) {
      this.cancelStream(streamId);
    }
    this.streams.clear();
  }
}

/**
 * LLM Stream Chunk (for internal use)
 */
export interface LLMStreamChunk {
  content: string;
  done: boolean;
  tokens?: number;
}

/**
 * Create StreamHandler instance
 */
export function createStreamHandler(): StreamHandler {
  return new StreamHandler();
}
