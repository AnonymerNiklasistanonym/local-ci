import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { CommandOptions, CommandReturnValue, Mode } from './cli/program.js';
import { readConfigFile } from './config/readConfigFile.js';
import { ErrorView } from './views/Error.js';
import pkg from '../package.json' with { type: 'json' };
import type { Config } from './config/config.js';
import { InfoView } from './views/InfoView/InfoView.js';
import { Spinner } from '@inkjs/ui';
import { RunView } from './views/RunView/RunView.js';
import type { Logger } from 'pino';

export interface AppProps extends CommandOptions {
  mode: Mode;
  logger: Logger;
}

export interface GenericViewProps {
  config: Config;
  configFile: string;
  interactive: boolean;
  fullscreen: boolean;
  logger: Logger;
}

export function App({ mode, config: configFile = `.${pkg.name}.json`, logger, ...other }: AppProps) {
  const { exit } = useApp();
  const [error, setError] = useState<Error | undefined>();
  const [config, setConfig] = useState<Config>();

  // This hook keeps the process alive and waits for keystrokes
  useInput((input) => {
    // Press q to exit
    if (input === 'q') {
      logger.debug(`User pressed ${input} to close the program`);
      // Close with error in case this is part of a git hook
      exit({ exitCode: 1 } satisfies CommandReturnValue);
    }
  });

  useEffect(() => {
    logger.debug({ configFile }, 'read config file');
    readConfigFile(configFile)
      .then((readConfig) => {
        logger.debug({ readConfig }, 'read config file: success');
        setConfig(readConfig);
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
        <InfoView config={config} configFile={configFile} logger={logger} {...other} />
      ) : (
        <RunView config={config} configFile={configFile} logger={logger} {...other} />
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
