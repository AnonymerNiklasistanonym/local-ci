import { Box, Text, useApp, useInput, useWindowSize, type TextProps } from 'ink';
import type { Config } from '../config/config.js';
import { useEffect, useState } from 'react';
import { useJobs } from './hooks/useJobs.js';
import { defaultTheme, extendTheme, ProgressBar, ThemeProvider } from '@inkjs/ui';
import type { JobStatus } from '../worker/types.js';
import type { Logger } from 'pino';
import { TerminalWindow } from './components/TerminalWindow.js';

interface InfoViewProps {
  config: Config;
  configFile: string;
  logger: Logger;
  interactive: boolean;
}

const statusIcon: Record<JobStatus, string> = {
  running: '⟳',
  success: '✓',
  error: '✗',
  warning: '!',
  created: '+',
};

const statusColor: Record<JobStatus, string> = {
  running: 'blue',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  created: 'gray',
};

const progressBarTheme = extendTheme(defaultTheme, {
  components: {
    ProgressBar: {
      styles: {
        completed: (): TextProps => ({
          color: 'blue',
        }),
      },
    },
  },
});

export function RunView({ config, configFile: _configFile, logger, interactive }: InfoViewProps) {
  const { columns } = useWindowSize();
  const { done, stages, jobs } = useJobs({ stages: config.stages, logger });
  const { exit } = useApp();
  const [showProgressBar, setShowProgressBar] = useState(true);

  const [activeJobTracker, setActiveJobTracker] = useState<{ id: string; index: number } | undefined>(undefined);

  useInput((input, key) => {
    const jobList = jobs.toSorted((a, b) => a.id.localeCompare(b.id));
    if (key.leftArrow || key.rightArrow) {
      setActiveJobTracker((prev) => {
        if (jobList.length === 0) return undefined;
        let index;
        if (prev === undefined) {
          index = 0;
        } else {
          index = (prev.index + (key.leftArrow ? -1 : 1) + jobList.length) % jobList.length;
        }
        return { id: jobList[index].id, index };
      });
    }
  });

  useEffect(() => {
    // TODO Propagate error code to app for error code on manual quit
    switch (done) {
      case 'success':
      case 'warning':
        setShowProgressBar(false);
        if (!interactive) {
          exit(0);
        }
        return;
      case 'error':
        setShowProgressBar(false);
        if (!interactive) {
          exit(1);
        }
        return;
      default:
      // Do nothing
    }
  }, [done]);

  const activeJob = jobs.find((a) => a.id === activeJobTracker?.id);
  const activeJobNameDisplay = activeJob && activeJob?.name ? `${activeJob.name} (${activeJob.id})` : activeJob?.id;

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
      <Box flexDirection="column">
        <Text dimColor>{'─'.repeat(columns)}</Text>
        <Text dimColor>
          ← → switch job {activeJob && '| ↑ ↓ scroll '}| q quit {interactive && '| r repeat '}
        </Text>
      </Box>

      {/* Current job's log area */}
      {activeJob && activeJobNameDisplay && (
        <Box flexDirection="column">
          {activeJob?.logs.length === 0 ? (
            <Text dimColor>Waiting for output...</Text>
          ) : (
            <TerminalWindow
              color={statusColor[activeJob.status]}
              // TODO Add time (running/executed)
              // TODO Add exit code (in general and for each command)
              title={activeJobNameDisplay}
              subtitle={statusIcon[activeJob.status]}
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
