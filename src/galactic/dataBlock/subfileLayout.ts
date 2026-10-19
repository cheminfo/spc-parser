import type { ParseContext } from '../../utility/ParseContext.ts';
import { decodeText } from '../../utility/decodeText.ts';
import type { FlagParameters } from '../utility/headerUtilities.ts';

/**
 * How the Y values of one subfile are stored.
 */
export interface YEncoding {
  /**
   * Exponent actually used (`-128` for float values).
   */
  exponent: number;
  /**
   * Y values are IEEE float32.
   */
  isFloat: boolean;
  /**
   * Bytes used by one Y value.
   */
  bytesPerY: 2 | 4;
  /**
   * Anomalies of the encoding, to report once per file.
   */
  notes: string[];
}

/**
 * Decides how the Y values of a subfile are encoded (SPC.H: the subfile
 * exponent is used only in multifiles, where 0 is a real exponent; `-128`
 * means float32, for which the 16-bit flag does not apply).
 * @param subExponent - `subexp` of the subfile header.
 * @param fileExponent - `fexp` (new format) or `oexp` (old format).
 * @param parameters - file flags.
 * @returns The exponent, whether values are floats, their size and anomalies.
 */
export function getYEncoding(
  subExponent: number,
  fileExponent: number,
  parameters: FlagParameters,
): YEncoding {
  const notes: string[] = [];
  let exponent = parameters.multiFile ? subExponent : fileExponent;
  if (parameters.multiFile && fileExponent === -128 && subExponent !== -128) {
    exponent = -128;
    notes.push(
      'The file exponent is -128 (float) but a subfile exponent is not; its values are read as float32',
    );
  }
  const isFloat = exponent === -128;
  if (isFloat && parameters.y16BitPrecision) {
    notes.push(
      'The 16-bit flag (TSPREC) is set for float32 values; it is ignored',
    );
  }
  return {
    exponent,
    isFloat,
    bytesPerY: isFloat || !parameters.y16BitPrecision ? 4 : 2,
    notes,
  };
}

/**
 * Reports each anomaly of an encoding, once per file.
 * @param notes - anomalies of one subfile encoding.
 * @param reported - anomalies already reported for this file.
 * @param context - receives the warnings.
 */
export function reportEncodingNotes(
  notes: string[],
  reported: Set<string>,
  context: ParseContext,
): void {
  for (const note of notes) {
    if (reported.has(note)) continue;
    reported.add(note);
    context.warn(note);
  }
}

/**
 * Number of subfiles announced by a new-format header.
 * @param spectra - `fnsub`.
 * @param isMultiFile - the TMULTI flag.
 * @param context - receives the warnings.
 * @returns The count, or `undefined` when it must be inferred from the size.
 */
export function getNewSubfileCount(
  spectra: number,
  isMultiFile: boolean,
  context: ParseContext,
): number | undefined {
  if (!isMultiFile) {
    if (spectra > 1) {
      context.warn(
        `fnsub is ${spectra} but the multifile flag (TMULTI) is not set; only one subfile read`,
      );
    }
    return 1;
  }
  if (spectra === 0) {
    context.warn(
      'fnsub is 0 in a multifile; the number of subfiles is inferred from the file size',
    );
    return undefined;
  }
  return spectra;
}

/**
 * Extracts the readable strings (4 or more printable characters between NUL
 * bytes) of a block that follows the data, as written by some libraries.
 * @param bytes - the trailing bytes (read in place, not copied).
 * @param encoding - fallback encoding for text that is not UTF-8.
 * @returns The strings, in file order.
 */
export function extractTrailingText(
  bytes: Uint8Array,
  encoding: string,
): string[] {
  const strings: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = bytes.indexOf(0, start);
    if (end === -1) end = bytes.length;
    if (end - start >= 4 && isPrintable(bytes, start, end)) {
      const text = decodeText(bytes.subarray(start, end), { encoding });
      if (text.length >= 4) strings.push(text);
    }
    start = end + 1;
  }
  return strings;
}

/**
 * Checks that a byte range holds only printable text.
 * @param bytes - the bytes.
 * @param start - first index.
 * @param end - index after the last one.
 * @returns True when every byte is printable (or a tab).
 */
function isPrintable(bytes: Uint8Array, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    const byte = bytes[i] as number;
    if ((byte < 0x20 && byte !== 0x09) || byte === 0x7f) return false;
  }
  return true;
}
