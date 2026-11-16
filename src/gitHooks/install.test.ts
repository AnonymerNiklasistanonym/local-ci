import { describe, it, expect } from 'vitest';

import { generateGitHook, GIT_HOOK_BLOCK } from './install.js';

describe('git hooks', () => {
  describe('GIT_HOOK_BLOCK', () => {
    it('matches a basic block', () => {
      const input = ['# local-ci:v1:begin', 'echo hello', '# local-ci:v1:end'].join('\n');

      const match = [...input.matchAll(GIT_HOOK_BLOCK)][0];
      expect(match?.groups?.version).toBe('1');
      expect(match?.groups?.body).toBe('echo hello\n');

      expect(GIT_HOOK_BLOCK.test(input)).toBe(true);
    });
    it('matches the output of generateGitHook', () => {
      GIT_HOOK_BLOCK.lastIndex = 0; // reset
      const hook = generateGitHook('npm run dev --');
      const match = [...hook.matchAll(GIT_HOOK_BLOCK)][0];

      expect(match).toBeDefined();
      expect(match.groups?.body).toBeTruthy();
    });
  });

  describe('GIT_HOOK_BLOCK + generateGitHook', () => {
    it('replacing the match changes nothing', () => {
      const hook = generateGitHook('npm run dev --');
      const updatedHook = hook.replace(GIT_HOOK_BLOCK, hook);

      expect(updatedHook).toBe(hook);
    });

    it('replacing the block in a shebang hook is idempotent', () => {
      const hookShebang = generateGitHook('npm run dev --', true);
      const hook = generateGitHook('npm run dev --'); // no shebang = just the block

      const updatedHook = hookShebang.replace(GIT_HOOK_BLOCK, hook);
      expect(updatedHook).toBe(hookShebang);
    });
  });

  describe('generateGitHook + getHookInstallOptions', () => {
    it('replacing the block in a shebang hook is idempotent', () => {
      const hookShebang = generateGitHook('npm run dev --', true);
      const hook = generateGitHook('npm run dev --'); // no shebang = just the block

      const updatedHook = hookShebang.replace(GIT_HOOK_BLOCK, hook);
      expect(updatedHook).toBe(hookShebang);
    });
  });
});
