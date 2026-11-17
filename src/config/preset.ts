import { type Static, Type } from 'typebox';

//#region Only
export const OnlyT = Type.Array(
  Type.String({
    description: 'Stage, :Job or #Label that should be run without anything else',
  }),
  {
    additionalProperties: false,
    description: 'Allowlist of stages, jobs or labels to run',
    title: 'Only',
  },
);
export type Only = Static<typeof OnlyT>;
//#endregion

//#region Skip
export const SkipT = Type.Array(
  Type.String({
    description: 'Stage, :Job or #Label that should be skipped',
  }),
  {
    additionalProperties: false,
    description: 'Blocklist of stages, jobs or labels',
    title: 'Skip',
  },
);
export type Skip = Static<typeof SkipT>;
//#endregion

//#region Also
export const AlsoT = Type.Array(
  Type.String({
    description: 'Stage, :Job or #Label that should be run additionally to everything that is currently selected',
  }),
  {
    additionalProperties: false,
    description: 'List of stages/labels to also run',
    title: 'Skip',
  },
);
export type Also = Static<typeof AlsoT>;
//#endregion

//#region Also
export const PresetT = Type.Object(
  {
    also: Type.Optional(AlsoT),
    name: Type.String({ description: 'The name of the preset' }),
    only: Type.Optional(OnlyT),
    skip: Type.Optional(SkipT),
  },
  {
    additionalProperties: false,
    description: 'A preset contains information to configure running a pipeline',
    title: 'Config',
  },
);
export type Preset = Static<typeof PresetT>;
//#endregion
