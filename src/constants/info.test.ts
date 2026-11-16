import { describe, expect, it } from 'vitest';

import pkg from '../../package.json' with { type: 'json' };
import { extractName } from './info.js';

describe('extractName', () => {
  it('scoped package', () => {
    expect(extractName('@scope/pkg')).toBe('pkg');
  });
  it('normal package', () => {
    expect(extractName('pkg')).toBe('pkg');
  });
  it('current package sanity checks', () => {
    expect(extractName(pkg.name).includes('/')).toBe(false);
    expect(extractName(pkg.name).includes('@')).toBe(false);
  });
});
