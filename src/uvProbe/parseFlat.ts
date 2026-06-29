import type { MeasurementXY } from 'cheminfo-types';
import { createFromToArray } from 'ml-spectra-processing';

import { buildVariables } from './buildVariables.ts';
import type { UvProbeMeta } from './types.ts';

export interface UvProbeResult {
  meta: UvProbeMeta;
  spectra: MeasurementXY[];
}

const startingXOffset = 10;
const endingXOffset = 14;

/**
 * Parses the flat (raw single-spectrum) Shimadzu UVProbe `.spc` variant.
 *
 * The header is proprietary; the point count is a `uint16` stored immediately
 * before the `float32` absorbance block, and the wavelength range is two
 * `float32` near the start of the file. Layout reverse-engineered from sample files.
 * @param bytes - the whole file as bytes.
 * @returns The spectrum and its metadata.
 */
export function parseUVProbeFlat(bytes: Uint8Array): UvProbeResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const startingX = view.getFloat32(startingXOffset, true);
  const endingX = view.getFloat32(endingXOffset, true);

  const located = findData(view, bytes.length);
  if (!located) {
    throw new Error('UVProbe flat: could not locate the data block');
  }
  const { numberPoints, dataStart } = located;

  const y = new Float64Array(numberPoints);
  for (let i = 0; i < numberPoints; i++) {
    y[i] = view.getFloat32(dataStart + i * 4, true);
  }
  const rawX = createFromToArray({
    from: startingX,
    to: endingX,
    length: numberPoints,
  });
  const x = rawX instanceof Float64Array ? rawX : Float64Array.from(rawX);

  const meta: UvProbeMeta = {
    kind: 'flat',
    numberPoints,
    date: readDate(bytes),
    properties: {},
  };

  return { meta, spectra: [{ meta, variables: buildVariables(x, y) }] };
}

/**
 * Detects the flat UVProbe variant by its structural signature: a locatable
 * data block whose point count exactly fills the file (see {@link findData}).
 * @param bytes - the whole file as bytes.
 * @returns True when the bytes look like a UVProbe flat file.
 */
export function isUVProbeFlat(bytes: Uint8Array): boolean {
  if (bytes.length < endingXOffset + 4) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return findData(view, bytes.length) !== null;
}

/**
 * Finds the point count and start of the data block.
 *
 * The count is the `uint16` `n` for which the remaining `n` `float32` values
 * fill the file exactly: `offset + 2 + n * 4 === fileLength`.
 * @param view - data view over the whole file.
 * @param fileLength - total file length in bytes.
 * @returns The number of points and the byte offset, or null when not found.
 */
function findData(
  view: DataView,
  fileLength: number,
): { numberPoints: number; dataStart: number } | null {
  for (let offset = 2; offset < 300; offset++) {
    const numberPoints = view.getUint16(offset, true);
    if (numberPoints > 1 && offset + 2 + numberPoints * 4 === fileLength) {
      return { numberPoints, dataStart: offset + 2 };
    }
  }
  return null;
}

/**
 * Reads the `MM/DD/YY` date and `HH:MM:SS` time from the header.
 * @param bytes - the whole file as bytes.
 * @returns ISO date string, or undefined when not found.
 */
function readDate(bytes: Uint8Array): string | undefined {
  let header = '';
  for (const byte of bytes.subarray(0, 256)) {
    header += String.fromCodePoint(byte);
  }
  const date = /(?<month>\d{2})\/(?<day>\d{2})\/(?<year>\d{2})/.exec(header);
  const time = /(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})/.exec(header);
  if (!date?.groups) return undefined;
  const { month, day, year } = date.groups;
  const t = time?.groups ?? { hour: '00', minute: '00', second: '00' };
  return `20${year}-${month}-${day}T${t.hour}:${t.minute}:${t.second}.000Z`;
}
