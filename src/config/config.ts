import { Type, type Static } from 'typebox';

export const JobT = Type.Object(
  {
    name: Type.Optional(Type.String({ description: 'The name of the job' })),
    commands: Type.Array(
      Type.Union([
        Type.Array(
          Type.String({
            description: 'Commands that should be run in order after each other',
          }),
        ),
        Type.String({
          description: 'Commands that should be run in order after each other',
        }),
      ]),
    ),
    cwd: Type.Optional(
      Type.String({
        description: 'Directory in which the commands should be run',
      }),
    ),
    mandatory: Type.Optional(
      Type.Boolean({
        description: 'Always run this job, even when filter is applied',
      }),
    ),
    explicit: Type.Optional(
      Type.Boolean({
        description: 'Only run this job if explicitly requested',
      }),
    ),
    labels: Type.Optional(
      Type.Array(
        Type.String({
          description: 'A label to filter jobs',
        }),
      ),
    ),
    allowedToFail: Type.Optional(
      Type.Boolean({
        description: 'On failure continue do not stop and continue with the next stage',
      }),
    ),
  },
  {
    title: 'Job',
    description: 'A job runs a sequence of commands',
    additionalProperties: false,
  },
);
export type Job = Static<typeof JobT>;

export const StageT = Type.Object(
  {
    name: Type.Optional(Type.String({ description: 'The name of the stage' })),
    mandatory: Type.Optional(
      Type.Boolean({
        description: 'Always run this stage, even when filter is applied',
      }),
    ),
    explicit: Type.Optional(
      Type.Boolean({
        description: 'Only run this stage if explicitly requested',
      }),
    ),
    labels: Type.Optional(
      Type.Array(
        Type.String({
          description: 'A label to filter stages',
        }),
      ),
    ),
    jobs: Type.Array(JobT),
  },
  {
    title: 'Stage',
    description: 'A stage runs jobs in parallel',
    additionalProperties: false,
  },
);
export type Stage = Static<typeof StageT>;

export const ConfigT = Type.Object(
  {
    $schema: Type.Optional(Type.String()),
    name: Type.Optional(Type.String({ description: 'The name of the stage' })),
    stages: Type.Array(StageT),
  },
  {
    title: 'Config',
    description: 'A config contains all information to run a local CI, meaning a list of stages',
    additionalProperties: false,
  },
);
export type Config = Static<typeof ConfigT>;
