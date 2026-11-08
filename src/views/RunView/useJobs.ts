import type { InternalJob, InternalStage } from '../../config/config.js';
import type { JobState, StageState } from '../../worker/states.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Logger } from 'pino';
import type { Worker } from 'worker_threads';
import type { WorkerMessage } from '../../worker/messages.js';
import { createWorker } from '../../worker/create.js';
import { join } from 'path';
import { name } from '../../constants/info.js';

interface UseJobsProps {
  stages: InternalStage[];
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
    const createWorkerJobWrapper = (job: InternalJob, onMessage: (msg: WorkerMessage) => void) =>
      new Promise<{ code?: number; job: InternalJob }>((resolve, reject) => {
        const logFile = join(process.cwd(), `${name}-worker-${job.id}.log`);
        const worker = createWorker(
          { commands: job.commands, jobId: job.id, logFile: logger.level === 'debug' ? logFile : undefined },
          onMessage,
          logger,
        );
        logger.debug({ job }, 'Create worker job');
        workersRef.current.push(worker);
        let code: number | undefined = undefined;
        worker.on('error', (err) => reject(err));
        worker.on('message', (msg: WorkerMessage) => {
          if (msg.type === 'done') {
            code = msg.code;
          }
        });
        worker.on('exit', () => resolve({ code, job }));
        // Trigger worker
        worker.postMessage('trigger', []);
      });

    (async () => {
      let pipelineStatus: 'success' | 'warning' | 'error' = 'success';
      // Create workers for each stage
      let indexStage = 0;
      for (const stage of stages) {
        indexStage++;
        logger.debug({ jobs, stage }, 'Create stage and add jobs from it');
        setStages((prev) =>
          prev.concat({
            id: stage.id,
            name: stage.name,
            progress: 0,
            startTimeMs: performance.now(),
            status: 'running',
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
                  startTimeMs: performance.now(),
                  status: 'created',
                }) satisfies JobState,
            ),
          ),
        );
        logger.debug({ jobs, stageJobs: stage.jobs }, 'Create a worker for each job');
        const stagePromises: Promise<{ code?: number; job: InternalJob }>[] = [];
        let indexJob = 0;
        for (const job of stage.jobs) {
          indexJob++;
          const worker = createWorkerJobWrapper(job, (msg) => {
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
                  logger.debug({ job, jobId: job.id, msg }, 'worker started');
                  return { ...prevJob, progress: 0, status: 'running' };
                }
                if (msg.type === 'start:command') {
                  logger.debug({ jobId: job.id, msg }, 'worker started with command');
                  return { ...prevJob };
                }
                if (msg.type === 'command' || msg.type === 'stdout' || msg.type === 'stderr') {
                  logger.debug({ jobId: job.id, msg });
                  return {
                    ...prevJob,
                    logs: [...prevJob.logs, [msg.type, msg.text]],
                  };
                }
                if (msg.type === 'command:status') {
                  logger.debug({ jobId: job.id, msg });
                  return {
                    ...prevJob,
                    logs: [...prevJob.logs, [msg.type, msg.data]],
                  };
                }
                if (msg.type === 'done:command') {
                  logger.debug({ exitCode: msg.code, jobId: job.id, msg }, 'worker done with command');
                  return {
                    ...prevJob,
                    exitCode: msg.code,
                    logs: msg.logs,
                    progress: msg.progress,
                    // Only update this one when the worker is 100% done
                    //timeWorkerMs: msg.timeWorkerMs,
                  };
                }
                if (msg.type === 'error') {
                  logger.error({ jobId: job.id, msg }, 'worker encountered an error');
                  // TODO Terminate on error
                  return { ...prevJob };
                }
                if (msg.type === 'done') {
                  logger.debug({ exitCode: msg.code, jobId: job.id, msg }, 'worker done with commands');
                  // TODO Terminate on error
                  return {
                    ...prevJob,
                    exitCode: msg.code,
                    logs: msg.logs,
                    progress: 100,
                    status: msg.code === 0 ? 'success' : job.allowedToFail ? 'warning' : 'error',
                    timeWorkerMs: msg.timeWorkerMs,
                  };
                }
                if (msg.type === 'exit') {
                  logger.debug({ exitCode: msg.code, jobId: job.id, msg }, 'worker process exited');
                }
                return prevJob;
              }),
            );
          });
          stagePromises.push(worker);
        }

        // Wait until all stage promises are done
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
            if (stageState.id !== stage.id) {
              return stageState;
            }
            const stageJobs = results.filter((a) => a.job.stageId === stageState.id);
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
              timeWorkerMs: stageState.startTimeMs ? performance.now() - stageState.startTimeMs : undefined,
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

  return { done, jobs, reset, stages: stagesInternal };
}
