import pkg from '../../package.json' with { type: 'json' };

const lastIndexSlash = pkg.name.lastIndexOf('/');
export const name = lastIndexSlash === -1 ? pkg.name : pkg.name.substring(lastIndexSlash + 1);
