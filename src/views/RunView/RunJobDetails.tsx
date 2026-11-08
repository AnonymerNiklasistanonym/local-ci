import { Box, Text, useWindowSize } from 'ink';
import { createJobStateDisplayName, createJobStateInfo } from '../helper/state.js';
import { statusColor, statusIcon } from '../constants/status.js';
import { ElapsedTime } from '../components/ElapsedTime.js';
import type { JobState } from '../../worker/states.js';
import { RunJobLog } from './RunJobLog.js';
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
          info={activeJob.status === 'running' ? undefined : createJobStateInfo(activeJob)}
          status={
            activeJob.status === 'running' && activeJob.startTimeMs !== undefined ? (
              <ElapsedTime startTimeMs={activeJob.startTimeMs} />
            ) : (
              statusIcon[activeJob.status]
            )
          }
          height={rows - heightView}
          inProgress={activeJob.status === 'running'}
        >
          {activeJob.logs.map((log, i) => (
            <RunJobLog key={i} log={log} />
          ))}
        </TerminalWindow>
      )}
    </Box>
  );
};
