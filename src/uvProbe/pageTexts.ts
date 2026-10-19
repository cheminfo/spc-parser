import { IOBuffer } from 'iobuffer';

import { readDotNetString } from './readDotNetString.ts';

export interface PageText {
  /**
   * Section title, e.g. `Measurement Properties` (brackets stripped).
   */
  title: string;
  /**
   * Key/value properties of the section.
   */
  properties: Record<string, string>;
}

/**
 * Parses a single `PageTextsN` stream from a UVProbe OLE file.
 * @param content - raw stream bytes.
 * @param encoding - fallback encoding for text that is not valid UTF-8.
 * @returns The section title and its key/value properties.
 * @throws {RangeError} When the stream is cut short.
 */
export function parsePageText(
  content: Uint8Array,
  encoding = 'windows-1252',
): PageText {
  const buffer = new IOBuffer(content);
  buffer.skip(8); // unknown flag (always 1 in observed files), page index
  const title = readDotNetString(buffer, encoding).replace(
    /^\[(?<inner>.*)\]$/,
    '$<inner>',
  );
  const count = buffer.readUint32();
  const properties: Record<string, string> = {};
  // Each entry takes at least 2 bytes, so a bogus count fails at the end of
  // the stream.
  for (let i = 0; i < count; i++) {
    const key = readDotNetString(buffer, encoding).replace(/[:：]\s*$/, '');
    setOwnProperty(properties, key, readDotNetString(buffer, encoding));
  }
  return { title, properties };
}

/**
 * Sets an own enumerable property, even when the key is `__proto__`.
 * @param object - the object to update.
 * @param key - the property name, taken from the file.
 * @param value - the value.
 */
export function setOwnProperty<T>(
  object: Record<string, T>,
  key: string,
  value: T,
): void {
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
