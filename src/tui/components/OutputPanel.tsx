/**
 * OutputPanel Component
 * Displays streaming output, messages, and tool execution results
 */

import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { OutputPanelProps, OutputMessage } from '../types';

export const OutputPanel: React.FC<OutputPanelProps> = ({
  messages,
  maxHeight = 100,
  autoScroll = true,
  syntaxHighlight = true,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getMessageIcon = (type: OutputMessage['type']): string => {
    const icons = {
      user: '>',
      assistant: '●',
      system: 'ℹ',
      tool: '⚙',
      error: '✗',
    };
    return icons[type];
  };

  const getMessageColor = (type: OutputMessage['type']): string => {
    const colors = {
      user: 'blue',
      assistant: 'green',
      system: 'gray',
      tool: 'yellow',
      error: 'red',
    };
    return colors[type];
  };

  const highlightCode = (text: string): string => {
    if (!syntaxHighlight) return text;
    
    // Simple code block highlighting
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, langParam, code) => {
      const lang = langParam || 'text';
      return `<Text color="cyan">┌── ${lang.toUpperCase()} ──┐</Text>\n${code}\n<Text color="cyan">└──────────────┘</Text>`;
    });
  };

  const renderMessage = (msg: OutputMessage): React.ReactElement => {
    const icon = getMessageIcon(msg.type);
    const color = getMessageColor(msg.type);
    const timestamp = formatTimestamp(msg.timestamp);
    
    let content = msg.content;
    if (syntaxHighlight) {
      content = highlightCode(content);
    }

    return (
      <Box key={msg.id} marginBottom={1}>
        <Text color="gray">[{timestamp}]</Text>
        {' '}
        <Text color={color} bold>
          {icon} {msg.type.toUpperCase()}
        </Text>
        {msg.toolName && (
          <Text color="yellow"> ({msg.toolName})</Text>
        )}
        <Text>{'\n'}</Text>
        <Text>{content}</Text>
      </Box>
    );
  };

  const displayMessages = messages.slice(-maxHeight);

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      borderStyle="single"
      borderColor="gray"
    >
      <Box flexDirection="column" ref={messagesEndRef}>
        {displayMessages.length === 0 ? (
          <Text color="gray">No messages yet. Start by entering a command.</Text>
        ) : (
          displayMessages.map(renderMessage)
        )}
      </Box>
    </Box>
  );
};

OutputPanel.displayName = 'OutputPanel';
