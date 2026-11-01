#!/usr/bin/env node

import { command } from './cli/program.js';

if (import.meta.main) {
  await command.parseAsync(process.argv);
}
