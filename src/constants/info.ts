import pkg from '../../package.json' with { type: 'json' };

export function extractName(fullName: string) {
  const i = fullName.lastIndexOf('/');
  return i === -1 ? fullName : fullName.substring(i + 1);
}

export const name = extractName(pkg.name);
