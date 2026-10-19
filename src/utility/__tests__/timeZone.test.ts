import { expect, test } from 'vitest';

import type { DateFields } from '../calendarDate.ts';
import { formatZonedDate, validateTimeZone } from '../timeZone.ts';

/**
 * Builds calendar fields.
 * @param year - the year.
 * @param month - 1-based month.
 * @param day - the day.
 * @param hour - the hour.
 * @param minute - the minute.
 * @returns The fields.
 */
function fields(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): DateFields {
  return { year, month, day, hour, minute, second: 0 };
}

test('a zone that observes DST gets the offset of that date', () => {
  expect(formatZonedDate(fields(2024, 1, 15, 10), 'Europe/Zurich')).toBe(
    '2024-01-15T10:00:00.000+01:00',
  );
  expect(formatZonedDate(fields(2024, 7, 15, 10), 'Europe/Zurich')).toBe(
    '2024-07-15T10:00:00.000+02:00',
  );
});

test('the wall-clock digits are kept and only the offset is added', () => {
  const date = formatZonedDate(fields(1995, 10, 28, 8, 54), 'Europe/Zurich');

  expect(date.startsWith('1995-10-28T08:54:00.000')).toBe(true);
  expect(new Date(date).toISOString()).toBe('1995-10-28T07:54:00.000Z');
});

test('a zero offset is written as Z', () => {
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), 'UTC')).toBe(
    '2024-06-01T09:15:00.000Z',
  );
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), '+00:00')).toBe(
    '2024-06-01T09:15:00.000Z',
  );
});

test('an ambiguous wall clock takes the offset after the change', () => {
  // 2024-10-27 in Zurich: 03:00 falls back to 02:00, so 02:30 reads twice.
  expect(formatZonedDate(fields(2024, 10, 27, 2, 30), 'Europe/Zurich')).toBe(
    '2024-10-27T02:30:00.000+01:00',
  );
  expect(formatZonedDate(fields(2024, 10, 27, 1, 30), 'Europe/Zurich')).toBe(
    '2024-10-27T01:30:00.000+02:00',
  );
});

test('a wall clock that never happened takes the offset before the change', () => {
  // 2024-03-31 in Zurich: 02:00 jumps to 03:00, so 02:30 never reads.
  expect(formatZonedDate(fields(2024, 3, 31, 2, 30), 'Europe/Zurich')).toBe(
    '2024-03-31T02:30:00.000+01:00',
  );
  expect(formatZonedDate(fields(2024, 3, 31, 3, 30), 'Europe/Zurich')).toBe(
    '2024-03-31T03:30:00.000+02:00',
  );
});

test('sub-hour offsets keep their minutes', () => {
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), 'Asia/Kolkata')).toBe(
    '2024-06-01T09:15:00.000+05:30',
  );
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), 'Asia/Kathmandu')).toBe(
    '2024-06-01T09:15:00.000+05:45',
  );
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), 'Pacific/Chatham')).toBe(
    '2024-06-01T09:15:00.000+12:45',
  );
});

test('a fixed offset is accepted with and without its colon', () => {
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), '-05:30')).toBe(
    '2024-06-01T09:15:00.000-05:30',
  );
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), '-0530')).toBe(
    '2024-06-01T09:15:00.000-05:30',
  );
  expect(formatZonedDate(fields(2024, 6, 1, 9, 15), '+14:00')).toBe(
    '2024-06-01T09:15:00.000+14:00',
  );
});

test('a negative offset crossing midnight keeps the authored day', () => {
  const date = formatZonedDate(fields(2024, 6, 1, 1, 0), 'America/Los_Angeles');

  expect(date).toBe('2024-06-01T01:00:00.000-07:00');
  expect(new Date(date).toISOString()).toBe('2024-06-01T08:00:00.000Z');
});

test('validateTimeZone accepts zones and offsets', () => {
  expect(() => validateTimeZone('Europe/Zurich')).not.toThrow();
  expect(() => validateTimeZone('UTC')).not.toThrow();
  expect(() => validateTimeZone('+01:00')).not.toThrow();
  expect(() => validateTimeZone('-0530')).not.toThrow();
});

test('validateTimeZone throws a TypeError naming the bad zone', () => {
  expect(() => validateTimeZone('Not/AZone')).toThrow(TypeError);
  expect(() => validateTimeZone('Not/AZone')).toThrow(
    'Unsupported timeZone option: "Not/AZone"',
  );
  expect(() => validateTimeZone('')).toThrow(TypeError);
});
