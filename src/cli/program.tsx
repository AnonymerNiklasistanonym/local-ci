import { Argument, Command } from 'commander';
import pkg from '../../package.json' with { type: 'json' };
import { render } from 'ink';
import { App } from '../App.js';
import { createLogger } from '../logger.js';
import type { Logger } from 'pino';

export type Mode = 'info' | 'run';

export interface CommandOptions {
  config: string;
  interactive: boolean;
  verbose: boolean;
  only?: string[];
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
  .option('--config <path>', 'path to your local-ci config', `.${pkg.name}.json`)
  .option('--only <stages/labels...>', 'only run specific stages (build lint) or labels (:fix)')
  .action(async (mode: Mode, options: CommandOptions) => {
    let logger: Logger | undefined = undefined;
    try {
      logger = createLogger(options.verbose ? `${pkg.name}.log` : undefined, options.verbose ? 'debug' : 'silent');
      if (options.verbose) {
        console.log(`${pkg.name} v${pkg.version}`);
        logger.info(`Create logs in ${`${pkg.name}.log`}`);
      }
      const { waitUntilExit } = render(<App {...options} mode={mode} logger={logger} />);
      const result = await waitUntilExit();
      if (typeof result !== 'number') {
        throw Error(`Unexpected program exit value: ${JSON.stringify(result)}`);
      }
      logger.info({ exitCode: result ?? 0 }, 'Program exit');
      logger.flush();
      process.exit(result ?? 0);
    } catch (err) {
      console.error(err);
      if (logger) {
        logger.error(err, 'Program crash');
        logger.flush();
      }
      process.exit(-1);
    }
  });
