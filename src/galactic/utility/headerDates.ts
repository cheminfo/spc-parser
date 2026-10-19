import {
  formatUtcDate,
  formatWallClock,
  isValidDate,
} from '../../utility/calendarDate.ts';

/**
 * Layout a header date was decoded with.
 * - `spec`: the packed layout of the SPC specification (local time).
 * - `labspec`: the specification layout with years since 1900 and a
 * zero-based month, written by Horiba LabSpec (local time).
 * - `msdos`: an MS-DOS date/time with a zero-based month, written by Renishaw
 * WiRE (UTC).
 * - `unix`: seconds since 1970 (UTC).
 * - `old`: the separate year/month/day/hour/minute fields of the old format
 * (local time).
 */
export type DateLayout = 'spec' | 'labspec' | 'msdos' | 'unix' | 'old';

/**
 * A decoded header date.
 */
export interface DecodedDate {
  /**
   * ISO 8601 date. Ends with `Z` only for the UTC layouts (`msdos`, `unix`).
   * Undefined when the file has no date or an invalid one.
   * @default undefined
   */
  date?: string;
  /**
   * Layout the date was decoded with, undefined when no date was decoded.
   * @default undefined
   */
  layout?: DateLayout;
}

const firstUnixDate = Date.UTC(1985, 0, 1) / 1000;
const lastUnixDate = Date.UTC(2031, 0, 1) / 1000;

/**
 * Decodes the packed `fdate` DWORD of a new-format header. The layouts are
 * tried in order: specification (year 1980 to 2100), Horiba LabSpec (years
 * since 1900 in 70 to 299, zero-based month), MS-DOS as written by Renishaw
 * WiRE (zero-based month) and finally a Unix timestamp between 1985 and 2030.
 * @param value - the `fdate` DWORD.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns The date and its layout; both undefined when no layout fits.
 */
export function decodeFdate(value: number, timeZone?: string): DecodedDate {
  if (value === 0) return {};
  const year = value >>> 20;
  const packed = {
    month: (value >>> 16) & 0x0f,
    day: (value >>> 11) & 0x1f,
    hour: (value >>> 6) & 0x1f,
    minute: value & 0x3f,
    second: 0,
  };
  if (year >= 1980 && year <= 2100) {
    const fields = { ...packed, year };
    if (isValidDate(fields)) {
      return { date: formatWallClock(fields, timeZone), layout: 'spec' };
    }
  }
  if (year >= 70 && year <= 299) {
    const fields = { ...packed, year: year + 1900, month: packed.month + 1 };
    if (isValidDate(fields)) {
      return { date: formatWallClock(fields, timeZone), layout: 'labspec' };
    }
  }
  const dos = {
    year: 1980 + (value >>> 25),
    month: ((value >>> 21) & 0x0f) + 1,
    day: (value >>> 16) & 0x1f,
    hour: (value >>> 11) & 0x1f,
    minute: (value >>> 5) & 0x3f,
    second: (value & 0x1f) * 2,
  };
  // WiRE writes this field in UTC: the log block of raman-caco3.spc reports
  // the same instant as a local time two hours later. So it is already an
  // instant and the `timeZone` option must not shift it.
  if (isValidDate(dos)) return { date: formatUtcDate(dos), layout: 'msdos' };
  if (value >= firstUnixDate && value < lastUnixDate) {
    return { date: new Date(value * 1000).toISOString(), layout: 'unix' };
  }
  return {};
}

/**
 * Decodes the date of an old-format header. The low 12 bits of `oyear` hold
 * the year (0 means no date): 2-digit years below 70 are 20xx, and other years
 * below 1900 are counted from 1900.
 * @param oyear - the `oyear` WORD (its high 4 bits are the Z unit code).
 * @param month - `omonth`, 1-based.
 * @param day - `oday`.
 * @param hour - `ohour`.
 * @param minute - `ominute`.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns The date and its layout; both undefined when absent or invalid.
 */
export function decodeOldDate(
  oyear: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone?: string,
): DecodedDate {
  let year = oyear & 0x0fff;
  if (year === 0) return {};
  if (year < 70) year += 2000;
  else if (year < 1900) year += 1900;
  const fields = { year, month, day, hour, minute, second: 0 };
  if (!isValidDate(fields)) return {};
  return { date: formatWallClock(fields, timeZone), layout: 'old' };
}
