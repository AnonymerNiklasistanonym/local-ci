import { Box, Text, renderToString, useApp, useInput } from 'ink';
import type { CommandOptions, CommandReturnValue, Mode } from './cli/program.js';
import { useEffect, useState } from 'react';
import { ErrorView } from './views/Error.js';
import { InfoView } from './views/InfoView/InfoView.js';
import type { InternalConfig } from './config/config.js';
import type { Logger } from 'pino';
import { ManualExit } from './views/components/ManualExit.js';
import { RunView } from './views/RunView/RunView.js';
import { Spinner } from '@inkjs/ui';
import { name } from './constants/info.js';
import pkg from '../package.json' with { type: 'json' };
import { readConfigFile } from './config/readConfigFile.js';
import { updateConfigFile } from './config/updateConfig.js';

export interface AppProps extends CommandOptions {
  mode: Mode;
  logger: Logger;
}

export interface GenericViewProps {
  config: InternalConfig;
  interactive: boolean;
  fullscreen: boolean;
  logger: Logger;
}

export function App({ mode, config: configFile = `.${name}.json`, logger, only, also, skip, ...other }: AppProps) {
  const { exit } = useApp();
  const [error, setError] = useState<Error | undefined>();
  const [config, setConfig] = useState<InternalConfig>();

  // This hook keeps the process alive and waits for keystrokes
  useInput((input) => {
    // Press q to exit
    if (input === 'q') {
      logger.debug(`User pressed ${input} to close the program`);
      const exitCode = 1;
      const additionalOutput = () =>
        renderToString(<ManualExit message="Pipeline was manually quit" exitCode={exitCode} />, {
          columns: process.stdout.columns,
        });
      // Close with error in case this is part of a git hook
      exit({ additionalOutput, exitCode: 1 } satisfies CommandReturnValue);
    }
  });

  useEffect(() => {
    logger.debug({ configFile }, 'read config file');
    readConfigFile(configFile)
      .then((readConfig) => {
        logger.debug({ readConfig }, 'read config file: success');
        const internalConfig = updateConfigFile(readConfig, configFile, {
          also,
          only,
          skip,
        });
        logger.debug({ internalConfig }, 'updated read config file for internal use');
        setConfig(internalConfig);
      })
      .catch((err) => {
        logger.error(err, 'read config file: failure');
        setError(err);
      });
  }, []);

  if (error !== undefined) {
    return <ErrorView error={error} />;
  }

  const content =
    config !== undefined ? (
      mode === 'info' ? (
        <InfoView config={config} logger={logger} {...other} />
      ) : (
        <RunView config={config} logger={logger} {...other} />
      )
    ) : (
      <Box flexDirection="column" padding={1}>
        <Spinner label={`Loading ${pkg.name} config from '${configFile}'...`} />
        <Box flexDirection="row" paddingTop={1}>
          <Text dimColor>Press "q" to exit</Text>
        </Box>
      </Box>
    );

  return content;
}
