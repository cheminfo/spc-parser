import type { MeasurementXY } from 'cheminfo-types';

import type { ParseContext } from './ParseContext.ts';

/**
 * The part of a parse result this module reads.
 */
interface DatedResult {
  meta: { date?: string };
  spectra: MeasurementXY[];
}

/**
 * Reported once per file whose dates are wall-clock readings while the caller
 * named no zone. It explains the fix because the ambiguity is in the file and
 * cannot be resolved from the bytes.
 *
 * Not part of the public API: the wording is free to change.
 */
export const NAIVE_DATE_WARNING =
  'A date of this file is a wall-clock reading with no time zone, so it names no instant: ' +
  "reading it with `new Date()` applies the reader's own zone, which differs between a lab " +
  'machine and a UTC server. Pass the `timeZone` option set to the zone the instrument clock ' +
  "was on, such as { timeZone: 'Europe/Zurich' }, or { timeZone: 'UTC' } to keep the strings " +
  'version 2 produced. `meta.dateLayout` says which layout the date came from.';

/**
 * A date that names an instant ends with `Z` or an offset.
 */
const zonedDate = /(?:Z|[+-]\d\d:\d\d)$/;

/**
 * Reports, once per file, that a date was stored as a wall clock with no
 * offset. Every layout but `msdos` and `unix` is one, so the warning is about
 * the file's own ambiguity and not about a decoding failure.
 * @param result - what the format reader produced.
 * @param context - shared parse state.
 */
export function warnNaiveDate(
  result: DatedResult,
  context: ParseContext,
): void {
  if (context.timeZone !== undefined || findNaiveDate(result) === undefined) {
    return;
  }
  context.warn(NAIVE_DATE_WARNING);
}

/**
 * The first date of a file that carries neither `Z` nor an offset.
 * @param result - what the format reader produced.
 * @returns The date, or undefined when every date names an instant.
 */
function findNaiveDate(result: DatedResult): string | undefined {
  const fileDate = result.meta.date;
  if (typeof fileDate === 'string' && !zonedDate.test(fileDate)) {
    return fileDate;
  }
  for (const spectrum of result.spectra) {
    const date = spectrum.meta?.date;
    if (typeof date === 'string' && !zonedDate.test(date)) return date;
  }
  return undefined;
}
