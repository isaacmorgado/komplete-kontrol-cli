/**
 * StatusBar Component
 * Displays system status, model info, tokens, and cost at top of screen
 */

import React from 'react';
import { Box, Text } from 'ink';
import { StatusBarProps } from '../types';

export const StatusBar: React.FC<StatusBarProps> = ({
  model,
  tokensUsed,
  cost,
  status,
  streaming = false,
}) => {
  const statusIcons = {
    idle: '○',
    running: '●',
    complete: '✓',
    error: '✗',
  };

  const statusColors = {
    idle: 'gray',
    running: 'yellow',
    complete: 'green',
    error: 'red',
  };

  const formatTokens = (count: number): string => {
    return count.toLocaleString();
  };

  const formatCost = (amount: number): string => {
    return `$${amount.toFixed(4)}`;
  };

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      width="100%"
    >
      <Text>
        <Text color={statusColors[status]} bold>
          {statusIcons[status]}
        </Text>
        {' '}
        <Text bold>{model.name}</Text>
        <Text color="gray"> ({model.provider})</Text>
        {' | '}
        <Text color="blue">Tokens: {formatTokens(tokensUsed)}</Text>
        {' | '}
        <Text color="green">Cost: {formatCost(cost)}</Text>
        {streaming && <Text color="cyan"> [Streaming]</Text>}
      </Text>
    </Box>
  );
};

StatusBar.displayName = 'StatusBar';
