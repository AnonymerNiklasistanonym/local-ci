import { type ReactNode } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { Scrollable } from '@oliveryasuna/ink-frame-scroll';

interface DividerProps {
  width: number;
  color: string;
}

const Divider = ({ width, color = 'gray' }: DividerProps) => {
  const line = '─'.repeat(width);
  return <Text color={color}>{line}</Text>;
};

interface TerminalWindowProps {
  /** The title being displayed on the top left */
  title: string;
  /** The subtitle being displayed on the top right */
  subtitle?: string;
  /** The color of the window */
  color?: string;
  /** The height of the terminal in the command line (depending on other content shown and the current rows) */
  height: number;
  /** The text (for example logs) to be rendered inside the window */
  children: ReactNode;
}

export const TerminalWindow = ({ title, subtitle, color = 'green', height, children }: TerminalWindowProps) => {
  const { columns } = useWindowSize();

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} width={columns - 2} paddingX={1}>
      {/* Title bar */}
      <Box justifyContent="space-between">
        <Text bold color={color}>
          {title}
        </Text>
        {subtitle && (
          <Text bold color="gray">
            {subtitle}
          </Text>
        )}
      </Box>
      {/* Separator */}
      <Divider width={columns - 6} color="gray" />
      {/* Content */}
      <Box flexDirection="column">
        <Scrollable height={height - 4} followTail>
          {children}
        </Scrollable>
      </Box>
    </Box>
  );
};
