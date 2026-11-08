import { Box, Text, useApp } from 'ink';
import { useEffect, useMemo } from 'react';
import type { CommandReturnValue } from '../cli/program.js';
import { ConfigError } from '../config/configError.js';

interface ErrorViewProps {
  error?: Error | ConfigError;
}

export function ErrorView({ error }: ErrorViewProps) {
  const { exit } = useApp();

  useEffect(() => {
    exit({ exitCode: 1 } satisfies CommandReturnValue);
  }, [exit]);

  const errorStack = useMemo(() => {
    const stacks: string[] = [];
    let current: unknown = error;
    while (current instanceof Error) {
      const stack = current.stack
        ? `${current.name}: ${current.message}\n${current.stack.split('\n').slice(1).join('\n')}`
        : `${current.name}: ${current.message}`;
      stacks.push(stack);
      current = (current as { cause?: unknown }).cause;
    }
    return stacks;
  }, [error]);

  const errorStackComponent = errorStack.map((stack, i) => (
    <Box key={i} flexDirection="column">
      {i > 0 && (
        <Text dimColor bold>
          Caused by ({i}):
        </Text>
      )}
      <Text dimColor>{stack}</Text>
    </Box>
  ));

  const header =
    error instanceof Error ? (
      <Text color="red" bold>
        {error.name}: {error.message}
      </Text>
    ) : (
      <Text color="red">Unexpected error: {String(error)}</Text>
    );

  if (error instanceof ConfigError) {
    return (
      <Box flexDirection="column" padding={1}>
        {header}
        <Box padding={1}>
          <Text color="blue">Config file: {error.path}</Text>
        </Box>
        {error.parseErrors?.map((e) => (
          <Text color={'yellow'} dimColor>
            {'  '}• {e.errorName} at line {e.line}: '{e.content}' (position: {e.column}, length: {e.length})
          </Text>
        ))}
        {error.parseErrors && error.parseErrors?.length > 0 && <Box marginTop={1} />}
        {error.validationErrors?.map((e) => (
          <Text color={'yellow'} dimColor>
            {'  '}• {e.instancePath || '(root)'}({e.keyword}): {e.message} (rule: {e.schemaPath})
          </Text>
        ))}
        {error.validationErrors && error.validationErrors?.length > 0 && <Box marginTop={1} />}
        {errorStackComponent}
      </Box>
    );
  }
  return (
    <Box flexDirection="column" padding={1}>
      {header}
      {errorStackComponent}
    </Box>
  );
}
