import { Box, Text, useWindowSize } from 'ink';
import { isLabel, isNotALabel } from '../../config/updateConfig.js';
import { Badge } from '@inkjs/ui';
import type { CommandOptionsFilter } from '../../cli/program.js';
import { colors } from '../constants/themes.js';

type FilterInfoProps = CommandOptionsFilter;

export const FilterInfo = ({ also, only, skip }: FilterInfoProps) => {
  const { columns } = useWindowSize();
  const onlySorted = only?.toSorted((a, b) => a.localeCompare(b));
  const skipSorted = skip?.toSorted((a, b) => a.localeCompare(b));
  const alsoSorted = also?.toSorted((a, b) => a.localeCompare(b));
  // TODO Format labels and names differently instead of showing :
  return (
    <Box flexDirection="column">
      {onlySorted && onlySorted.length > 0 && (
        <Box flexDirection="row" columnGap={1}>
          <Text>Only run:</Text>
          {onlySorted.filter(isNotALabel).map((a, index) => (
            <Badge key={index} color={colors.filter.only}>
              <Text>{a}</Text>
            </Badge>
          ))}
          {onlySorted.filter(isLabel).map((a, index) => (
            <Badge key={index} color={colors.filter.only}>
              <Text>{a}</Text>
            </Badge>
          ))}
        </Box>
      )}
      {skipSorted && skipSorted.length > 0 && (
        <Box flexDirection="row" columnGap={1}>
          <Text>Skip:{' '.repeat(4)}</Text>
          {skipSorted.filter(isNotALabel).map((a, index) => (
            <Badge key={index} color={colors.filter.skip}>
              <Text>{a}</Text>
            </Badge>
          ))}
          {skipSorted.filter(isLabel).map((a, index) => (
            <Badge key={index} color={colors.filter.skip}>
              <Text>{a}</Text>
            </Badge>
          ))}
        </Box>
      )}
      {alsoSorted && alsoSorted.length > 0 && (
        <Box flexDirection="row" columnGap={1}>
          <Text>Also run:</Text>
          {alsoSorted.filter(isNotALabel).map((a, index) => (
            <Badge key={index} color={colors.filter.also}>
              <Text>{a}</Text>
            </Badge>
          ))}
          {alsoSorted.filter(isLabel).map((a, index) => (
            <Badge key={index} color={colors.filter.also}>
              <Text>{a}</Text>
            </Badge>
          ))}
        </Box>
      )}
      <Text dimColor>{'─'.repeat(columns)}</Text>
    </Box>
  );
};
