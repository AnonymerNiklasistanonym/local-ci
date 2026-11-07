import { bunPluginPino } from 'bun-plugin-pino';

// Create a binary

// CURRENTLY BROKEN
// error: Cannot find module '/$bunfs/root/thread-stream-worker.js'

// bun install
// bun add -d bun-plugin-pino
// bun build.ts

const ignoreReactDevToolsPlugin = {
  name: 'ignore-react-devtools',
  setup(build: any) {
    // Intercept import of react-devtools-core and point it to an empty namespace
    build.onResolve({ filter: /^react-devtools-core$/ }, (args: any) => {
      return { path: args.path, namespace: 'ignore-devtools' };
    });
    // Return empty content for modules in that namespace
    build.onLoad({ filter: /.*/, namespace: 'ignore-devtools' }, () => {
      return { contents: 'export default {};', loader: 'js' };
    });
  },
};

await Bun.build({
  entrypoints: ['./src/cli.tsx', './src/worker/worker.ts'],
  compile: { outfile: './local-ci' },
  define: {
    __WORKER_PATH__: './worker.js',
  },
  target: 'bun', // allow Node.js built-in modules
  plugins: [bunPluginPino({}), ignoreReactDevToolsPlugin],
});
