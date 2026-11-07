import { Box, renderToString, Text, useApp, useInput, useWindowSize } from 'ink';
import { useEffect, useState } from 'react';
import { useJobs } from './hooks/useJobs.js';
import { ProgressBar, ThemeProvider } from '@inkjs/ui';
import { TerminalWindow } from './components/TerminalWindow.js';
import { statusColor } from './constants/status.js';
import { progressBarTheme } from './constants/themes.js';
import { createJobStateDisplayName, createJobStateInfo } from './helper/state.js';
import type { CommandReturnValue } from '../cli/program.js';
import type { GenericViewProps } from '../App.js';
import type { JobState } from '../worker/states.js';
import clipboardy from 'clipboardy';
import { stripVTControlCharacters } from 'node:util';

interface RunViewProps extends GenericViewProps {
  renderAsString?: boolean;
}

const copyLogs = (jobStage: JobState, stripAnsiSymbols: boolean = true) => {
  const logsAsText = jobStage.logs
    .map(([type, message]) => {
      const updatedMessage = stripAnsiSymbols ? stripVTControlCharacters(message) : message;
      return type === 'command' ? `$ ${updatedMessage}` : updatedMessage.trimEnd();
    })
    .join('\n');

  clipboardy.writeSync(logsAsText);
};

export function RunView({ config, configFile: _configFile, logger, interactive, fullscreen }: RunViewProps) {
  const { columns } = useWindowSize();
  const { done, stages, jobs, reset } = useJobs({ stages: config.stages, logger });
  const { exit } = useApp();

  const [activeJobTracker, setActiveJobTracker] = useState<{ id: string } | undefined>(undefined);

  const showProgressBar = !done;
  const showInstructions = interactive || !done;

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
          {fullscreen && (
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
          )}
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

  const activeJob = jobs.find((a) => a.id === activeJobTracker?.id);

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

      {/* Divider and instructions */}
      {showInstructions && (
        <Box flexDirection="column">
          <Text dimColor>{'─'.repeat(columns)}</Text>
          <Text dimColor>
            ← → switch job {activeJob && '| ↑ ↓ scroll | l copy logs '}| q quit {interactive && '| r repeat '}
          </Text>
        </Box>
      )}

      {/* Current job's log area */}
      {activeJob && (
        <Box flexDirection="column">
          {activeJob?.logs.length === 0 ? (
            <Text dimColor>Waiting for output...</Text>
          ) : (
            <TerminalWindow
              color={statusColor[activeJob.status]}
              title={createJobStateDisplayName(activeJob)}
              subtitle={createJobStateInfo(activeJob)}
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
      )}
    </Box>
  );
}
