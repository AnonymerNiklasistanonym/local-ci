import { bunPluginPino } from 'bun-plugin-pino';
import pkg from './package.json' with { type: 'json' };

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

for (const config of [
  {
    outdir: `./dist_bun_${pkg.name}_v${pkg.version}`,
  } as const,
  {
    compile: { target: 'bun-linux-x64', outfile: `./dist_bun/${pkg.name}-v${pkg.version}-linux-x64` },
  } as const,
  {
    compile: { target: 'bun-windows-x64', outfile: `./dist_bun/${pkg.name}-v${pkg.version}-win-x64.exe` },
  } as const,
  {
    outdir: `./dist_bun_${pkg.name}_v${pkg.version}`,
  } as const,
])
  await Bun.build({
    entrypoints: ['./src/cli.tsx', './src/worker/worker.ts'],
    root: './src',
    define: {
      'process.env.NODE_ENV': '"production"',
      __WORKER_PATH__: './worker/worker.js',
    },
    target: 'bun', // allow Node.js built-in modules
    plugins: [
      bunPluginPino({
        transports: ['pino-pretty', 'pino/file'],
      }),
      ignoreReactDevToolsPlugin,
    ],
    ...config,
  });
