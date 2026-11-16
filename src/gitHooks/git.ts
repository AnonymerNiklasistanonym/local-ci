import { execFile } from 'child_process';
import { join, resolve } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function git(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { encoding: 'utf8' });
    const out = stdout.trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the directory Git actually uses for hooks.
 *
 * Priority:
 *   1. `core.hooksPath` (may be relative to the repo root or absolute)
 *   2. `<git-dir>/hooks`
 */
export async function getHooksDir(): Promise<string> {
  const hooksPath = await git(['config', '--get', 'core.hooksPath']);
  if (hooksPath) {
    // Relative hook paths are resolved against the working tree root.
    if (hooksPath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(hooksPath)) {
      return hooksPath;
    }
    const topLevel = (await git(['rev-parse', '--show-toplevel'])) ?? process.cwd();
    return resolve(topLevel, hooksPath);
  }

  const gitDir = await git(['rev-parse', '--git-dir']);
  if (!gitDir) {
    throw new Error('Not inside a Git repository (git rev-parse --git-dir failed)');
  }
  // `--git-dir` may be relative to cwd; make it absolute for stable joins.
  const absoluteGitDir = resolve(process.cwd(), gitDir);
  return join(absoluteGitDir, 'hooks');
}
