import { IOBuffer } from 'iobuffer';

import { formatZonedDate } from '../utility/timeZone.ts';

import { readDotNetString } from './readDotNetString.ts';

/**
 * Fields of a `DataSetHeaderInfo` stream.
 */
export interface HeaderInfo {
  /**
   * Dataset name, e.g. `RawData` or `RawData-003`.
   */
  datasetName: string;
  /**
   * Acquisition date as a local ISO string (the file stores no time zone).
   * @default undefined
   */
  date?: string;
  /**
   * Operator (Windows user name).
   * @default undefined
   */
  operator?: string;
  /**
   * Organisation registered in UVProbe.
   * @default undefined
   */
  organization?: string;
  /**
   * Software name (`UVProbe`).
   * @default undefined
   */
  software?: string;
  /**
   * Software version, e.g. `2.62`.
   * @default undefined
   */
  softwareVersion?: string;
  /**
   * Instrument name given in UVProbe, e.g. `UV-2600`.
   * @default undefined
   */
  instrumentName?: string;
  /**
   * Instrument series, e.g. `UV-2600 Series`.
   * @default undefined
   */
  series?: string;
  /**
   * Instrument model, e.g. `UV-2450`.
   * @default undefined
   */
  model?: string;
  /**
   * Instrument serial number.
   * @default undefined
   */
  serialNumber?: string;
}

/**
 * Days between the OLE automation epoch (1899-12-30) and the Unix epoch.
 */
const oleDateEpochOffset = 25569;
const millisecondsPerDay = 86400000;

/**
 * Parses a `DataSetHeaderInfo` stream: name, `u32`, OLE date, operator, a
 * string, `u32`, organisation, two `u32`, software, version, instrument name,
 * series, `u32`, model and serial number. Fields that are cut short by the end
 * of the stream are left undefined.
 * @param content - raw stream bytes.
 * @param encoding - fallback encoding for text that is not valid UTF-8.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns The decoded fields.
 */
export function parseHeaderInfo(
  content: Uint8Array,
  encoding: string,
  timeZone?: string,
): HeaderInfo {
  const reader = new IOBuffer(content);
  const readString = () => readDotNetString(reader, encoding);
  const info: HeaderInfo = { datasetName: readString() };
  const steps: Array<() => void> = [
    () => reader.readUint32(),
    () => {
      info.date = oleDateToIso(reader.readFloat64(), timeZone);
    },
    () => setText(info, 'operator', readString()),
    () => readString(),
    () => reader.readUint32(),
    () => setText(info, 'organization', readString()),
    () => reader.readUint32(),
    () => reader.readUint32(),
    () => setText(info, 'software', readString()),
    () => setText(info, 'softwareVersion', readString()),
    () => setText(info, 'instrumentName', readString()),
    () => setText(info, 'series', readString()),
    () => reader.readUint32(),
    () => setText(info, 'model', readString()),
    () => setText(info, 'serialNumber', readString()),
  ];
  for (const step of steps) {
    if (reader.offset >= reader.length) break;
    step();
  }
  return info;
}

/**
 * First record of a `DataSetHistory` stream.
 */
export interface HistoryStart {
  /**
   * Local ISO date of the first record.
   * @default undefined
   */
  date?: string;
  /**
   * Text of the first record, e.g. `Created new data set:  name - RawData.`.
   */
  text: string;
}

/**
 * Parses the first record of a `DataSetHistory` stream: two `u32`, an OLE
 * date, a `u32`, the user name, then the record text. A text cut short by
 * the end of the stream is kept (some writers overstate its length).
 * @param content - raw stream bytes.
 * @param encoding - fallback encoding for text that is not valid UTF-8.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns The date and text of the first record.
 */
export function parseHistoryStart(
  content: Uint8Array,
  encoding: string,
  timeZone?: string,
): HistoryStart {
  const reader = new IOBuffer(content);
  reader.seek(8);
  const date = oleDateToIso(reader.readFloat64(), timeZone);
  reader.skip(4);
  readDotNetString(reader, encoding);
  return { date, text: readDotNetString(reader, encoding, true) };
}

/**
 * Extracts the sample title from the first history record, e.g.
 * `Created new data set:  wt_asc1.`, `... name - RawData-003.` or
 * `... name - RawData - C:\\path\\file.spc.`. The text before the first colon is
 * ignored, so localised prefixes work too.
 * @param text - the first history record.
 * @returns The title, or undefined when the record holds no colon.
 */
export function readTitle(text: string): string | undefined {
  const match =
    /^[^:：]*[:：]\s*(?<name>.*?)(?:\s+-\s+RawData[-\d]*(?:\s+-\s.*)?)?\.?\s*$/su.exec(
      text,
    );
  const name = match?.groups?.name;
  return name || undefined;
}

/**
 * Converts an OLE automation date (days since 1899-12-30) to an ISO string.
 * UVProbe writes the lab machine's wall clock and records no offset, so the
 * result carries one only when the caller named the zone.
 * @param serial - the OLE date.
 * @param timeZone - zone the instrument's clock was set to, or undefined.
 * @returns ISO string `YYYY-MM-DDTHH:MM:SS.sss`, or undefined when invalid.
 */
export function oleDateToIso(
  serial: number,
  timeZone?: string,
): string | undefined {
  if (!Number.isFinite(serial) || serial <= 0) return undefined;
  const milliseconds = Math.round(
    (serial - oleDateEpochOffset) * millisecondsPerDay,
  );
  const wallClock = new Date(milliseconds);
  if (timeZone === undefined) return wallClock.toISOString().slice(0, -1);
  return formatZonedDate(
    {
      year: wallClock.getUTCFullYear(),
      month: wallClock.getUTCMonth() + 1,
      day: wallClock.getUTCDate(),
      hour: wallClock.getUTCHours(),
      minute: wallClock.getUTCMinutes(),
      second: wallClock.getUTCSeconds(),
    },
    timeZone,
  );
}

/**
 * Stores a string field when it is not empty.
 * @param info - the fields being built.
 * @param key - the field.
 * @param value - the decoded string.
 */
function setText(
  info: HeaderInfo,
  key: Exclude<keyof HeaderInfo, 'datasetName' | 'date'>,
  value: string,
): void {
  if (value) info[key] = value;
}
