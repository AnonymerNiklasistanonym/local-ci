import { ConfigT } from '../src/config/config.js';
import { join } from 'path';
import { name } from '../src/constants/info.js';
import { writeFile } from 'fs/promises';

await writeFile(join(import.meta.dirname, '..', `${name}.schema.json`), JSON.stringify(ConfigT, null, 2), 'utf-8');
