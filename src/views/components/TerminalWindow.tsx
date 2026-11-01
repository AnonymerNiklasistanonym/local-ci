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
  title: string;
  subtitle?: string;
  color?: string;
  children: ReactNode;
}

export const TerminalWindow = ({ title, subtitle, color = 'green', children }: TerminalWindowProps) => {
  const { columns, rows } = useWindowSize();

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
        <Scrollable height={Math.round(rows - 13)} followTail>
          {children}
        </Scrollable>
      </Box>
    </Box>
  );
};
