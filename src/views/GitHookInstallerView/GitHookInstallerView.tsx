import { MultiSelect, Select, type Option } from '@inkjs/ui';
import { Box, renderToString, Text, useApp } from 'ink';
import { useCallback, useEffect, useState } from 'react';

import type { GenericViewProps } from '../../App.js';
import type { CommandReturnValue } from '../../cli/program.js';
import { PRODUCTION } from '../../env.js';
import { getHookInstallOptions, installHook, type InstallHookOption } from '../../gitHooks/install.js';

const HOOK_OPTIONS = ['pre-commit', 'pre-push', 'commit-msg'];
const STATES = ['select_hooks', 'install_hooks', 'installed_hooks'] as const;
const HOOK_STATES = ['select_install_method', 'install', 'installed'] as const;

interface GitHookInstallerViewProps extends Omit<GenericViewProps, 'config'> {
  configFile: string;
}

export const GitHookInstallerView = ({ configFile, fullscreen, logger }: GitHookInstallerViewProps) => {
  const [currentState, setCurrentState] = useState<(typeof STATES)[number]>('select_hooks');
  const [hooks, setHooks] = useState<
    { name: string; state?: (typeof HOOK_STATES)[number]; active: boolean; installed?: string; error?: Error }[]
  >([]);
  const { exit } = useApp();

  const activeHook = hooks.find((a) => a.active);
  const [activeHookInstallOptions, setActiveHookInstallOptions] = useState<InstallHookOption[] | undefined>();

  const onSubmitInstallHooks = useCallback((finalValues: string[]) => {
    logger.debug({ finalValues }, 'onSubmitInstallHooks');
    if (finalValues.length === 0) {
      exit({
        additionalOutput: () =>
          renderToString(<Text>No git hook was selected</Text>, { columns: process.stdout.columns }),
        exitCode: 0,
      } as CommandReturnValue);
    }
    setHooks(finalValues.map((name) => ({ active: false, name })));
    setCurrentState('install_hooks');
  }, []);

  /** Called when the user selected their preferred method of installing the hook */
  const onSubmitInstallHook = useCallback(
    async (finalValue: string) => {
      logger.debug({ activeHook }, 'onSubmitInstallHook');
      if (!activeHook) return;
      const installed = await installHook(
        activeHook.name,
        finalValue as InstallHookOption,
        PRODUCTION ? undefined : 'npm run dev --',
        fullscreen,
        configFile,
      );
      logger.debug({ activeHook, installed }, 'onSubmitInstallHook:installHook');
      setHooks((prev) => {
        const activeIndex = prev.findIndex((info) => info.active);
        if (activeIndex === -1) {
          logger.warn('Unable to find an active hook in hooks');
          return prev;
        }
        const nextIndex = activeIndex + 1 < prev.length ? activeIndex + 1 : undefined;

        return prev.map((info, i) => {
          // Update the installed/active state of the active hook
          if (i === activeIndex) {
            logger.debug({ activeHook }, 'onSubmitInstallHook:removeActive');
            return { ...info, active: false, installed, state: 'installed' };
          }
          // Change the next hook to the active hook
          if (i === nextIndex) {
            logger.debug({ activeHook, nextActiveHook: info }, 'onSubmitInstallHook:nextActiveHook');
            return { ...info, active: true };
          }
          return info;
        });
      });
    },
    [activeHook],
  );

  useEffect(() => {
    if (currentState !== 'install_hooks') return;
    setHooks((prev) => prev.map((info, i) => (i === 0 ? { ...info, active: true } : info)));
  }, [currentState]);

  useEffect(() => {
    if (!activeHook) return;
    // Reset options whenever the active hook changes
    setActiveHookInstallOptions(undefined);
    getHookInstallOptions(activeHook.name).then(setActiveHookInstallOptions);
  }, [activeHook]);

  useEffect(() => {
    if (!activeHook) return;
    if (!activeHook.state) {
      // If there is no state in the active hook switch to the inital state
      setHooks((prev) => prev.map((info) => (info.active ? { ...info, state: 'select_install_method' } : info)));
      return;
    }
  }, [activeHook]);

  useEffect(() => {
    // Detect if all hooks are installed
    if (currentState === 'install_hooks' && hooks.length > 0 && hooks.every((h) => h.state === 'installed')) {
      setCurrentState('installed_hooks');
    }
  }, [currentState, hooks]);

  useEffect(() => {
    // Exit if all hooks are installed
    if (currentState !== 'installed_hooks') return;
    exit({ exitCode: 0 } as CommandReturnValue);
  }, [currentState]);

  return (
    <Box flexDirection="column" gap={1}>
      {currentState === 'select_hooks' && (
        <Box flexDirection="column">
          <Text bold>Select git hooks to install:</Text>
          <MultiSelect
            options={HOOK_OPTIONS.map<Option>((value) => ({ label: value, value }))}
            onSubmit={onSubmitInstallHooks}
          />
        </Box>
      )}
      {currentState === 'install_hooks' && (
        <Box flexDirection="column">
          {activeHook && activeHookInstallOptions && (
            <Box flexDirection="column">
              <Text bold>How should the git hook {activeHook.name} be installed:</Text>
              <Select
                // Force Select remount per hook
                key={activeHook.name}
                options={activeHookInstallOptions.map<Option>((value) => ({ label: value, value }))}
                onChange={onSubmitInstallHook}
              />
            </Box>
          )}
        </Box>
      )}
      {hooks.length > 0 && (
        <Box flexDirection="column" paddingTop={1}>
          <Text>Status:</Text>
          <Box flexDirection="column" paddingLeft={1} paddingTop={1}>
            {hooks.map(({ name, state, installed, error, active }) => (
              <Text key={name} color={active ? 'blue' : state === 'installed' ? 'green' : undefined}>
                {name}
                {installed && `: ${installed}`}
                {error && `: ${error.message}`}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      <Box flexDirection="column" padding={1}>
        <Text dimColor>Press "q" to exit</Text>
        {(currentState === 'select_hooks' || currentState === 'install_hooks') && (
          <Box flexDirection="row" gap={1}>
            <Text dimColor>Select with</Text>
            {activeHook?.state !== 'select_install_method' && (
              <>
                <Text inverse>Space</Text>
                <Text dimColor>and continue with</Text>
              </>
            )}
            <Text inverse>Enter</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
