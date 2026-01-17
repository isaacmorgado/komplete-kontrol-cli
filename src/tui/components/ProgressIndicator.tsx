/**
 * ProgressIndicator Component
 * Shows progress bars and status text for long-running operations
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProgressIndicatorProps } from '../types';

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  total,
  current,
  message = 'Processing...',
  showPercentage = true,
  style = 'bar',
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const percentage = Math.round(clampedProgress);
  
  const renderBar = () => {
    const width = 40;
    const filled = Math.round((clampedProgress / 100) * width);
    const empty = width - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return (
      <Text>
        <Text color="green">{filledBar}</Text>
        <Text color="gray">{emptyBar}</Text>
        {showPercentage && ` ${percentage}%`}
      </Text>
    );
  };

  const renderDots = () => {
    const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const index = Math.floor(Date.now() / 100) % dots.length;
    
    return (
      <Text>
        <Text color="yellow">{dots[index]}</Text>
        {showPercentage && ` ${percentage}%`}
      </Text>
    );
  };

  const renderSpinner = () => {
    const spinners = ['|', '/', '-', '\\'];
    const index = Math.floor(Date.now() / 200) % spinners.length;
    
    return (
      <Text>
        <Text color="cyan">{spinners[index]}</Text>
        {showPercentage && ` ${percentage}%`}
      </Text>
    );
  };

  const renderArrow = () => {
    const arrows = ['←', '↑', '→', '↓'];
    const index = Math.floor(Date.now() / 150) % arrows.length;
    
    return (
      <Text>
        <Text color="magenta">{arrows[index]}</Text>
        {showPercentage && ` ${percentage}%`}
      </Text>
    );
  };

  const renderStyle = () => {
    switch (style) {
      case 'dots':
        return renderDots();
      case 'spinner':
        return renderSpinner();
      case 'arrow':
        return renderArrow();
      default:
        return renderBar();
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      {renderStyle()}
      {message && (
        <Text color="gray">- {message}</Text>
      )}
      {total !== undefined && current !== undefined && (
        <Text color="blue">
          ({current.toLocaleString()} / {total.toLocaleString()})
        </Text>
      )}
    </Box>
  );
};

ProgressIndicator.displayName = 'ProgressIndicator';
