import { Box, Text } from 'ink';
import { Badge } from '@inkjs/ui';
import type { Job } from '../../config/config.js';

interface InfoJobProps {
  indexStage: number;
  indexJob: number;
  job: Job;
}

export const InfoJob = ({ indexStage, indexJob, job }: InfoJobProps) => {
  return (
    <Box flexDirection="column" marginLeft={1}>
      <Box flexDirection="row" gap={1}>
        <Text>
          #{indexStage}.{indexJob} {job.name ?? 'Job'}
        </Text>
        {job.mandatory ? <Badge color={'yellow'}>mandatory</Badge> : ''}
        {job.explicit ? <Badge color={'yellow'}>disabled by default</Badge> : ''}
        {job.allowedToFail ? <Badge color={'yellow'}>allowed to fail</Badge> : ''}
        {job.labels?.map((label, l) => (
          <Badge key={l} color={'magenta'}>
            <Text>:{label}</Text>
          </Badge>
        ))}
      </Box>
      {job.cwd && (
        <Box flexDirection="column" marginLeft={1}>
          <Text bold dimColor>
            $ cd {job.cwd}
          </Text>
        </Box>
      )}
      {job.commands.length > 0 &&
        job.commands.map((command, k) => (
          <Box key={k} flexDirection="column" marginLeft={1}>
            <Text dimColor>$ {Array.isArray(command) ? command.join(' ') : command}</Text>
          </Box>
        ))}
    </Box>
  );
};
