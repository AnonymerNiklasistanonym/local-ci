/** Information with which each worker is initalized */
export interface WorkerData {
  jobId: string;
  commands: (string | string[])[];
  cwd?: string;
  logToFile?: boolean;
}
