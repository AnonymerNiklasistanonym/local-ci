import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { CommandOptions, Mode } from './cli/program.js';
import { readConfigFile } from './config/readConfigFile.js';
import { ErrorView } from './views/Error.js';
import pkg from '../package.json' with { type: 'json' };
import type { Config } from './config/config.js';
import { InfoView } from './views/Info.js';
import { Spinner } from '@inkjs/ui';
import { RunView } from './views/Run.js';
import type { Logger } from 'pino';

export interface AppProps extends CommandOptions {
  mode: Mode;
  logger: Logger;
}

export function App({ mode, config: configFile = `.${pkg.name}.json`, logger, interactive }: AppProps) {
  const { exit } = useApp();
  const [error, setError] = useState<Error | undefined>();
  const [config, setConfig] = useState<Config>();

  // This hook keeps the process alive and waits for keystrokes
  useInput((input) => {
    // Press q to exit
    if (input === 'q') {
      logger.debug('User pressed q to close the program');
      // Close with error in case this is part of a git hook
      exit(1);
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
        <InfoView config={config} configFile={configFile} logger={logger} />
      ) : (
        <RunView config={config} configFile={configFile} logger={logger} interactive={interactive} />
      )
    ) : (
      <Spinner label={`Loading ${pkg.name} config from '${configFile}'...`} />
    );

  return (
    <Box flexDirection="column" padding={mode !== 'run' ? 1 : 0}>
      {content}
      {mode !== 'run' && (
        <Box flexDirection="row" paddingTop={1}>
          <Text dimColor>Press "q" to exit</Text>
        </Box>
      )}
    </Box>
  );
}
