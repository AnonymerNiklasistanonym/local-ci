import { Box, renderToString, Text, useApp } from 'ink';
import { InfoStage } from './components/InfoStage.js';
import { Badge } from '@inkjs/ui';
import { useEffect } from 'react';
import type { CommandReturnValue } from '../cli/program.js';
import type { GenericViewProps } from '../App.js';

interface InfoViewProps extends GenericViewProps {
  renderAsString?: boolean;
}

export function InfoView({ config, configFile, logger, renderAsString, ...other }: InfoViewProps) {
  const { exit } = useApp();

  useEffect(() => {
    const additionalOutput = () =>
      renderToString(
        <InfoView
          config={config}
          configFile={configFile}
          logger={logger}
          {...other}
          interactive={false}
          renderAsString
        />,
        { columns: process.stdout.columns },
      );
    exit({ exitCode: 0, additionalOutput } satisfies CommandReturnValue);
  }, [exit]);

  if (!renderAsString) {
    return <></>;
  }

  return (
    <Box flexDirection="column" rowGap={1}>
      <Text bold color="cyan">
        {config.name ?? configFile}
      </Text>

      {/* Legend */}
      <Box columnGap={1}>
        <Text bold dimColor>
          Legend:
        </Text>
        <Badge color={'yellow'}>Property</Badge>
        <Badge color={'magenta'}>Label</Badge>
      </Box>

      {/* The current stages */}
      {config.stages.map((stage, i) => (
        <InfoStage key={i} indexStage={i} stage={stage} />
      ))}
    </Box>
  );
}
