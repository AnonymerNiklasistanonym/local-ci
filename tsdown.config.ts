import { defineConfig } from 'tsdown';

export default defineConfig({
  // Clean output directory before build
  clean: true,
  define: {
    // Change the location of the worker since it is its own bundled file
    __WORKER_PATH__: JSON.stringify('./worker.mjs'),
    // Enable to detect that this is a production build
    'process.env.NODE_ENV': '"production"',
  },
  entry: {
    cli: 'src/cli.tsx',
    worker: 'src/worker/worker.ts',
  },
  // Enable minification for production
  minify: true,
  // Generate source maps
  //sourcemap: true,
});
