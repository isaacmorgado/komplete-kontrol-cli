/**
 * Spinner Component
 * Shows animated spinner for loading states
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { SpinnerProps } from '../types';

export const Spinner: React.FC<SpinnerProps> = ({
  message = 'Loading...',
  style = 'dots',
  color = 'yellow',
}) => {
  const [frame, setFrame] = useState(0);

  const frames: Record<string, string[]> = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['│', '┤', '┴', '┬', '├', '─'],
    arrow: ['←', '↑', '→', '↓'],
    bouncing: ['⠁', '⠂', '⠄', '⠂'],
  };

  const interval: Record<string, number> = {
    dots: 80,
    line: 120,
    arrow: 150,
    bouncing: 100,
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames[style].length);
    }, interval[style]);

    return () => clearInterval(timer);
  }, [style, frames, interval]);

  const currentFrames = frames[style] || frames.dots;
  const currentFrame = currentFrames[frame % currentFrames.length];

  return (
    <Text color={color}>
      {currentFrame} {message}
    </Text>
  );
};

Spinner.displayName = 'Spinner';
