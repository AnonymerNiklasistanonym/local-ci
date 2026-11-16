import { access, constants, readFile } from 'fs/promises';
import { join } from 'path';

import { getHooksDir } from './git.js';
import { GIT_HOOK_BLOCK } from './install.js';

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
    const markerMatch = contents.match(GIT_HOOK_BLOCK);
    if (!markerMatch) {
      installOptions.push('update');
    }
  } catch {
    // File cannot be read?
  }

  return installOptions;
};
