import type { MeasurementXY } from 'cheminfo-types';

import type { ParseContext } from '../utility/ParseContext.ts';
import { createParseContext } from '../utility/ParseContext.ts';
import { readLatin1 } from '../utility/bytes.ts';
import { toLocalIsoDate } from '../utility/calendarDate.ts';
import { createEvenX } from '../utility/createEvenX.ts';

import { absorbanceAxis, buildVariables } from './buildVariables.ts';
import type { ShimadzuFlatHeader, UvProbeMeta } from './types.ts';

export interface UvProbeResult {
  meta: UvProbeMeta;
  spectra: MeasurementXY[];
}

const startingXOffset = 10;
const endingXOffset = 14;
const numberPointsOffset = 0x76;
const dataOffset = 0x78;
const timeOffset = 0x64;
const dateOffset = 0x6d;

/**
 * Parses the Shimadzu instrument "flat" `.spc` variant (UV-1600/1700/1800 class).
 *
 * The header is exactly 120 bytes: the wavelength range is two `float32` at
 * 0x0A (end) and 0x0E (start), the point count a `uint16` at 0x76, and the
 * `float32` ordinates start at 0x78. Layout reverse-engineered from sample files.
 * @param bytes - the whole file as bytes.
 * @param context - shared parse state (options and warnings).
 * @returns The spectrum and its metadata.
 */
export function parseUVProbeFlat(
  bytes: Uint8Array,
  context: ParseContext = createParseContext(),
): UvProbeResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const startingX = view.getFloat32(startingXOffset, true);
  const endingX = view.getFloat32(endingXOffset, true);
  const numberPoints = view.getUint16(numberPointsOffset, true);

  const y = new Float64Array(numberPoints);
  for (let i = 0; i < numberPoints; i++) {
    y[i] = view.getFloat32(dataOffset + i * 4, true);
  }
  const x = createEvenX(startingX, endingX, numberPoints);

  const date = readDate(bytes, context);
  const meta: UvProbeMeta = {
    kind: 'flat',
    numberPoints,
    ...(date !== undefined && { date }),
    properties: {},
    header: readHeader(view),
  };

  return {
    meta,
    spectra: [
      { meta, variables: buildVariables(x, y, absorbanceAxis, context.sortX) },
    ],
  };
}

/**
 * Detects the flat Shimadzu variant by its fixed header: `u16@2 == 2`, at
 * least 2 points, `size == 0x78 + 4n`, and `0 < x start < x end < 10000`.
 * @param bytes - the whole file as bytes.
 * @returns True when the bytes look like a Shimadzu flat file.
 */
export function isUVProbeFlat(bytes: Uint8Array): boolean {
  if (bytes.length < dataOffset) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numberPoints = view.getUint16(numberPointsOffset, true);
  const low = view.getFloat32(endingXOffset, true);
  const high = view.getFloat32(startingXOffset, true);
  return (
    view.getUint16(2, true) === 2 &&
    numberPoints >= 2 &&
    bytes.length === dataOffset + 4 * numberPoints &&
    low > 0 &&
    low < high &&
    high < 10000
  );
}

/**
 * Reads the date (`MM/DD/YY` at 0x6D) and time (`HH:MM:SS` or `HH:MM\\0SS`
 * at 0x64) of the header. Two-digit years below 70 are 20xx, others 19xx.
 * @param bytes - the whole file as bytes.
 * @param context - receives a warning when the date is invalid.
 * @returns Local ISO date string without time zone, or undefined when the
 * date is absent or invalid (a missing time gives midnight).
 */
function readDate(
  bytes: Uint8Array,
  context: ParseContext,
): string | undefined {
  const date =
    /^(?<month>\d\d)\/(?<day>\d\d)\/(?<year>\d\d)/.exec(
      readLatin1(bytes, dateOffset, 8),
    )?.groups ?? {};
  if (date.year === undefined) return undefined;
  const time =
    /^(?<hour>\d\d):(?<minute>\d\d)[:\0](?<second>\d\d)/.exec(
      readLatin1(bytes, timeOffset, 8),
    )?.groups ?? {};
  const { hour = '00', minute = '00', second = '00' } = time;
  const year = Number(date.year);
  const isoDate = toLocalIsoDate(
    {
      year: (year < 70 ? 2000 : 1900) + year,
      month: Number(date.month),
      day: Number(date.day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    },
    context.timeZone,
  );
  if (isoDate === undefined) {
    context.warn(
      `Shimadzu flat date "${date.month}/${date.day}/${date.year} ${hour}:${minute}:${second}" is invalid; ignored`,
    );
  }
  return isoDate;
}

/**
 * Reads the fixed numeric fields of the 120-byte header.
 * @param view - data view over the file.
 * @returns The header codes and display range.
 */
function readHeader(view: DataView): ShimadzuFlatHeader {
  return {
    familyFlags: view.getUint16(0, true),
    modeCode: view.getUint16(4, true),
    speedCode: view.getUint16(6, true),
    samplingCode: view.getUint16(8, true),
    displayMax: view.getFloat32(0x12, true),
    displayMin: view.getFloat32(0x16, true),
  };
}
