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
  const [visible, setVisible] = useState(true);

  const frames = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['│', '┤', '┴', '┬', '├', '─'],
    arrow: ['←', '↑', '→', '↓'],
    bouncing: ['⠁', '⠂', '⠄', '⠂'],
  };

  const interval = {
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
  }, [style]);

  const render = () => {
    if (!visible) return null;

    return (
      <Text color={color}>
        {frames[style][frame]} {message}
      </Text>
    );
  };

  return {
    render,
    start: () => setVisible(true),
    stop: () => setVisible(false),
  };
};

Spinner.displayName = 'Spinner';
