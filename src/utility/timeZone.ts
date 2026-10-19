import type { DateFields } from './calendarDate.ts';

/**
 * A fixed UTC offset, as accepted by the `timeZone` option.
 */
const fixedOffset = /^(?<sign>[+-])(?<hour>\d\d):?(?<minute>\d\d)$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Checks that a `timeZone` option can be resolved.
 * @param timeZone - IANA name (`'Europe/Zurich'`), fixed offset (`'+01:00'`),
 * or `'UTC'`.
 * @throws {TypeError} When the zone is not supported by the runtime.
 */
export function validateTimeZone(timeZone: string): void {
  if (fixedOffset.test(timeZone)) return;
  try {
    getFormatter(timeZone);
  } catch (error) {
    throw new TypeError(`Unsupported timeZone option: "${timeZone}"`, {
      cause: error,
    });
  }
}

/**
 * Formats wall-clock fields as an ISO string carrying the offset that the zone
 * was at that moment, so the instant is the same for every reader.
 *
 * The file records what the operator's clock read and never the offset, so the
 * offset has to come from the caller. Around a daylight-saving change a wall
 * clock is ambiguous (it reads twice) or impossible (it never reads); the two
 * passes below always settle, taking the offset after the change for an
 * ambiguous reading and the one before it for a reading that never happened.
 * @param fields - the calendar fields, as written by the instrument.
 * @param timeZone - IANA name, fixed offset, or `'UTC'`.
 * @returns `YYYY-MM-DDTHH:MM:SS.000±HH:MM`, or with `Z` for a zero offset.
 */
export function formatZonedDate(fields: DateFields, timeZone: string): string {
  const wallClock = fieldsAsUtc(fields);
  const guess = offsetMinutes(wallClock, timeZone);
  const offset = offsetMinutes(wallClock - guess * 60_000, timeZone);
  return `${isoWithoutZone(wallClock)}${offsetSuffix(offset)}`;
}

/**
 * Offset of a zone at one instant, in minutes east of UTC.
 * @param instant - milliseconds since the epoch.
 * @param timeZone - IANA name, fixed offset, or `'UTC'`.
 * @returns The offset in minutes.
 */
function offsetMinutes(instant: number, timeZone: string): number {
  const fixed = fixedOffset.exec(timeZone);
  if (fixed?.groups) {
    const { sign, hour, minute } = fixed.groups;
    const magnitude = Number(hour) * 60 + Number(minute);
    return sign === '-' ? -magnitude : magnitude;
  }
  const parts = getFormatter(timeZone).formatToParts(instant);
  const read: Record<string, number> = {};
  for (const { type, value } of parts) {
    if (type !== 'literal') read[type] = Number(value);
  }
  const asUtc = Date.UTC(
    read.year ?? 0,
    (read.month ?? 1) - 1,
    read.day ?? 1,
    read.hour ?? 0,
    read.minute ?? 0,
    read.second ?? 0,
  );
  return Math.round((asUtc - instant) / 60_000);
}

/**
 * The formatter of a zone, built once per zone.
 * @param timeZone - IANA name or `'UTC'`.
 * @returns A formatter reading the zone's wall clock.
 */
function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Reads the fields as if they were UTC, which is the wall clock as a number.
 * @param fields - the calendar fields.
 * @returns Milliseconds since the epoch.
 */
function fieldsAsUtc(fields: DateFields): number {
  const { year, month, day, hour, minute, second } = fields;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

/**
 * Formats an instant as an ISO string with the zone designator removed.
 * @param instant - milliseconds since the epoch.
 * @returns `YYYY-MM-DDTHH:MM:SS.000`.
 */
function isoWithoutZone(instant: number): string {
  return new Date(instant).toISOString().slice(0, -1);
}

/**
 * Formats an offset as an ISO designator.
 * @param minutes - offset in minutes east of UTC.
 * @returns `Z` for zero, otherwise `±HH:MM`.
 */
function offsetSuffix(minutes: number): string {
  if (minutes === 0) return 'Z';
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hour = String(Math.trunc(absolute / 60)).padStart(2, '0');
  const minute = String(absolute % 60).padStart(2, '0');
  return `${sign}${hour}:${minute}`;
}
