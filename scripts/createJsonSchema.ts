import { writeFile } from 'fs/promises';
import { join } from 'path';

import { ConfigT } from '../src/config/config.js';
import { name } from '../src/constants/info.js';

await writeFile(join(import.meta.dirname, '..', `${name}.schema.json`), JSON.stringify(ConfigT, null, 2), 'utf-8');
