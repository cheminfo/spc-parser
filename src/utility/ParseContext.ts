import type { LightLogger } from 'cheminfo-types';

import { SpcParserError } from './SpcParserError.ts';
import { getFallbackDecoder } from './decodeText.ts';
import { validateTimeZone } from './timeZone.ts';

/**
 * Options accepted by `parse`.
 */
export interface ParseOptions {
  /**
   * Encoding used for header, log and UVProbe text that is not valid UTF-8
   * (e.g. `'gbk'`, `'shift_jis'`).
   * @default 'windows-1252'
   */
  encoding?: string;
  /**
   * Throw a `SpcParserError` with code `STRICT` on anomalies that are otherwise
   * only reported in `warnings`.
   * @default false
   */
  strict?: boolean;
  /**
   * Return each spectrum sorted by increasing X. With `false`, the file order
   * is kept.
   * @default true
   */
  sortX?: boolean;
  /**
   * Zone the instrument's clock was set to, as an IANA name
   * (`'Europe/Zurich'`), a fixed offset (`'+01:00'`) or `'UTC'`.
   *
   * An SPC file records the wall clock the operator saw and never its offset,
   * so without this option a decoded date names no instant: it is read as the
   * reader's own local time, which differs between a lab machine and a UTC
   * server. Naming the lab's zone makes every date an instant that is the same
   * everywhere. The `unix` layout is already an instant and is never shifted.
   * @default undefined
   */
  timeZone?: string;
  /**
   * Where anomalies are reported as they are found, in addition to
   * `warnings`. Any `cheminfo-types` `LightLogger` fits, including `console`
   * and a `FifoLogger`.
   * @default undefined
   */
  logger?: LightLogger;
}

/**
 * State shared by every reader during one `parse` call.
 */
export interface ParseContext {
  /**
   * Non-fatal anomalies collected so far.
   */
  warnings: string[];
  /**
   * Whether anomalies throw instead of being collected.
   */
  strict: boolean;
  /**
   * Fallback encoding for text that is not valid UTF-8.
   */
  encoding: string;
  /**
   * Whether spectra are sorted by increasing X.
   */
  sortX: boolean;
  /**
   * Zone the instrument's clock was set to, or undefined when the caller did
   * not name one.
   */
  timeZone?: string;
  /**
   * Reports an anomaly: records it, or throws in strict mode.
   * @param message - description of the anomaly.
   */
  warn: (message: string) => void;
}

/**
 * Creates the parse context for one `parse` call.
 * @param options - the options given to `parse`.
 * @returns A fresh context with an empty warning list.
 * @throws {TypeError} When `options.encoding` is not a supported encoding, or
 * `options.timeZone` is not a supported zone.
 */
export function createParseContext(options: ParseOptions = {}): ParseContext {
  const {
    encoding = 'windows-1252',
    strict = false,
    sortX = true,
    timeZone,
    logger,
  } = options;
  try {
    getFallbackDecoder(encoding);
  } catch (error) {
    throw new TypeError(`Unsupported encoding option: "${encoding}"`, {
      cause: error,
    });
  }
  if (timeZone !== undefined) validateTimeZone(timeZone);
  const warnings: string[] = [];
  return {
    warnings,
    strict,
    encoding,
    sortX,
    timeZone,
    warn(message: string) {
      logger?.warn(message);
      if (strict) throw new SpcParserError('STRICT', message);
      warnings.push(message);
    },
  };
}
