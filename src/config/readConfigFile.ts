import { readFile } from 'fs/promises';
import { ConfigT, type Config } from './config.js';
import Compile from 'typebox/compile';
import { ConfigError } from './configError.js';
import { parse, printParseErrorCode, visit, type ParseErrorCode, type ParseError } from 'jsonc-parser';

export interface ParseErrorExtended {
  errorCode: ParseErrorCode;
  errorName: string;
  offset: number;
  length: number;
  line: number;
  column: number;
  content: string;
}

export const readConfigFile = async (path: string): Promise<Config> => {
  try {
    const validator = Compile(ConfigT);
    const raw = await readFile(path, 'utf-8');
    //const data = JSON.parse(raw);
    const errors: ParseError[] = [];
    const data = parse(raw, errors);
    if (errors.length > 0) {
      const errorsExtended: ParseErrorExtended[] = [];
      visit(raw, {
        onError: (error, offset, length, startLine, startCharacter) =>
          errorsExtended.push({
            errorCode: error,
            errorName: printParseErrorCode(error),
            offset,
            length,
            line: startLine + 1,
            column: startCharacter + 1,
            content: raw.split(/\r\n|\r|\n/)[startLine],
          }),
        onObjectBegin: () => {},
        onObjectProperty: () => {},
        onObjectEnd: () => {},
        onArrayBegin: () => {},
        onArrayEnd: () => {},
        onLiteralValue: () => {},
        onSeparator: () => {},
      });
      throw new ConfigError({
        message: 'The config file could not be parsed',
        path,
        type: 'parse-error',
        parseErrors: errorsExtended,
      });
    }
    if (validator.Check(data)) {
      return data;
    }
    throw new ConfigError({
      message: 'The config file does not match the expected structure',
      path,
      type: 'validation-error',
      validationErrors: validator.Errors(data),
    });
  } catch (err) {
    if (err instanceof ConfigError) {
      throw err;
    }
    if (err instanceof SyntaxError) {
      throw new ConfigError({
        message: 'The config file could not be parsed',
        path,
        type: 'parse-error',
        cause: err,
      });
    }
    if (err instanceof Error && 'code' in err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new ConfigError({
          message: 'The config file could not be found',
          path,
          type: 'file-ENOENT',
          cause: err,
        });
      } else if (code === 'EACCES') {
        throw new ConfigError({
          message: 'The config file could not be accessed because of missing permissions',
          path,
          type: 'file-EACCES',
          cause: err,
        });
      } else if (code === 'EISDIR') {
        throw new ConfigError({
          message: 'The provided config file path is a directory',
          path,
          type: 'file-EISDIR',
          cause: err,
        });
      }
    }
    throw new ConfigError({
      message: 'The config file could not be parsed for unknown reasons',
      path,
      type: 'unknown',
      cause: err as Error,
    });
  }
};
