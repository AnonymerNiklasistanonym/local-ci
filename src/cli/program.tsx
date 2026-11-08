import { Argument, Command } from 'commander';
import { render, renderToString } from 'ink';
import { App } from '../App.js';
import { FilterInfo } from '../views/components/FilterInfo.js';
import type { Logger } from 'pino';
import { PRODUCTION } from '../env.js';
import { createLogger } from '../logger.js';
import { name } from '../constants/info.js';
import pkg from '../../package.json' with { type: 'json' };
import { sep } from 'path';
import { withFullScreen } from 'fullscreen-ink';

export type Mode = 'info' | 'run';

export interface CommandOptionsFilter {
  /** Allowlist (like specifying that only a select stage with the name 'test' should be run) */
  only?: string[];
  /** Blocklist (like specifying that the stage 'build' should not be run) */
  skip?: string[];
  /** Extend allowlist (like also running jobs with the label 'fix') */
  also?: string[];
}

export interface CommandOptions extends CommandOptionsFilter {
  config: string;
  interactive: boolean;
  verbose: boolean;
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
  .option('--config <path>', 'path to your local-ci config', `.${name}.json`)
  .option('--only <stages/labels...>', 'only run specific stages (test) or labels (:test) [allowlist]')
  .option('--skip <stages/labels...>', 'exclude specific stages (build) or labels (:test) [blocklist]')
  .option('--also <stages/labels...>', 'also run specific stages (build) or labels (:fix)')
  .action(async (mode: Mode, options: CommandOptions) => {
    let logger: Logger | undefined = undefined;
    try {
      logger = createLogger(options.verbose ? `${name}.log` : undefined, options.verbose ? 'debug' : 'silent');
      if (options.verbose) {
        console.log(`${pkg.name} v${pkg.version}${PRODUCTION ? '' : ' [dev build]'}`);
        console.log(`Create logs in ${`.${sep}${name}.log`}`);
      }

      if (
        mode === 'run' &&
        ((options.also && options.also.length > 0) ||
          (options.skip && options.skip.length > 0) ||
          (options.only && options.only.length > 0))
      ) {
        const filterInfo = renderToString(<FilterInfo {...options} />, {
          columns: process.stdout.columns,
        });
        console.log(filterInfo);
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
