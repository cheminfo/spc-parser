import type { MeasurementXY } from 'cheminfo-types';

import { toLocalIsoDate } from '../utility/calendarDate.ts';

import type { TheNewHeader } from './fileHeader.ts';
import type { LogBlock } from './logBlock.ts';

/**
 * Returns the value of the first log entry whose key matches, ignoring case
 * (log keys are not case sensitive).
 * @param logs - the log block of a parse result.
 * @param key - the key to look for.
 * @returns The value, or `undefined` when the key is absent.
 */
export function getLogValue(
  logs: LogBlock | null | undefined,
  key: string,
): string | undefined {
  if (!logs) return undefined;
  const wanted = key.toLowerCase();
  for (const entry of logs.entries) {
    if (entry.key.toLowerCase() === wanted) return entry.value;
  }
  return undefined;
}

const subfileKeyPattern = /^SUBFILE(?<index>\d+)$/i;
const subfileValuePattern =
  /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{2}|\d{4}),\s*(?<hour>\d{1,2}):(?<minute>\d{1,2})(?::(?<second>\d{1,2}))?\s*(?:,\s*"?(?<label>.*?)"?)?$/;

/**
 * Applies the log content that belongs to the spectra: the per-subfile
 * `SUBFILEx = date, time, "label"` keys set `meta.date` and `meta.title` of
 * spectrum `x` (1-based), and the NMR imaginary part is decoded.
 * @param logs - the log block (updated with `imaginary`).
 * @param header - the main header.
 * @param spectra - the spectra (their `meta` is updated).
 * @param isSortedX - whether the spectra were sorted by increasing X, so that
 * the imaginary part of a decreasing-X spectrum is reversed like `y`.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 */
export function applyLogMetadata(
  logs: LogBlock | null,
  header: TheNewHeader,
  spectra: MeasurementXY[],
  isSortedX = true,
  timeZone?: string,
): void {
  if (!logs) return;
  for (const { key, value } of logs.entries) {
    const index = subfileKeyPattern.exec(key)?.groups?.index;
    if (index === undefined) continue;
    const meta = spectra[Number(index) - 1]?.meta;
    if (!meta) continue;
    const groups = subfileValuePattern.exec(value)?.groups;
    if (!groups) continue;
    const date = subfileDate(groups, timeZone);
    if (date !== undefined) meta.date = date;
    const title = groups.label?.trim();
    if (title) meta.title = title;
  }
  const imaginary = getImaginary(logs, header, spectra);
  if (!imaginary) return;
  if (isSortedX && header.xDirection === 'decreasing') imaginary.reverse();
  logs.imaginary = imaginary;
}

/**
 * Decodes the NMR imaginary part stored as float32 in the log binary area.
 * @param logs - the log block.
 * @param header - the main header (experiment type and byte order).
 * @param spectra - the spectra (a single one is expected).
 * @returns The imaginary values in file order, or `undefined`.
 */
function getImaginary(
  logs: LogBlock,
  header: TheNewHeader,
  spectra: MeasurementXY[],
): Float64Array | undefined {
  const spectrum = spectra[0];
  if (spectra.length !== 1 || !spectrum) return undefined;
  const length = spectrum.variables.y.data.length;
  const { binary } = logs;
  if (length === 0 || binary.length !== 4 * length) return undefined;
  const isNmr =
    /NMR/i.test(header.experimentType) ||
    getLogValue(logs, 'NMREND') !== undefined;
  if (!isNmr || getLogValue(logs, 'SPC_REAL')?.toUpperCase() === 'TRUE') {
    return undefined;
  }
  const isLittleEndian = header.fileVersion !== 0x4c;
  const view = new DataView(binary.buffer, binary.byteOffset, binary.length);
  const imaginary = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    imaginary[i] = view.getFloat32(i * 4, isLittleEndian);
  }
  return imaginary;
}

/**
 * Builds an ISO date from the groups of a `SUBFILEx` value.
 * @param groups - named groups of the value pattern.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns The ISO date, or `undefined` when invalid.
 */
function subfileDate(
  groups: Record<string, string | undefined>,
  timeZone?: string,
): string | undefined {
  let year = Number(groups.year);
  if (groups.year?.length === 2) year += year < 70 ? 2000 : 1900;
  return toLocalIsoDate(
    {
      year,
      month: Number(groups.month),
      day: Number(groups.day),
      hour: Number(groups.hour),
      minute: Number(groups.minute),
      second: Number(groups.second ?? 0),
    },
    timeZone,
  );
}
