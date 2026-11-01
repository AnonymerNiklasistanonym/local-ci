import { useState, useEffect, useRef } from 'react';
import type { Worker } from 'worker_threads';
import type { Job, Stage } from '../../config/config.js';
import { createWorkerJob } from '../../worker/create.js';
import type { JobState, StageState, WorkerMessage } from '../../worker/types.js';
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

  useEffect(() => {
    const workers = workersRef.current;

    // Create a wrapper function around starting a worker that can be awaited
    const createWorkerJobWrapper = (job: Job, jobId: string, onMessage: (msg: WorkerMessage) => void) =>
      new Promise<{ code?: number; jobId: string; job: Job }>((resolve, reject) => {
        const worker = createWorkerJob(job, jobId, onMessage, logger, true);
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
                if (prevJob.status !== 'running' && prevJob.status !== 'created') {
                  logger.warn('Tried to update a job that was not running any more');
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
                if (msg.type === 'stdout') {
                  logger.debug({ jobId, msg });
                  return {
                    ...prevJob,
                    logs: [...prevJob.logs, ['stdout', msg.text]],
                  };
                }
                if (msg.type === 'stderr') {
                  logger.debug({ jobId, msg });
                  return {
                    ...prevJob,
                    logs: [...prevJob.logs, ['stderr', msg.text]],
                  };
                }
                if (msg.type === 'done:command') {
                  logger.debug({ jobId, exitCode: msg.code, msg }, 'worker done with command');
                  return { ...prevJob, progress: msg.progress, logs: msg.logs };
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
        const failedJobs = results.filter((a) => a.code !== 0);
        const allowedToFailJobs = failedJobs.filter((a) => a.job.allowedToFail === true);
        const status =
          failedJobs.length === 0 ? 'success' : failedJobs.length === allowedToFailJobs.length ? 'warning' : 'error';
        setStages((prev) =>
          prev.map((a) => ({
            ...a,
            progress: 100,
            // TODO What if no success!
            status,
          })),
        );
        if (status === 'warning') {
          pipelineStatus = 'warning';
        }
        if (status === 'error') {
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
      // TODO Terminate if everything works
      workers.forEach((w) => w.terminate());
      workers.length = 0;
    };
  }, []);

  return { done, stages: stagesInternal, jobs };
}
