import { Box, renderToString, Text, useApp, useInput, useWindowSize } from 'ink';
import { useEffect, useState } from 'react';
import { useJobs } from './useJobs.js';
import { ProgressBar, ThemeProvider } from '@inkjs/ui';
import { statusColor } from '../constants/status.js';
import { progressBarTheme } from '../constants/themes.js';
import { createJobStateDisplayName, createJobStateInfo } from '../helper/state.js';
import type { CommandReturnValue } from '../../cli/program.js';
import type { GenericViewProps } from '../../App.js';
import type { JobState } from '../../worker/states.js';
import clipboardy from 'clipboardy';
import { stripVTControlCharacters } from 'node:util';
import { RunPipelineStatus } from './RunPipelineStatus.js';
import { RunJobDetails } from './RunJobDetails.js';

interface RunViewProps extends GenericViewProps {
  renderAsString?: boolean;
}

const copyLogs = (jobStage: JobState, stripAnsiSymbols: boolean = true) => {
  clipboardy.writeSync(
    [
      `${createJobStateDisplayName(jobStage)} ${createJobStateInfo(jobStage)}`,
      ...jobStage.logs.map(([type, message]) => {
        const updatedMessage = stripAnsiSymbols ? stripVTControlCharacters(message) : message;
        return type === 'command' ? `$ ${updatedMessage}` : updatedMessage.trimEnd();
      }),
    ].join('\n'),
  );
};

export function RunView({ config, configFile: _configFile, logger, interactive, fullscreen }: RunViewProps) {
  const { columns } = useWindowSize();
  const { done, stages, jobs, reset } = useJobs({ stages: config.stages, logger });
  const { exit } = useApp();

  const [activeJobTracker, setActiveJobTracker] = useState<{ id: string } | undefined>(undefined);

  const showProgressBar = !done;
  const showInstructions = interactive || !done;

  const activeJob = jobs.find((a) => a.id === activeJobTracker?.id);

  const instructions = [
    '← → switch job',
    activeJob && '↑ ↓ scroll',
    activeJob && 'l copy logs',
    activeJob && 'q quit',
    interactive && 'r repeat',
  ]
    .filter((a): a is string => Boolean(a))
    .join(' | ');

  useInput((input, key) => {
    const jobsSorted = jobs.toSorted((a, b) => a.id.localeCompare(b.id));
    if (key.leftArrow || key.rightArrow) {
      setActiveJobTracker((prev) => {
        // Return nothing if there are no jobs
        if (jobsSorted.length === 0) return undefined;
        // Return either the first element or find the last one and then go to the next one
        const previousIndex = jobsSorted.findIndex((a) => a.id === prev?.id);
        let index: number;
        if (previousIndex === undefined) {
          index = 0;
        } else {
          index = (previousIndex + (key.leftArrow ? -1 : 1) + jobsSorted.length) % jobsSorted.length;
        }
        return { id: jobsSorted[index].id };
      });
    }
    // Press r to restart
    if (input === 'r') {
      reset();
    }
    // Press l to copy the current logs
    if (input.toLowerCase() === 'l' && activeJob) {
      copyLogs(activeJob, !key.shift);
    }
  });

  useEffect(() => {
    if (done && activeJobTracker === undefined) {
      switch (done) {
        case 'warning':
        case 'error':
          // Go to the first job that failed/threw a warning
          for (const job of jobs.toSorted((a, b) => a.id.localeCompare(b.id))) {
            if (job.status === done) {
              // TODO index?????
              setActiveJobTracker({ id: job.id });
              break;
            }
          }
          break;
        default:
          break;
      }
    }
  }, [done, jobs]);

  useEffect(() => {
    const additionalOutput = () =>
      renderToString(
        <>
          {/* Print stage status to the console after exiting the interactive render process */}
          {/* TODO Move to its own component so there is no redundant code! */}
          {fullscreen && <RunPipelineStatus jobs={jobs} stages={stages} activeJob={activeJob} />}
          {/* Print failed jobs to the console after exiting the interactive render process */}
          {jobs
            .filter((a) => a.status === 'error')
            .toSorted((a, b) => a.id.localeCompare(b.id))
            .map((job) => (
              <Box key={job.id} flexDirection="column">
                <Text dimColor>{'─'.repeat(columns)}</Text>
                <Text color={statusColor[job.status]}>{createJobStateDisplayName(job)}</Text>
                <Text dimColor>{'─'.repeat(columns)}</Text>
                {job.logs.map(([type, message], i) =>
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
              </Box>
            ))}
        </>,
        { columns: process.stdout.columns },
      );
    // TODO Propagate error code to app for error code on manual quit
    switch (done) {
      case 'success':
      case 'warning':
        if (!interactive) {
          exit({ exitCode: 0, additionalOutput } satisfies CommandReturnValue);
        }
        return;
      case 'error':
        if (!interactive) {
          exit({ exitCode: 0, additionalOutput } satisfies CommandReturnValue);
        }
        return;
      default:
      // Do nothing
    }
  }, [done]);

  return (
    <Box flexDirection="column">
      {/* Progress bar */}
      {showProgressBar && (
        <Box width={columns}>
          <ThemeProvider theme={progressBarTheme}>
            <ProgressBar
              value={
                jobs.length === 0 ? 0 : jobs.map((job) => job.progress).reduce((sum, curr) => sum + curr) / jobs.length
              }
            />
          </ThemeProvider>
        </Box>
      )}
      {/* Stages & Jobs */}
      <RunPipelineStatus jobs={jobs} stages={stages} activeJob={activeJob} />

      {/* Divider and instructions */}
      {showInstructions && (
        <Box flexDirection="column">
          <Text dimColor>{'─'.repeat(columns)}</Text>
          <Text dimColor>{instructions}</Text>
        </Box>
      )}

      {/* Current job's log area */}
      {activeJob && (
        <RunJobDetails
          activeJob={activeJob}
          // Remove one line because some terminals like to show the current command on top, idk why I need to remove another line
          heightView={stages.length + (showInstructions ? 2 : 0) + (showProgressBar ? 1 : 0) + 2}
        />
      )}
    </Box>
  );
}
