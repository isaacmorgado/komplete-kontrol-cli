/**
 * Main App Component
 * Bubbletea-inspired TUI application entry point using Ink
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, render } from 'ink';
import { AppMsg, AppState } from './types';
import { StatusBar } from './components/StatusBar';
import { OutputPanel } from './components/OutputPanel';
import { ProgressIndicator } from './components/ProgressIndicator';
import { Spinner } from './components/Spinner';
import { theme } from './styles/theme';
import { sharedCore } from '../core/shared/SharedCore';

interface AppProps {
  command?: string;
  args?: string[];
}

export const App: React.FC<AppProps> = ({ command, args = [] }) => {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    messages: [],
    progress: 0,
    theme: theme.getMode(),
    tokensUsed: 0,
    cost: 0,
    streaming: false,
  });

  const [inputValue, setInputValue] = useState('');
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Initialize shared core
    sharedCore.initialize().catch(error => {
      console.error('Failed to initialize shared core:', error);
    });

    return () => {
      sharedCore.cleanup();
    };
  }, []);

  const handleInput = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      setState(prev => ({
        ...prev,
        status: 'running',
        messages: [
          ...prev.messages,
          {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: new Date(),
          },
        ],
      }));
      setInputValue('');
      
      // Execute command (will be implemented with command router)
      executeCommand(inputValue);
    }
  }, [inputValue]);

  const executeCommand = async (cmd: string): Promise<void> => {
    try {
      setShowSpinner(true);
      setState(prev => ({ ...prev, streaming: true }));
      
      // Simulate command execution (will be replaced with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: Date.now().toString(),
            type: 'assistant',
            content: `Executed: ${cmd}`,
            timestamp: new Date(),
          },
        ],
        status: 'complete',
        streaming: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        messages: [
          ...prev.messages,
          {
            id: Date.now().toString(),
            type: 'error',
            content: `Error: ${(error as Error).message}`,
            timestamp: new Date(),
          },
        ],
      }));
    } finally {
      setShowSpinner(false);
    }
  };

  const handleQuit = useCallback(() => {
    setState(prev => ({ ...prev, status: 'idle' }));
    process.exit(0);
  }, []);

  const handleThemeToggle = useCallback(() => {
    theme.toggleTheme();
    setState(prev => ({ ...prev, theme: theme.getMode() }));
  }, []);

  const handleKey = useCallback((key: string) => {
    if (key === 'q' || key === 'escape') {
      handleQuit();
    } else if (key === 't') {
      handleThemeToggle();
    }
  }, [handleQuit, handleThemeToggle]);

  useEffect(() => {
    const handleKeyPress = (data: Buffer) => {
      const key = data.toString();
      handleKey(key);
    };

    process.stdin.setRawMode(true);
    process.stdin.on('data', handleKeyPress);

    return () => {
      process.stdin.setRawMode(false);
      process.stdin.off('data', handleKeyPress);
    };
  }, [handleKey]);

  const modelInfo = {
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
  };

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        model={modelInfo}
        tokensUsed={state.tokensUsed}
        cost={state.cost}
        status={state.status}
        streaming={state.streaming}
      />
      
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <OutputPanel
          messages={state.messages}
          autoScroll={true}
          syntaxHighlight={true}
        />
        
        {showSpinner && (
          <Spinner
            message="Processing..."
            style="dots"
            color="yellow"
          />
        )}
        
        {state.progress > 0 && (
          <ProgressIndicator
            progress={state.progress}
            message="Processing..."
            showPercentage={true}
            style="bar"
          />
        )}
        
        <Box marginTop={1}>
          <Text color="gray">
            Press <Text color="cyan">[T]</Text> to toggle theme, <Text color="red">[Q]</Text> to quit
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

App.displayName = 'App';

// Main entry point
export const runTUI = (command?: string, args?: string[]): void => {
  render(<App command={command} args={args} />);
};
