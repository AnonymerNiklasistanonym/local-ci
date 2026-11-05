import { Worker } from 'worker_threads';
import type { WorkerData } from './data.js';
import type { WorkerMessage } from './messages.js';
import { join } from 'path';
import type { Job } from '../config/config.js';
import type { Logger } from 'pino';

const workerPath =
  typeof __WORKER_PATH__ !== 'undefined' ? __WORKER_PATH__ : join(import.meta.dirname, '..', 'worker.js');

export const createWorkerJob = (
  job: Job,
  jobId: string,
  onMessage: (msg: WorkerMessage) => void,
  logger: Logger,
  logToFile = false,
) => {
  const worker = new Worker(new URL(workerPath, import.meta.url), {
    workerData: {
      jobId,
      commands: job.commands,
      cwd: job.cwd,
      logToFile,
    } satisfies WorkerData,
    name: jobId,
  });
  worker.on('message', (msg: WorkerMessage) => {
    onMessage(msg);
  });
  worker.on('exit', (code) => logger.debug({ code }, 'parent saw worker exit'));
  worker.on('error', (err) => logger.error(err));
  // Trigger the worker instead of just starting
  worker.postMessage('something', []);
  return worker;
};
