import { humanTime } from '../../utils/human.js';
import type { JobState } from '../../worker/states.js';
import { statusIcon } from '../constants/status.js';

export const createJobStateInfo = (jobState: JobState) => {
  const infos: string[] = [];
  if (jobState.exitCode !== undefined) {
    infos.push(`${jobState.exitCode}`);
  }
  if (jobState.timeWorkerMs) {
    infos.push(humanTime(jobState.timeWorkerMs));
  }
  const status = statusIcon[jobState.status];
  if (infos.length > 0) {
    return `[${infos.join(', ')}] ${status}`;
  }
  return status;
};

export const createJobStateDisplayName = (jobState: JobState) => {
  if (jobState.name) {
    return `${jobState.name} (${jobState.id})`;
  }
  return jobState.id;
};
