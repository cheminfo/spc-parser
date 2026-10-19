import { formatZonedDate } from './timeZone.ts';

/**
 * Calendar fields of a date (1-based month).
 */
export interface DateFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Formats calendar fields as an ISO string, as used for every date whose
 * writer recorded a wall clock and no offset.
 * @param fields - the calendar fields.
 * @param timeZone - zone the instrument's clock was set to, from the
 * `timeZone` option. Without it the result carries no offset and therefore
 * names no instant.
 * @returns `YYYY-MM-DDTHH:MM:SS.000`, with an offset when `timeZone` is given,
 * or undefined when the fields do not describe an existing date and time.
 */
export function toLocalIsoDate(
  fields: DateFields,
  timeZone?: string,
): string | undefined {
  return isValidDate(fields) ? formatWallClock(fields, timeZone) : undefined;
}

/**
 * Formats fields that are a wall-clock reading: zoned when the caller named
 * the zone, otherwise offset-less.
 * @param fields - the calendar fields.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns `YYYY-MM-DDTHH:MM:SS.000`, with an offset when `timeZone` is given.
 */
export function formatWallClock(fields: DateFields, timeZone?: string): string {
  return timeZone === undefined
    ? formatLocalDate(fields)
    : formatZonedDate(fields, timeZone);
}

/**
 * Checks that the fields describe an existing calendar date and time.
 * @param fields - the calendar fields.
 * @returns True when the date exists.
 */
export function isValidDate(fields: DateFields): boolean {
  const { year, month, day, hour, minute, second } = fields;
  const isDateInRange = month >= 1 && month <= 12 && day >= 1 && day <= 31;
  const isTimeInRange =
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59;
  return (
    isDateInRange &&
    isTimeInRange &&
    new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day
  );
}

/**
 * Formats the fields as an ISO string without a time zone.
 * @param fields - the calendar fields.
 * @returns `YYYY-MM-DDTHH:MM:SS.000`.
 */
export function formatLocalDate(fields: DateFields): string {
  return formatUtcDate(fields).slice(0, -1);
}

/**
 * Formats the fields as a UTC ISO string.
 * @param fields - the calendar fields.
 * @returns `YYYY-MM-DDTHH:MM:SS.000Z`.
 */
export function formatUtcDate(fields: DateFields): string {
  const { year, month, day, hour, minute, second } = fields;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.toISOString();
}
