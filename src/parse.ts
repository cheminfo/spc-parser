import type { MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';

import { identifyForeign } from './detect/identifyForeign.ts';
import { isGalactic } from './detect/isGalactic.ts';
import type { Header } from './galactic/fileHeader.ts';
import type { LogBlock } from './galactic/logBlock.ts';
import { parseGalactic } from './galactic/parse.ts';
import { PEPE_SIGNATURE } from './perkinElmer/constants.ts';
import {
  isPerkinElmerAscii,
  parsePerkinElmerAscii,
} from './perkinElmer/parseAscii.ts';
import { parsePerkinElmerBinary } from './perkinElmer/parseBinary.ts';
import type { PerkinElmerMeta } from './perkinElmer/types.ts';
import type { ParseContext, ParseOptions } from './utility/ParseContext.ts';
import { createParseContext } from './utility/ParseContext.ts';
import { SpcParserError } from './utility/SpcParserError.ts';
import { hasSignature } from './utility/bytes.ts';
import { warnNaiveDate } from './utility/naiveDate.ts';
import { isUVProbeFlat, parseUVProbeFlat } from './uvProbe/parseFlat.ts';
import { parseUVProbeOle } from './uvProbe/parseOle.ts';
import type { UvProbeMeta } from './uvProbe/types.ts';

export type { ParseOptions } from './utility/ParseContext.ts';
export type { SpcParserErrorCode } from './utility/SpcParserError.ts';
export { SpcParserError } from './utility/SpcParserError.ts';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

/**
 * What `parse` returns.
 */
export interface ParseResult {
  /**
   * File-level metadata: the Galactic header, the UVProbe metadata, or the
   * PerkinElmer metadata.
   */
  meta: Header | UvProbeMeta | PerkinElmerMeta;
  /**
   * The spectra of the file, in file order.
   */
  spectra: MeasurementXY[];
  /**
   * Galactic log block, `null` when the file has none. Absent for UVProbe and
   * PerkinElmer files.
   * @default undefined
   */
  logs?: LogBlock | null;
  /**
   * Non-fatal anomalies (truncation, clamped log, inconsistent header, ...).
   * Always present.
   */
  warnings: string[];
}

/**
 * OLE2 / Microsoft Compound File Binary magic number.
 */
const oleMagic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/**
 * Parses an SPC file, auto-detecting the format: Thermo Galactic GRAMS SPC,
 * Shimadzu UVProbe (OLE2 or flat) `.spc`, or PerkinElmer `.sp` (binary or
 * ASCII).
 * @param buffer - SPC file buffer.
 * @param options - parsing options.
 * @returns JSON-like object with the spectra and metadata of the file.
 * @throws {SpcParserError} With code `UNSUPPORTED_FORMAT` when the format is not
 * recognised (the message names known foreign formats, and a file shorter
 * than 32 bytes is never recognised), or `TRUNCATED` when a Galactic file
 * (at least 32 bytes) ends before the data its header announces, a PerkinElmer
 * block runs past the end of the file, or a PerkinElmer ASCII file has no
 * `#GR` or `#DATA` section.
 * @throws {TypeError} When `options.encoding` is not a supported encoding.
 */
export function parse(
  buffer: InputData,
  options: ParseOptions = {},
): ParseResult {
  const context = createParseContext(options);
  const bytes = toBytes(buffer);

  if (hasSignature(bytes, oleMagic)) {
    return finish(parseUVProbeOle(bytes, context), context);
  }
  if (isGalactic(bytes)) {
    return finish(parseGalactic(new IOBuffer(bytes), context), context);
  }
  if (hasSignature(bytes, PEPE_SIGNATURE)) {
    return finish(parsePerkinElmerBinary(bytes, context), context);
  }
  if (isPerkinElmerAscii(bytes)) {
    return finish(parsePerkinElmerAscii(bytes, context), context);
  }
  if (isUVProbeFlat(bytes)) {
    return finish(parseUVProbeFlat(bytes, context), context);
  }
  const foreign = identifyForeign(bytes);
  throw new SpcParserError(
    'UNSUPPORTED_FORMAT',
    foreign
      ? `Unsupported SPC file: detected ${foreign}`
      : 'Unsupported SPC file: not an OLE2 compound document, a Thermo Galactic SPC, a Shimadzu UVProbe flat file, or a PerkinElmer SP file (headerless data such as a Bruker EPR .spc cannot be identified)',
  );
}

/**
 * Attaches the warnings to a parsed file, after reporting dates that name no
 * instant.
 * @param result - what the format reader produced.
 * @param context - shared parse state.
 * @returns The complete result.
 */
function finish(
  result: Omit<ParseResult, 'warnings'>,
  context: ParseContext,
): ParseResult {
  warnNaiveDate(result, context);
  return { ...result, warnings: context.warnings };
}

/**
 * Normalizes any accepted input into a `Uint8Array` view over its bytes.
 * @param buffer - the input data.
 * @returns A `Uint8Array` over the same bytes.
 */
function toBytes(buffer: InputData): Uint8Array {
  if (buffer instanceof IOBuffer) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer);
}
