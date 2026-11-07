import { Box, Text, useWindowSize } from 'ink';
import { statusColor } from '../constants/status.js';
import type { JobState } from '../../worker/states.js';
import { createJobStateDisplayName, createJobStateInfo } from '../helper/state.js';
import { TerminalWindow } from '../components/TerminalWindow.js';

interface RunJobDetailsProps {
  /** The current height of the view in order to maximize the terminal scroll window inside it */
  heightView: number;
  activeJob: JobState;
}

export const RunJobDetails = ({ activeJob, heightView }: RunJobDetailsProps) => {
  const { rows } = useWindowSize();
  return (
    <Box flexDirection="column">
      {activeJob.logs.length === 0 ? (
        <Text dimColor>Waiting for output...</Text>
      ) : (
        <TerminalWindow
          color={statusColor[activeJob.status]}
          title={createJobStateDisplayName(activeJob)}
          subtitle={createJobStateInfo(activeJob)}
          height={rows - heightView}
        >
          {activeJob.logs.map(([type, message], i) =>
            type === 'command' ? (
              <Text key={`active-job-${i}`} color="gray">
                $ {message}
              </Text>
            ) : (
              <Text key={`active-job-${i}`} color={type === 'stderr' ? 'yellow' : 'white'}>
                {message.trimEnd()}
              </Text>
            ),
          )}
        </TerminalWindow>
      )}
    </Box>
  );
};
