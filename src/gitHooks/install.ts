import { access, chmod, constants, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import pkg from '../../package.json' with { type: 'json' };
import { getHooksDir } from './git.js';

const GIT_HOOK_MARKER_BEGIN = `# local-ci:v${pkg.version}:begin`;
const GIT_HOOK_MARKER_END = `# local-ci:v${pkg.version}:end`;
export const GIT_HOOK_BLOCK =
  /^[^\S\r\n]*#\s+local-ci:v(?<version>[^\s:]+):begin[^\S\r\n]*\r?\n(?<body>[\s\S]*?)^\s*#\s+local-ci:v\k<version>:end[^\S\r\n]*(?:\r?\n|$)$/gm;

export type InstallHookOption = 'append' | 'create' | 'overwrite' | 'update';

export const getHookInstallOptions = async (name: string): Promise<InstallHookOption[]> => {
  const hooksDir = await getHooksDir();
  const filePath = join(hooksDir, name);
  const installOptions: InstallHookOption[] = [];

  try {
    await access(filePath, constants.F_OK);
    installOptions.push('append');
    installOptions.push('overwrite');
  } catch {
    installOptions.push('create');
  }

  try {
    // Check if markers can be found
    const contents = await readFile(join(hooksDir, name), 'utf8');
    GIT_HOOK_BLOCK.lastIndex = 0;
    if (GIT_HOOK_BLOCK.test(contents)) {
      installOptions.push('update');
    }
  } catch {
    // Nothing
  }

  return installOptions;
};

export const generateGitHook = (
  command: string,
  withShebang = false,
) => `${withShebang ? '#!/bin/sh\n\n' : ''}${GIT_HOOK_MARKER_BEGIN}

# Save current settings and then enable strict behavior (Terminate if any command is non 0)
SAVED_SETTINGS=$(set +o)
set -e

# Is file descriptor 1 (stdout) is connected to this terminal (TTY)
# Non GUI applications usually pipe stdout/stderr so it should be false and then skip this (e.g. VSCode git GUI)
if [ -t 1 ]; then
    # Save original stdin to fd 6
    exec 6<&0
    # Shell redirection
    # Replace the shell process's standard input (stdin) with the terminal device file
    # Any program launched afterward inherits a real terminal as stdin instead of whatever stdin the hook originally received (a pipe, /dev/null, or a closed fd)
    if exec < /dev/tty; then
        ${command}
    fi
    # Restore original stdin from fd 6 and close it
    exec 0<&6 6<&-
fi

# Restore the previous behavior
eval "$SAVED_SETTINGS"

${GIT_HOOK_MARKER_END}
`;

export type InstallHookResult = 'appended' | 'created' | 'overwritten' | 'updated';

export const installHook = async (
  name: string,
  option: InstallHookOption,
  // 'npm run dev --'
  command = `npx ${pkg.name}`,
  fullScreen = true,
  configFile?: string,
): Promise<InstallHookResult> => {
  const hooksDir = await getHooksDir();
  const filePath = join(hooksDir, name);
  const fullCommand = `${command}${fullScreen ? ' --fullscreen' : ''}${configFile ? ` --config ${configFile}` : ''}`;

  switch (option) {
    case 'create':
    case 'overwrite':
      writeFile(filePath, generateGitHook(fullCommand, true));
      await chmod(filePath, 0o755);
      return option === 'create' ? 'created' : 'overwritten';
    case 'update':
    case 'append':
      const content = await readFile(join(hooksDir, name), 'utf8');
      let newContent;
      if (option === 'update') {
        newContent = content.replace(GIT_HOOK_BLOCK, generateGitHook(fullCommand));
      } else {
        newContent = content + '\n' + generateGitHook(fullCommand);
      }
      writeFile(filePath, newContent);
      await chmod(filePath, 0o755);
      return option === 'append' ? 'appended' : 'updated';
  }
};
