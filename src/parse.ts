import type { MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';

import type { Header } from './galactic/fileHeader.ts';
import type { LogBlock } from './galactic/logBlock.ts';
import { parseGalactic } from './galactic/parse.ts';
import { isUVProbeFlat, parseUVProbeFlat } from './uvProbe/parseFlat.ts';
import { parseUVProbeOle } from './uvProbe/parseOle.ts';
import type { UvProbeMeta } from './uvProbe/types.ts';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

export interface ParseResult {
  meta: Header | UvProbeMeta;
  spectra: MeasurementXY[];
  logs?: LogBlock | null;
}

/** OLE2 / Microsoft Compound File Binary magic number. */
const oleMagic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const galacticVersions = new Set([0x4b, 0x4c, 0x4d]);

/**
 * Parses an SPC file, auto-detecting the format:
 * Thermo Galactic GRAMS SPC, or Shimadzu UVProbe (OLE2 or flat) `.spc`.
 * @param buffer - SPC file buffer.
 * @returns JSON-like object with the spectra and metadata of the file.
 */
export function parse(buffer: InputData): ParseResult {
  const bytes = toBytes(buffer);

  if (isOle(bytes)) {
    return parseUVProbeOle(bytes);
  }
  if (galacticVersions.has(bytes[1])) {
    return parseGalactic(new IOBuffer(bytes));
  }
  if (isUVProbeFlat(bytes)) {
    return parseUVProbeFlat(bytes);
  }
  throw new Error(
    'Unsupported SPC file: not an OLE2 compound document, a Thermo Galactic SPC, or a Shimadzu UVProbe flat file',
  );
}

/**
 * Checks for the OLE2 compound-file magic number.
 * @param bytes - file bytes.
 * @returns True when the file is an OLE2 compound document.
 */
function isOle(bytes: Uint8Array): boolean {
  if (bytes.length < oleMagic.length) return false;
  for (let i = 0; i < oleMagic.length; i++) {
    if (bytes[i] !== oleMagic[i]) return false;
  }
  return true;
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
