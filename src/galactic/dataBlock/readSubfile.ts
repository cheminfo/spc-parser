import type { MeasurementXYVariables } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

import type { TheNewHeader } from '../fileHeader.ts';

import { readFloat32Array, readY } from './readValues.ts';
import type { SpectrumMeta } from './shared.ts';
import { parseSubHeader, setXYAxis } from './shared.ts';
import { getYEncoding } from './subfileLayout.ts';

/**
 * Bytes of a subfile header.
 */
export const subHeaderLength = 32;

/**
 * Where a new-format subfile is and how it is laid out.
 */
export interface SubfileLocation {
  /**
   * Offset of the subfile header.
   */
  position: number;
  /**
   * Offset where the data area ends.
   */
  limit: number;
  /**
   * Main header.
   */
  fileHeader: TheNewHeader;
  /**
   * Each subfile carries its own X values.
   */
  hasOwnX: boolean;
  /**
   * X values shared by all subfiles (when not `hasOwnX`).
   */
  commonX: Float64Array | undefined;
  /**
   * Sort the spectrum by increasing X.
   */
  sortX: boolean;
  /**
   * Offset of the next subfile according to the directory, if any.
   * @default undefined
   */
  nextPosition?: number;
  /**
   * Fallback encoding of subheader text that is not UTF-8.
   * @default 'windows-1252'
   */
  textEncoding?: string;
}

/**
 * A subfile read from the file.
 */
export interface Subfile {
  /**
   * Metadata of the spectrum (`index` is set by the caller).
   */
  meta: SpectrumMeta;
  /**
   * X and Y variables of the spectrum.
   */
  variables: MeasurementXYVariables;
  /**
   * Offset after the subfile.
   */
  end: number;
  /**
   * Anomalies of the subfile, to report once per file.
   */
  notes: string[];
}

const halvedNote =
  'subnpts is twice the number of points stored in a subfile (as written by Wasatch ENLIGHTEN); half of it was used';

/**
 * Reads the new-format subfile starting at a position, when it fits.
 * @param buffer - SPC buffer.
 * @param location - where the subfile is and how it is laid out.
 * @returns The subfile, or `undefined` when it does not fit.
 */
export function readSubfile(
  buffer: IOBuffer,
  location: SubfileLocation,
): Subfile | undefined {
  const { position, limit, fileHeader, hasOwnX, commonX } = location;
  if (position + subHeaderLength > limit) return undefined;
  buffer.seek(position);
  const subHeader = parseSubHeader(buffer, location.textEncoding);
  const encoding = getYEncoding(
    subHeader.exponentY,
    fileHeader.exponentY,
    fileHeader.parameters,
  );
  const pointSize = (hasOwnX ? 4 : 0) + encoding.bytesPerY;
  let numberPoints = hasOwnX
    ? subHeader.numberPoints
    : (commonX as Float64Array).length;
  let end = position + subHeaderLength + pointSize * numberPoints;
  if (end > limit && hasOwnX && numberPoints % 2 === 0) {
    const halvedEnd =
      position + subHeaderLength + (pointSize * numberPoints) / 2;
    if (!isKnownBoundary(halvedEnd, location)) return undefined;
    numberPoints /= 2;
    end = halvedEnd;
    encoding.notes.push(halvedNote);
  }
  if (end > limit) return undefined;

  const x = hasOwnX
    ? readFloat32Array(buffer, numberPoints)
    : (commonX as Float64Array);
  const y = readY(buffer, numberPoints, encoding);
  const meta: SpectrumMeta = {
    ...subHeader,
    exponent: encoding.exponent,
    isFloat: encoding.isFloat,
    index: 0,
  };
  const variables = setXYAxis(x, y, fileHeader, location.sortX, hasOwnX);
  return { meta, variables, end, notes: encoding.notes };
}

/**
 * Whether a halved subfile ends exactly where something else is known to
 * start: the end of the data area, the log block or the next subfile.
 * @param end - offset where the halved subfile ends.
 * @param location - where the subfile is.
 * @returns `true` when the halved size is confirmed by the layout.
 */
function isKnownBoundary(end: number, location: SubfileLocation): boolean {
  const { limit, fileHeader, nextPosition } = location;
  return (
    end === limit ||
    (fileHeader.logOffset !== 0 && end === fileHeader.logOffset) ||
    end === nextPosition
  );
}
