import { Box, Text } from 'ink';
import type { Config } from '../config/config.js';
import { InfoStage } from './components/InfoStage.js';
import type { Logger } from 'pino';

interface InfoViewProps {
  config: Config;
  configFile: string;
  logger: Logger;
}

export function InfoView({ config, configFile }: InfoViewProps) {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {config.name ?? configFile}
      </Text>
      {config.stages.map((stage, i) => (
        <InfoStage key={i} indexStage={i} stage={stage} />
      ))}
    </Box>
  );
}
