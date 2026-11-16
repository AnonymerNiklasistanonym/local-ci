import { constants } from 'fs';
import { access, readFile } from 'fs/promises';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getHooksDir } from './git.js';
import { generateGitHook, getHookInstallOptions } from './install.js';

vi.mock('fs/promises');
vi.mock('fs', () => ({
  constants: { F_OK: 0 },
}));
vi.mock('./git.js');

const mockedAccess = vi.mocked(access);
const mockedReadFile = vi.mocked(readFile);
const mockedGetHooksDir = vi.mocked(getHooksDir);

describe('getHookInstallOptions', () => {
  const hooksDir = '/fake/hooks';
  const hookName = 'pre-commit';

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetHooksDir.mockResolvedValue(hooksDir);
  });

  it('returns ["create"] when file does not exist', async () => {
    mockedAccess.mockRejectedValue(new Error('ENOENT'));
    mockedReadFile.mockRejectedValue(new Error('ENOENT'));

    const result = await getHookInstallOptions(hookName);

    expect(mockedGetHooksDir).toHaveBeenCalled();
    expect(mockedAccess).toHaveBeenCalledWith(expect.stringContaining(hookName), constants.F_OK);
    expect(result).toEqual(['create']);
  });

  it('returns ["append", "overwrite"] when file exists without markers', async () => {
    mockedAccess.mockResolvedValue(undefined);
    mockedReadFile.mockResolvedValue('some hook contents without markers');

    const result = await getHookInstallOptions(hookName);

    expect(result).toEqual(['append', 'overwrite']);
  });

  it('returns ["append", "overwrite", "update"] when file exists and markers are present', async () => {
    mockedAccess.mockResolvedValue(undefined);
    mockedReadFile.mockResolvedValue(generateGitHook('abc'));

    const result = await getHookInstallOptions(hookName);

    expect(result).toEqual(['append', 'overwrite', 'update']);
  });

  it('does not include "update" when marker regex matches', async () => {
    mockedAccess.mockResolvedValue(undefined);
    mockedReadFile.mockResolvedValue('# BEGIN HOOK\nbody\n# END HOOK');

    const result = await getHookInstallOptions(hookName);

    expect(result).not.toContain('update');
  });

  it('uses the correct file path when reading contents', async () => {
    mockedAccess.mockResolvedValue(undefined);
    mockedReadFile.mockResolvedValue('content');

    await getHookInstallOptions('post-merge');

    expect(mockedAccess).toHaveBeenCalledWith(expect.stringMatching(/[/\\]post-merge$/), constants.F_OK);
    expect(mockedReadFile).toHaveBeenCalledWith(expect.stringMatching(/[/\\]post-merge$/), 'utf8');
  });

  describe('error handling', () => {
    it('propagates errors from getHooksDir', async () => {
      mockedGetHooksDir.mockRejectedValue(new Error('no hooks dir'));

      await expect(getHookInstallOptions(hookName)).rejects.toThrow('no hooks dir');
    });
  });
});
