import type { Config, InternalConfig, InternalJob, InternalStage, Job, Stage } from './config.js';
import type { CommandOptionsFilter } from '../cli/program.js';
import path from 'path';

export const LABEL_PREFIX = ':';

export const isLabel = (a: string) => a.startsWith(LABEL_PREFIX);
export const isNotALabel = (a: string) => !isLabel(a);

const filterStage = (stage: Stage, { also, skip }: CommandOptionsFilter): boolean => {
  const alsoLabels = also?.filter((a) => a.startsWith(LABEL_PREFIX));
  const allowLabel = stage.labels?.some((label) => alsoLabels?.includes(LABEL_PREFIX + label));

  const skipLabels = skip?.filter((a) => a.startsWith(LABEL_PREFIX));
  const skipLabel = stage.labels?.some((label) => skipLabels?.includes(LABEL_PREFIX + label));

  // TODO Other cases

  if (stage.explicit) {
    if (!allowLabel) {
      return false;
    }
  }
  if (skipLabel) {
    return false;
  }
  return true;
};

const filterJob = (job: Job, { also, skip }: CommandOptionsFilter): boolean => {
  const alsoLabels = also?.filter((a) => a.startsWith(LABEL_PREFIX));
  const allowLabel = job.labels?.some((label) => alsoLabels?.includes(LABEL_PREFIX + label));

  const skipLabels = skip?.filter((a) => a.startsWith(LABEL_PREFIX));
  const skipLabel = job.labels?.some((label) => skipLabels?.includes(LABEL_PREFIX + label));

  // TODO Other cases

  if (job.explicit) {
    if (!allowLabel) {
      return false;
    }
  }
  if (skipLabel) {
    return false;
  }
  return true;
};

/**
 * Parse config to include stage and job IDs and filter what jobs should be executed
 */
export const updateConfigFile = (config: Config, configFile: string, filter: CommandOptionsFilter): InternalConfig => {
  // TODO Extend config with unique ID
  // TODO Filter config
  let indexStage = 1;
  return {
    ...config,
    displayName: config.name ?? `<${(path.basename(configFile), '.json')}>`,
    source: configFile,
    stages: config.stages
      .filter((stage) => filterStage(stage, filter))
      .reduce((internalStages, currStage) => {
        const stageId = `${indexStage}`;
        let indexJob = 1;
        const jobs = currStage.jobs
          .filter((job) => filterJob(job, filter))
          .reduce((internalJobs, currJob) => {
            const jobId = `${stageId}.${indexJob}`;
            indexJob++;
            return internalJobs.concat({
              ...currJob,
              id: jobId,
              stageId,
            });
          }, [] as InternalJob[]);

        if (jobs.length === 0) {
          return internalStages;
        }
        indexStage++;

        return internalStages.concat({
          ...currStage,
          id: stageId,
          jobs,
        });
      }, [] as InternalStage[]),
  };
};
