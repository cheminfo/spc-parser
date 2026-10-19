/**
 * Machine-readable category of a {@link SpcParserError}.
 * - `UNSUPPORTED_FORMAT`: the bytes are not a supported SPC variant.
 * - `TRUNCATED`: the file ends before the data its header announces.
 * - `STRICT`: an anomaly was found while parsing with `strict: true`.
 */
export type SpcParserErrorCode = 'UNSUPPORTED_FORMAT' | 'TRUNCATED' | 'STRICT';

/**
 * Error thrown by `parse` for files it cannot (or, in strict mode, will not) read.
 */
export class SpcParserError extends Error {
  /**
   * Category of the failure.
   */
  readonly code: SpcParserErrorCode;

  /**
   * Creates a typed parser error.
   * @param code - category of the failure.
   * @param message - human-readable description.
   */
  constructor(code: SpcParserErrorCode, message: string) {
    super(message);
    this.name = 'SpcParserError';
    this.code = code;
  }
}
