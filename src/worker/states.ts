/** Tracked status of a command/job or a stage (warning means it failed but was allowed to) */
export type WorkerStatus = 'created' | 'running' | 'success' | 'warning' | 'error';

interface WorkerState {
  /** Unique ID of the worker */
  id: string;
  /** Current status of the worker */
  status: WorkerStatus;
  /** Optional name */
  name?: string;
  /* Optional time the worker needed to complete the job/stage */
  timeWorkerMs?: number;
}

/** Messages sent from Worker to main thread */
export interface JobState extends WorkerState {
  /** Combined logs */
  logs: ['stdout' | 'stderr' | 'command', string][];
  /** How many commands were already run */
  progress: number;
}

/** Messages sent from Worker to main thread */
export interface StageState extends WorkerState {
  /** How many jobs were already run */
  progress: number;
}
