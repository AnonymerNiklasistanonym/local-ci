/** Tracked status of a command (warning means it failed but was allowed to) */
export type JobStatus = 'created' | 'running' | 'success' | 'warning' | 'error';

/** Messages sent from Worker to main thread */
export interface JobState {
  id: string;
  /** Optional job name */
  name?: string;
  status: JobStatus;
  /** Combined logs */
  logs: ['stdout' | 'stderr' | 'command', string][];
  /** How many commands were already run */
  progress: number;
}

/** Tracked status of a stage (warning means it failed but was allowed to) */
export type StageStatus = 'created' | 'running' | 'success' | 'warning' | 'error';

/** Messages sent from Worker to main thread */
export interface StageState {
  id: string;
  /** Optional job name */
  name?: string;
  status: StageStatus;
  /** How many jobs were already run */
  progress: number;
}

export interface WorkerData {
  jobId: string;
  commands: (string | string[])[];
  cwd?: string;
  logToFile?: boolean;
}

/** Messages sent from Worker to main thread */
export type WorkerMessage =
  // Worker was started
  | { type: 'start'; jobId: string; threadId: number; commands: (string | string[])[]; cwd?: string }
  // A command (of a list of commands) was started
  | { type: 'start:command'; jobId: string; command: string | string[]; indexCommand: number }
  // A command resulted in stdout/stderr output
  | {
      type: 'stdout' | 'stderr';
      jobId: string;
      indexCommand: number;
      text: string;
    }
  // There was an error while running the command
  | { type: 'error'; jobId: string; indexCommand?: number; text: string }
  // A command was executed
  | {
      type: 'done:command';
      jobId: string;
      indexCommand: number;
      progress: number;
      /** The code with which the command terminated */
      code: number;
      /** TODO: Sometimes logs do not seem to be transmitted in time so send all logs again */
      logs: ['stdout' | 'stderr' | 'command', string][];
    }
  // Worker is done
  | {
      type: 'done';
      jobId: string;
      /** The code with which the last command terminated */
      code: number;
    }
  // Worker process exited
  | {
      type: 'exit';
      jobId: string;
      /** The code with which the worker terminated */
      code: number;
    };
