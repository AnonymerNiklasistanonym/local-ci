import { Box, Text } from 'ink';
import type { Stage } from '../../config/config.js';
import { Badge } from '@inkjs/ui';
import { InfoJob } from './InfoJob.js';

interface InfoStageProps {
  indexStage: number;
  stage: Stage;
}

export const InfoStage = ({ indexStage, stage }: InfoStageProps) => {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Text>
          #{indexStage} {stage.name ?? 'Stage'}
        </Text>
        {stage.mandatory ? <Badge color={'yellow'}>mandatory</Badge> : ''}
        {stage.explicit ? <Badge color={'yellow'}>disabled by default</Badge> : ''}
        {stage.labels?.map((label, l) => (
          <Badge key={l} color={'magenta'}>
            :{label}
          </Badge>
        ))}
      </Box>
      {stage.jobs.length > 0 &&
        stage.jobs.map((job, j) => <InfoJob key={j} indexStage={indexStage} indexJob={j} job={job} />)}
    </Box>
  );
};
