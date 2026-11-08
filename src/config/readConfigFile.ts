import { type Config, ConfigT } from './config.js';
import { type ParseError, type ParseErrorCode, parse, printParseErrorCode, visit } from 'jsonc-parser';
import Compile from 'typebox/compile';
import { ConfigError } from './configError.js';
import { readFile } from 'fs/promises';

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
    const data = parse(raw, errors, { allowTrailingComma: true });
    if (errors.length > 0) {
      const errorsExtended: ParseErrorExtended[] = [];
      visit(raw, {
        onArrayBegin: () => {},
        onArrayEnd: () => {},
        onError: (error, offset, length, startLine, startCharacter) =>
          errorsExtended.push({
            column: startCharacter + 1,
            content: raw.split(/\r\n|\r|\n/)[startLine],
            errorCode: error,
            errorName: printParseErrorCode(error),
            length,
            line: startLine + 1,
            offset,
          }),
        onLiteralValue: () => {},
        onObjectBegin: () => {},
        onObjectEnd: () => {},
        onObjectProperty: () => {},
        onSeparator: () => {},
      });
      throw new ConfigError({
        message: 'The config file could not be parsed',
        parseErrors: errorsExtended,
        path,
        type: 'parse-error',
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
        cause: err,
        message: 'The config file could not be parsed',
        path,
        type: 'parse-error',
      });
    }
    if (err instanceof Error && 'code' in err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new ConfigError({
          cause: err,
          message: 'The config file could not be found',
          path,
          type: 'file-ENOENT',
        });
      } else if (code === 'EACCES') {
        throw new ConfigError({
          cause: err,
          message: 'The config file could not be accessed because of missing permissions',
          path,
          type: 'file-EACCES',
        });
      } else if (code === 'EISDIR') {
        throw new ConfigError({
          cause: err,
          message: 'The provided config file path is a directory',
          path,
          type: 'file-EISDIR',
        });
      }
    }
    throw new ConfigError({
      cause: err as Error,
      message: 'The config file could not be parsed for unknown reasons',
      path,
      type: 'unknown',
    });
  }
};
