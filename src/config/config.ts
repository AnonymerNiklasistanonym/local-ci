import { type Static, Type } from 'typebox';

import { InternalPipelineT, PipelineT } from './pipeline.js';
import { PresetT } from './preset.js';

//#region Config
export const ConfigT = Type.Object(
  {
    $schema: Type.Optional(Type.String()),
    name: Type.Optional(Type.String({ description: 'The name of the config' })),
    pipeline: PipelineT,
    presets: Type.Optional(Type.Array(PresetT)),
  },
  {
    additionalProperties: false,
    description: 'A config contains all information to run a local CI, meaning a list of stages',
    title: 'Config',
  },
);
export type Config = Static<typeof ConfigT>;

export const InternalConfigT = Type.Intersect([
  ConfigT,
  Type.Object({
    displayName: Type.String({ description: 'The name of the stage' }),
    pipeline: InternalPipelineT,
    source: Type.String({ description: 'The source of this configuration' }),
  }),
]);

export type InternalConfig = Static<typeof InternalConfigT>;
//#endregion
