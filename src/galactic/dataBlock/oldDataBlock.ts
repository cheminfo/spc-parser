import type { MeasurementXY } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../../utility/ParseContext.ts';
import { createParseContext } from '../../utility/ParseContext.ts';
import { createEvenX } from '../../utility/createEvenX.ts';
import type { TheOldHeader } from '../fileHeader.ts';

import type { OldSubfile } from './oldSubfileLayout.ts';
import { getOldSubfileLayout, oldDataStart } from './oldSubfileLayout.ts';
import type { SpectrumMeta } from './shared.ts';
import { parseSubHeader, setXYAxis } from './shared.ts';
import type { YEncoding } from './subfileLayout.ts';
import { extractTrailingText, reportEncodingNotes } from './subfileLayout.ts';
import { applyZwAxes } from './zwAxes.ts';

const oldFloatNote =
  'Old-format subfile with exponent -128 read as float32 (undocumented in SPC.H)';

/**
 * Reads a file's data block (old SPC format). Sets `spectra` (the subfile
 * count) and, when bytes follow the last subfile, `trailingText` on the header.
 * @param buffer - spc buffer.
 * @param fileHeader - header.
 * @param context - shared parse state (options and warnings).
 * @returns Array containing the spectra.
 */
export function oldDataBlock(
  buffer: IOBuffer,
  fileHeader: TheOldHeader,
  context: ParseContext = createParseContext(),
): MeasurementXY[] {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
  const { numberPoints, subfiles, end, remainder } = getOldSubfileLayout(
    fileHeader,
    bytes,
  );
  const count = subfiles.length;
  fileHeader.spectra = count;

  // old format uses always equidistant arrays
  const x = createEvenX(fileHeader.startingX, fileHeader.endingX, numberPoints);

  const spectra: MeasurementXY[] = [];
  const reported = new Set<string>();
  const metas: SpectrumMeta[] = [];
  for (let i = 0; i < count; i++) {
    const { position, encoding } = subfiles[i] as OldSubfile;
    buffer.seek(position);
    const subFileHeader = parseSubHeader(buffer, context.encoding);
    if (encoding.isFloat) encoding.notes.push(oldFloatNote);
    reportEncodingNotes(encoding.notes, reported, context);
    const y = readOldY(buffer, numberPoints, encoding);
    const meta: SpectrumMeta = {
      ...subFileHeader,
      exponent: encoding.exponent,
      isFloat: encoding.isFloat,
      index: i,
    };
    metas.push(meta);
    const variables = setXYAxis(x, y, fileHeader, context.sortX);
    spectra.push({ meta, variables });
  }

  const layout = applyZwAxes(metas, { ...fileHeader, spectra: count }, context);
  if (layout.zSpacing) fileHeader.zSpacing = layout.zSpacing;

  if (remainder > 0) {
    fileHeader.trailingText = extractTrailingText(
      bytes.subarray(end),
      context.encoding,
    );
    const sizes = isUniform(subfiles)
      ? ` of ${(end - oldDataStart) / count} bytes`
      : '';
    context.warn(
      `${remainder} bytes after the ${count} complete subfiles${sizes} were ignored`,
    );
  }
  return spectra;
}

/**
 * Reads the Y values of an old-format subfile. 32-bit integers have their two
 * 16-bit words swapped (most significant word first).
 * @param buffer - SPC buffer, positioned on the Y values.
 * @param length - number of values.
 * @param encoding - how the values are stored.
 * @returns The Y values.
 */
function readOldY(
  buffer: IOBuffer,
  length: number,
  encoding: YEncoding,
): Float64Array {
  const y = new Float64Array(length);
  if (encoding.isFloat) {
    for (let i = 0; i < length; i++) {
      y[i] = buffer.readFloat32();
    }
    return y;
  }
  if (encoding.bytesPerY === 2) {
    const factor = 2 ** (encoding.exponent - 16);
    for (let i = 0; i < length; i++) {
      y[i] = buffer.readInt16() * factor;
    }
    return y;
  }
  const factor = 2 ** (encoding.exponent - 32);
  for (let i = 0; i < length; i++) {
    const high = buffer.readInt16();
    const low = buffer.readUint16();
    y[i] = (high * 65536 + low) * factor;
  }
  return y;
}

/**
 * Whether every subfile has the same size (the same Y value width).
 * @param subfiles - the complete subfiles.
 * @returns `true` when all subfiles use the same number of bytes per value.
 */
function isUniform(subfiles: OldSubfile[]): boolean {
  const first = (subfiles[0] as OldSubfile).encoding.bytesPerY;
  for (let i = 1; i < subfiles.length; i++) {
    if ((subfiles[i] as OldSubfile).encoding.bytesPerY !== first) return false;
  }
  return true;
}
