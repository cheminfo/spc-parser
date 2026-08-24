/** The parameters encoded in each bit of the main header flag. */
export interface FlagParameters {
  /** Y values are 16 bits instead of 32. */
  y16BitPrecision: boolean;
  /** Enable experiment mode. */
  useExperimentExtension: boolean;
  /** Multiple spectra (multifile). */
  multiFile: boolean;
  /** Z values in random order if multiFile. */
  zValuesRandom: boolean;
  /** Z values ordered but unevenly spaced if multiFile. */
  zValuesUneven: boolean;
  /** Custom labels. */
  customAxisLabels: boolean;
  /** One X array per subfile, for discontinuous curves. */
  xyxy: boolean;
  /** Non-evenly spaced X, X before Y. */
  xy: boolean;
}

/**
 * Gets the parameter in each bit of the flag.
 * @param flag - First byte of the main header.
 * @returns The parameters.
 */
export function parseFlagParameters(flag: number): FlagParameters {
  return {
    y16BitPrecision: (flag & 1) !== 0,
    useExperimentExtension: (flag & 2) !== 0,
    multiFile: (flag & 4) !== 0,
    zValuesRandom: (flag & 8) !== 0,
    zValuesUneven: (flag & 16) !== 0,
    customAxisLabels: (flag & 32) !== 0,
    xyxy: (flag & 64) !== 0,
    xy: (flag & 128) !== 0,
  };
}

/** Calendar fields decoded from a packed header date. */
interface DateFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** A date outside this range means the packing was guessed wrong. */
const minimumYear = 1900;
const maximumYear = 2200;

/**
 * Gets the date encoded in binary in a long number.
 * The SPC specification packs it as year/month/day/hour/minute, but Renishaw
 * WiRE writes an MS-DOS date/time with a zero-indexed month instead, so the
 * layout is chosen from whichever one yields a plausible date.
 * @param  long - Binary date.
 * @returns  Date formatted to ISO 8601:2019 convention.
 */
export function longToDate(long: number): string {
  if (long === 0) {
    return '0000-00-00T00:00:00.00Z';
  }
  const specification = unpackSpecificationDate(long);
  if (isPlausible(specification)) {
    return toISOString(specification);
  }
  const dos = unpackDosDate(long);
  if (isPlausible(dos)) {
    return toISOString(dos);
  }
  return toISOString(specification);
}

/**
 * Unpacks the date as described by the SPC specification.
 * @param long - Binary date.
 * @returns The calendar fields.
 */
function unpackSpecificationDate(long: number): DateFields {
  return {
    year: long >>> 20,
    month: (long >>> 16) & 0x0f,
    day: (long >>> 11) & 0x1f,
    hour: (long >>> 6) & 0x1f,
    minute: long & 0x3f,
    second: 0,
  };
}

/**
 * Unpacks the date as an MS-DOS date/time, the layout Renishaw WiRE writes.
 * Its month field is zero-indexed, unlike in MS-DOS itself.
 * @param long - Binary date.
 * @returns The calendar fields.
 */
function unpackDosDate(long: number): DateFields {
  return {
    year: 1980 + (long >>> 25),
    month: ((long >>> 21) & 0x0f) + 1,
    day: (long >>> 16) & 0x1f,
    hour: (long >>> 11) & 0x1f,
    minute: (long >>> 5) & 0x3f,
    second: (long & 0x1f) * 2,
  };
}

/**
 * Checks that every field is in range and the year could be an acquisition date.
 * @param fields - The calendar fields.
 * @returns True when the fields describe a plausible date.
 */
function isPlausible(fields: DateFields): boolean {
  return (
    fields.year >= minimumYear &&
    fields.year <= maximumYear &&
    fields.month >= 1 &&
    fields.month <= 12 &&
    fields.day >= 1 &&
    fields.day <= 31 &&
    fields.hour <= 23 &&
    fields.minute <= 59 &&
    fields.second <= 59
  );
}

/**
 * Formats the fields as UTC, without the year clamping of the `Date` constructor.
 * @param fields - The calendar fields.
 * @returns Date formatted to ISO 8601:2019 convention.
 */
function toISOString(fields: DateFields): string {
  const date = new Date(0);
  date.setUTCFullYear(fields.year, fields.month - 1, fields.day);
  date.setUTCHours(fields.hour, fields.minute, fields.second, 0);
  return date.toISOString();
}
