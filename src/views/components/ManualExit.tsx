import { Badge } from '@inkjs/ui';
import { Box, Text, useWindowSize } from 'ink';
import { colors } from '../constants/themes.js';

interface ManualExitProps {
  message: string;
  exitCode: number;
}

export const ManualExit = ({ message, exitCode }: ManualExitProps) => {
  const { columns } = useWindowSize();
  return (
    <Box flexDirection="column">
      <Text dimColor>{'─'.repeat(columns)}</Text>
      <Box flexDirection="row" columnGap={1}>
        <Badge color={'yellow'}>{message}</Badge>
        <Text>→</Text>
        <Badge color={exitCode === 0 ? colors.exitCode.zero : colors.exitCode.nonZero}>Exit Code: {exitCode}</Badge>
      </Box>
    </Box>
  );
};
