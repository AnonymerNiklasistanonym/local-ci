import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    cli: 'src/cli.tsx',
    worker: 'src/worker.ts',
  },
  define: {
    __WORKER_PATH__: JSON.stringify('./worker.mjs'),
  },
});
