import { ConfigT } from '../src/config/config.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import pkg from '../package.json' with { type: 'json' };

const lastIndexSlash = pkg.name.lastIndexOf('/');
export const name = lastIndexSlash === -1 ? pkg.name : pkg.name.substring(lastIndexSlash + 1);

await writeFile(join(import.meta.dirname, '..', `${name}.schema.json`), JSON.stringify(ConfigT, null, 2), 'utf-8');
