import pino, { type LevelWithSilent } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const createLogger = (file?: string, logLevel: LevelWithSilent = 'silent') => {
  return pino({
    level: logLevel,
    transport: {
      targets: [
        // Console output
        {
          target: isDevelopment ? 'pino-pretty' : 'pino/file',
          level: 'warn',
          options: { destination: 1 }, // 1 represents STDOUT
        },
        // Optional file output (JSON format)
        ...(file
          ? [
              {
                target: 'pino/file',
                level: 'debug',
                options: { destination: file, mkdir: true },
              },
            ]
          : []),
      ],
    },
  });
};
