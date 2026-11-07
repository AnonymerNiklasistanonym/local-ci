import { useState, useEffect, useRef, useCallback } from 'react';
import type { Worker } from 'worker_threads';
import type { Job, Stage } from '../../config/config.js';
import { createWorker } from '../../worker/create.js';
import type { JobState, StageState } from '../../worker/states.js';
import type { WorkerMessage } from '../../worker/messages.js';
import type { Logger } from 'pino';

interface UseJobsProps {
  stages: Stage[];
  logger: Logger;
}

export function useJobs({ stages, logger }: UseJobsProps) {
  /** All stages */
  const [stagesInternal, setStages] = useState<StageState[]>([]);
  /** All started jobs */
  const [jobs, setJobs] = useState<JobState[]>([]);
  const [done, setDone] = useState<'success' | 'warning' | 'error' | undefined>(undefined);
  /** All started workers */
  const workersRef = useRef<Worker[]>([]);
  // Bumping this triggers a re-run from scratch
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const workers = workersRef.current;

    // Create a wrapper function around starting a worker that can be awaited
    const createWorkerJobWrapper = (job: Job, jobId: string, onMessage: (msg: WorkerMessage) => void) =>
      new Promise<{ code?: number; jobId: string; job: Job }>((resolve, reject) => {
        const worker = createWorker(
          { commands: job.commands, jobId, logToFile: logger.level === 'debug' },
          onMessage,
          logger,
        );
        logger.debug({ jobId, job }, 'Create worker job');
        workersRef.current.push(worker);
        let code: number | undefined = undefined;
        worker.on('error', (err) => reject(err));
        worker.on('message', (msg: WorkerMessage) => {
          if (msg.type === 'done') {
            code = msg.code;
          }
        });
        worker.on('exit', () => resolve({ code, jobId, job }));
        // Trigger worker
        worker.postMessage('trigger', []);
      });

    (async () => {
      let pipelineStatus: 'success' | 'warning' | 'error' = 'success';
      // Create workers for each stage
      let indexStage = 0;
      for (const stage of stages) {
        indexStage++;
        logger.debug({ jobs, stage }, 'Add jobs from stage');
        setStages((prev) =>
          prev.concat({
            id: `${indexStage}`,
            name: stage.name,
            progress: 0,
            status: 'created',
          }),
        );
        setJobs((prev) =>
          prev.concat(
            stage.jobs.map(
              (newJob, indexJob) =>
                ({
                  id: `${indexStage}.${indexJob + 1}`,
                  logs: [],
                  name: newJob.name,
                  progress: 0,
                  status: 'created',
                }) satisfies JobState,
            ),
          ),
        );
        logger.debug({ jobs, stageJobs: stage.jobs }, 'Create a worker for each job');
        const stagePromises: Promise<{ code?: number; jobId: string; job: Job }>[] = [];
        let indexJob = 0;
        for (const job of stage.jobs) {
          indexJob++;
          const jobId = `${indexStage}.${indexJob}`;
          const worker = createWorkerJobWrapper(job, jobId, (msg) => {
            // Update jobs
            setJobs((prev) =>
              prev.map((prevJob) => {
                if (prevJob.id !== msg.jobId) {
                  // logger.warn(`Job with the ID ${msg.jobId} does not exist!`);
                  // throw Error(`Job with the ID ${msg.jobId} does not exist!`);
                  return prevJob;
                }
                if (prevJob.status !== 'running' && prevJob.status !== 'created' && msg.type !== 'exit') {
                  logger.warn({ msg }, 'Tried to update a job that was not running any more');
                  return prevJob;
                }
                if (msg.type === 'start') {
                  logger.debug({ jobId, job, msg }, 'worker started');
                  return { ...prevJob, progress: 0 };
                }
                if (msg.type === 'start:command') {
                  logger.debug({ jobId, msg }, 'worker started with command');
                  return { ...prevJob };
                }
                if (msg.type === 'command' || msg.type === 'stdout' || msg.type === 'stderr') {
                  logger.debug({ jobId, msg });
                  return {
                    ...prevJob,
                    logs: [...prevJob.logs, [msg.type, msg.text]],
                  };
                }
                if (msg.type === 'done:command') {
                  logger.debug({ jobId, exitCode: msg.code, msg }, 'worker done with command');
                  return {
                    ...prevJob,
                    progress: msg.progress,
                    logs: msg.logs,
                    timeWorkerMs: msg.timeWorkerMs,
                    exitCode: msg.code,
                  };
                }
                if (msg.type === 'error') {
                  logger.error({ jobId, msg }, 'worker encountered an error');
                  // TODO Terminate on error
                  return { ...prevJob };
                }
                if (msg.type === 'done') {
                  logger.debug({ jobId, exitCode: msg.code, msg }, 'worker done with commands');
                  // TODO Terminate on error
                  return {
                    ...prevJob,
                    progress: 100,
                    status: msg.code === 0 ? 'success' : job.allowedToFail ? 'warning' : 'error',
                    timeWorkerMs: msg.timeWorkerMs,
                    exitCode: msg.code,
                  };
                }
                if (msg.type === 'exit') {
                  logger.debug({ jobId, exitCode: msg.code, msg }, 'worker process exited');
                }
                return prevJob;
              }),
            );
          });
          stagePromises.push(worker);
        }

        // Wait until all stage promises are one
        logger.debug('Wait until all promises were awaited');
        const results = await Promise.all(stagePromises);
        logger.debug({ results }, 'All promises were awaited');
        const failedJobsTotal = results.filter((a) => a.code !== 0);
        const allowedToFailJobsTotal = failedJobsTotal.filter((a) => a.job.allowedToFail === true);
        const statusTotal =
          failedJobsTotal.length === 0
            ? 'success'
            : failedJobsTotal.length === allowedToFailJobsTotal.length
              ? 'warning'
              : 'error';
        setStages((prev) =>
          prev.map((stageState) => {
            const stageJobs = results.filter((a) => a.jobId.startsWith(`${stageState.id}.`));
            const failedJobs = stageJobs.filter((a) => a.code !== 0);
            const allowedToFailJobs = failedJobs.filter((a) => a.job.allowedToFail === true);
            const status =
              failedJobs.length === 0
                ? 'success'
                : failedJobs.length === allowedToFailJobs.length
                  ? 'warning'
                  : 'error';
            return {
              ...stageState,
              progress: 100,
              // TODO What if no success!
              status,
            };
          }),
        );
        if (statusTotal === 'warning') {
          pipelineStatus = 'warning';
        }
        if (statusTotal === 'error') {
          pipelineStatus = 'error';
          break;
        }
      }
      logger.debug('All stages were completed');

      // Mark the pipeline as done with the final status
      setDone(pipelineStatus);
    })();

    // Cleanup
    return () => {
      logger.debug('Terminate all workers');
      // Terminate all workers
      workers.forEach((w) => w.terminate());
      workers.length = 0;
    };
  }, [runId]);

  const reset = useCallback(() => {
    // Terminate any running workers so they don't keep posting messages
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];

    setStages([]); // or a fresh initial value
    setJobs([]);
    setDone(undefined);
    setRunId((prev) => prev + 1);
  }, []);

  return { done, stages: stagesInternal, jobs, reset };
}
