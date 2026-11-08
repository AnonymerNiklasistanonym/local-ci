/** The data structure for logs from the worker */
export type WorkerLog =
  | ['stdout' | 'stderr' | 'command', string]
  | ['command:status', { exitCode?: number; error?: string; timeMs: number }];

/** Messages sent from Worker to main thread */
export type WorkerMessage =
  // Worker was started
  | { type: 'start'; jobId: string; threadId: number; commands: (string | string[])[]; cwd?: string }
  // A command (of a list of commands) was started
  | { type: 'start:command'; jobId: string; command: string | string[]; indexCommand: number }
  // A command resulted in stdout/stderr output
  | {
      type: 'stdout' | 'stderr' | 'command';
      jobId: string;
      indexCommand: number;
      text: string;
    }
  | {
      type: 'command:status';
      jobId: string;
      indexCommand: number;
      data: { exitCode: number; timeMs: number };
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
      logs: WorkerLog[];
      timeWorkerMs: number;
    }
  // Worker is done
  | {
      type: 'done';
      jobId: string;
      /** The code with which the last command terminated */
      code: number;
      /** TODO: Sometimes logs do not seem to be transmitted in time so send all logs again */
      logs: WorkerLog[];
      timeWorkerMs: number;
    }
  // Worker process exited
  // TODO: Does this make sense?
  | {
      type: 'exit';
      jobId: string;
      /** The code with which the worker terminated */
      code: number;
    };
