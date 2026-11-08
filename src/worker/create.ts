import type { Logger } from 'pino';
import { Worker } from 'worker_threads';
import type { WorkerData } from './data.js';
import type { WorkerMessage } from './messages.js';
import { join } from 'path';

/** The worker path may be different when bundled */
const workerPath = typeof __WORKER_PATH__ !== 'undefined' ? __WORKER_PATH__ : join(import.meta.dirname, 'worker.js');

// TODO Move more into here and with a better structure

/**
 * Create a worker for a job to be executed
 */
export const createWorker = (
  workerData: WorkerData,
  onMessage: (msg: WorkerMessage) => void,
  logger: Logger,
): Worker => {
  const worker = new Worker(new URL(workerPath, import.meta.url), {
    name: workerData.jobId,
    workerData,
  });
  // Log all channels
  worker.on('message', (msg: WorkerMessage) => {
    onMessage(msg);
  });
  worker.on('messageerror', (err) => {
    logger.error(err, 'worker messageerror');
  });
  worker.on('online', () => {
    logger.debug('worker online');
  });
  worker.on('exit', (code) => {
    logger.debug({ code }, 'worker exit');
  });
  worker.on('error', (err) => {
    logger.error(err, 'worker error');
  });
  return worker;
};
