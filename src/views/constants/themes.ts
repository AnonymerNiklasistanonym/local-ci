import { defaultTheme, extendTheme } from '@inkjs/ui';
import type { TextProps } from 'ink';

export const progressBarTheme = extendTheme(defaultTheme, {
  components: {
    ProgressBar: {
      styles: {
        completed: (): TextProps => ({
          color: 'blue',
        }),
      },
    },
  },
});

export const colors = {
  exitCode: {
    nonZero: 'red',
    zero: 'green',
  },
  filter: {
    also: 'blue',
    only: 'green',
    skip: 'red',
  },
} as const;
