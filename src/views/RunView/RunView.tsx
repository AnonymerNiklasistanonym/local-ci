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
import { ManualExit } from '../components/ManualExit.js';
import { humanTime } from '../../utils/human.js';
import { RunJobLog } from './RunJobLog.js';

interface RunViewProps extends GenericViewProps {
  renderAsString?: boolean;
}

const copyLogs = (jobStage: JobState, stripAnsiSymbols: boolean = true) => {
  clipboardy.writeSync(
    [
      `${createJobStateDisplayName(jobStage)} [${createJobStateInfo(jobStage, true).join(', ')}]`,
      ...jobStage.logs.map(([type, message]) => {
        switch (type) {
          case 'command':
            return `$ ${message}`;
          case 'command:status':
            return `[${[message.error && `ERROR(${message.error})`, message.exitCode, humanTime(message.timeMs)]
              .filter((a): a is string => Boolean(a))
              .join(', ')}]`;
          default:
            const updatedMessage = stripAnsiSymbols ? stripVTControlCharacters(message) : message;
            return updatedMessage.trimEnd();
        }
      }),
    ].join('\n'),
  );
};

export function RunView({ config, logger, interactive, fullscreen }: RunViewProps) {
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
    !done && 's skip',
    done && 'e exit',
  ]
    .filter((a): a is string => Boolean(a))
    .join(' | ');

  const additionalOutput = () =>
    renderToString(
      <>
        {/* Print stage status to the console after exiting the interactive render process */}
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
              {job.logs.map((log, i) => (
                <RunJobLog key={i} log={log} />
              ))}
            </Box>
          ))}
      </>,
      { columns: process.stdout.columns },
    );

  const exitView = () => {
    // TODO Propagate error code to app for error code on manual quit
    switch (done) {
      case 'success':
      case 'warning':
        exit({ exitCode: 0, additionalOutput } satisfies CommandReturnValue);
        return;
      case 'error':
        exit({ exitCode: 1, additionalOutput } satisfies CommandReturnValue);
        return;
      default:
      // Do nothing
    }
  };

  useInput((input, key) => {
    const jobsSorted = jobs.toSorted((a, b) => a.id.localeCompare(b.id));
    if (key.leftArrow || key.rightArrow) {
      setActiveJobTracker((prev) => {
        // Return nothing if there are no jobs
        if (jobsSorted.length === 0) return undefined;
        // Return either the first element or find the last one and then go to the next one
        const previousIndex = jobsSorted.findIndex((a) => a.id === prev?.id);
        let id: string;
        if (previousIndex === -1) {
          // If there are any currently relevant active jobs go to the first/last one of them initally
          const relevantActiveJobs = jobsSorted.filter(
            (a) => a.status === 'error' || a.status === 'warning' || a.status === 'running',
          );
          if (relevantActiveJobs.length > 0) {
            id = key.leftArrow ? relevantActiveJobs.slice(-1)[0].id : relevantActiveJobs[0].id;
          } else {
            // If no relevant jobs exist go to the first/last active job
            const index = key.leftArrow ? jobsSorted.length - 1 : 0;
            id = jobsSorted[index].id;
          }
        } else {
          const index = (previousIndex + (key.leftArrow ? -1 : 1) + jobsSorted.length) % jobsSorted.length;
          id = jobsSorted[index].id;
        }
        return { id };
      });
    }
    // Press r to restart
    if (input === 'r') {
      logger.debug(`User pressed ${input} to restart the pipeline`);
      reset();
    }
    // Press s to skip
    if (input === 's') {
      logger.debug(`User pressed ${input} to skip the pipeline`);
      const exitCode = 0;
      exit({
        exitCode,
        additionalOutput: () =>
          renderToString(<ManualExit message="Pipeline was manually skipped" exitCode={exitCode} />, {
            columns: process.stdout.columns,
          }),
      } satisfies CommandReturnValue);
    }
    // Press l to copy the current logs
    if (input.toLowerCase() === 'l' && activeJob) {
      logger.debug(`User pressed ${input} to copy logs`);
      copyLogs(activeJob, input === 'l');
    }
    // Press e to exit the interactive mode
    if (input === 'e' && done) {
      logger.debug(`User pressed ${input} to exit`);
      exitView();
    }
  });

  useEffect(() => {
    if (done && interactive && activeJobTracker === undefined) {
      switch (done) {
        case 'warning':
        case 'error':
          // Go to the first job that failed/threw a warning when done
          for (const job of jobs.toSorted((a, b) => a.id.localeCompare(b.id))) {
            if (job.status === done) {
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
    // TODO Propagate error code to app for error code on manual quit
    if (!interactive) {
      exitView();
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
          // Remove one line because some terminals like to show the current command on top
          heightView={stages.length + (showInstructions ? 2 : 0) + (showProgressBar ? 1 : 0) + 2}
        />
      )}
    </Box>
  );
}
