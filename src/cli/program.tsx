import { Argument, Command } from 'commander';
import pkg from '../../package.json' with { type: 'json' };
import { render } from 'ink';
import { App } from '../App.js';
import { createLogger } from '../logger.js';
import type { Logger } from 'pino';
import { PRODUCTION } from '../env.js';
import { withFullScreen } from 'fullscreen-ink';

export type Mode = 'info' | 'run';

export interface CommandOptions {
  config: string;
  interactive: boolean;
  verbose: boolean;
  only?: string[];
  fullscreen: boolean;
}

export interface CommandReturnValue {
  exitCode: number;
  additionalOutput?: () => string;
}

export const command = new Command()
  .name(pkg.name)
  .version(pkg.version)
  .description(pkg.description)
  .addArgument(
    new Argument('[mode]', 'what should be done')
      .choices(['info', 'run'] satisfies Mode[])
      .default('run' satisfies Mode),
  )
  .option('-v, --verbose', 'show extra info', false)
  .option('-i, --interactive', 'do not close the program if its done to inspect logs', false)
  .option('-f, --fullscreen', 'render in fullscreen (clears screen on exit)', false)
  .option('--config <path>', 'path to your local-ci config', `.${pkg.name}.json`)
  .option('--only <stages/labels...>', 'only run specific stages (build lint) or labels (:fix)')
  .action(async (mode: Mode, options: CommandOptions) => {
    let logger: Logger | undefined = undefined;
    try {
      logger = createLogger(options.verbose ? `${pkg.name}.log` : undefined, options.verbose ? 'debug' : 'silent');
      if (options.verbose) {
        console.log(`${pkg.name} v${pkg.version}${PRODUCTION ? '' : ' [dev build]'}`);

        logger.info(`Create logs in ${`${pkg.name}.log`}`);
      }

      let result: CommandReturnValue;
      if (options.fullscreen) {
        const ink = withFullScreen(<App {...options} mode={mode} logger={logger} />);
        await ink.start();
        result = (await ink.instance.waitUntilExit()) as CommandReturnValue;
      } else {
        const { waitUntilExit } = render(<App {...options} mode={mode} logger={logger} />);
        result = (await waitUntilExit()) as CommandReturnValue;
      }

      if (typeof result !== 'object' || typeof result.exitCode !== 'number') {
        throw Error(`Unexpected program exit value: ${JSON.stringify(result)}`);
      }
      logger.info({ exitCode: result.exitCode }, 'Program exit');

      if (typeof result === 'object' && result.additionalOutput !== undefined) {
        console.log(result.additionalOutput());
      }

      logger.flush();
      process.exit(result.exitCode);
    } catch (err) {
      console.error(err);
      if (logger) {
        logger.error(err, 'Program crash');
        logger.flush();
      }
      process.exit(-1);
    }
  });
