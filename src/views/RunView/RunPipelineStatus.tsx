import { Box, Text } from 'ink';
import { statusColor } from '../constants/status.js';
import type { JobState, StageState } from '../../worker/states.js';

interface RunPipelineStatusProps {
  stages: StageState[];
  jobs: JobState[];
  activeJob?: JobState;
}

export const RunPipelineStatus = ({ stages, jobs, activeJob }: RunPipelineStatusProps) => {
  return (
    <Box flexDirection="row" gap={2}>
      {/* Stages */}
      <Box flexDirection="column">
        {stages.map((stage, i) => {
          const isActive = (activeJob?.id && activeJob.id.startsWith(stage.id)) || false;
          return (
            <Box flexDirection="row" key={i}>
              <Text color={'gray'} bold inverse={isActive}>
                {stage.id}{' '}
              </Text>
              <Text color={statusColor[stage.status]} bold inverse={isActive}>
                {stage.name}
              </Text>
            </Box>
          );
        })}
      </Box>
      {/* Jobs */}
      <Box flexDirection="column">
        {stages.map((stage, indexStage) => {
          const stageJobs = jobs.filter((a) => a.id.startsWith(`${stage.id}.`));
          return (
            <Box flexDirection="row" key={indexStage} gap={2}>
              {stageJobs.map((job, indexJob) => {
                const jobId = `${indexStage + 1}.${indexJob + 1}`;
                const isActive = job.id === activeJob?.id;
                return (
                  <Box flexDirection="row" key={indexJob}>
                    <Text color={'gray'} inverse={isActive}>
                      {jobId}{' '}
                    </Text>
                    <Text color={statusColor[job.status]} inverse={isActive}>
                      {job.name}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
