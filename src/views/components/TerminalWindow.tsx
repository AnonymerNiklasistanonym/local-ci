import { type ReactNode } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { Scrollable } from '@oliveryasuna/ink-frame-scroll';
import { Spinner } from '@inkjs/ui';

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
  /** The info being displayed on the top right */
  info?: string[];
  /** The status being displayed on the top right */
  status?: string | ReactNode;
  /** The color of the window */
  color?: string;
  /** Show in progress animation */
  inProgress?: boolean;
  /** The height of the terminal in the command line (depending on other content shown and the current rows) */
  height: number;
  /** The text (for example logs) to be rendered inside the window */
  children: ReactNode;
}

export const TerminalWindow = ({
  title,
  info,
  status,
  color = 'green',
  height,
  inProgress,
  children,
}: TerminalWindowProps) => {
  const { columns } = useWindowSize();

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} width={columns - 2} paddingX={1}>
      {/* Title bar */}
      <Box justifyContent="space-between">
        <Box flexDirection="row" columnGap={1}>
          {inProgress && <Spinner type="dots14" />}
          <Text bold color={color}>
            {title}
          </Text>
        </Box>
        {((info && info.length > 0) || status) && (
          <Box flexDirection="row" columnGap={1}>
            {info && info.length > 0 && (
              <Text bold color="gray">
                [{info.join(', ')}]
              </Text>
            )}
            {status && (
              <Text bold color="gray">
                {status}
              </Text>
            )}
          </Box>
        )}
      </Box>
      {/* Separator */}
      <Divider width={columns - 6} color={color} />
      {/* Content */}
      <Box flexDirection="column">
        <Scrollable height={height - 4} followTail>
          {children}
        </Scrollable>
      </Box>
    </Box>
  );
};
