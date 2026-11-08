import type { ParseErrorExtended } from './readConfigFile.js';
import type { TLocalizedValidationError } from 'typebox/error';

export type ConfigErrorType =
  | 'file-ENOENT'
  | 'file-EACCES'
  | 'file-EISDIR'
  | 'parse-error'
  | 'validation-error'
  | 'unknown';

export interface ConfigErrorDetails {
  type: ConfigErrorType;
  message: string;
  validationErrors?: TLocalizedValidationError[];
  parseErrors?: ParseErrorExtended[];
  cause?: Error;
  path: string;
}

export class ConfigError extends Error {
  readonly type: ConfigErrorType;
  readonly path: string;
  readonly validationErrors?: TLocalizedValidationError[];
  readonly parseErrors?: ParseErrorExtended[];
  override readonly cause?: Error;

  constructor(details: ConfigErrorDetails) {
    super(details.message);
    this.name = 'ConfigError';
    this.type = details.type;
    this.path = details.path;
    this.validationErrors = details.validationErrors;
    this.parseErrors = details.parseErrors;
    this.cause = details.cause;
  }
}
