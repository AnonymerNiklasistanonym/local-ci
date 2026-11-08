import { humanTime } from '../../utils/human.js';
import type { JobState } from '../../worker/states.js';

export const createJobStateInfo = (jobState: JobState, logs: boolean = false) => {
  const infos: string[] = [];
  if (jobState.exitCode !== undefined && logs) {
    infos.push(`Exit code: ${jobState.exitCode}`);
  } else if (jobState.exitCode !== undefined && jobState.exitCode !== 0) {
    infos.push(`${jobState.exitCode}`);
  }
  if (jobState.timeWorkerMs) {
    infos.push(logs ? 'Total time: ' : '' + humanTime(jobState.timeWorkerMs));
  } else if (logs && jobState.startTimeMs) {
    infos.push(`Time until now: ${humanTime(performance.now() - jobState.startTimeMs)}`);
  }
  return infos;
};

export const createJobStateDisplayName = (jobState: JobState) => {
  if (jobState.name) {
    return `${jobState.name} (${jobState.id})`;
  }
  return jobState.id;
};
