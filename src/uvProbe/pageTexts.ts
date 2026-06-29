import { IOBuffer } from 'iobuffer';

export interface PageText {
  /** Section title, e.g. `Measurement Properties` (brackets stripped). */
  title: string;
  /** Key/value properties of the section. */
  properties: Record<string, string>;
}

/**
 * Parses a single `PageTextsN` stream from a UVProbe OLE file.
 * @param content - raw stream bytes.
 * @returns The section title and its key/value properties.
 */
export function parsePageText(content: Uint8Array): PageText {
  const buffer = new IOBuffer(content);
  buffer.readUint32(); // unknown flag (always 1 in observed files)
  buffer.readUint32(); // page index
  const title = readDotNetString(buffer).replace(
    /^\[(?<inner>.*)\]$/,
    '$<inner>',
  );
  const count = buffer.readUint32();
  const properties: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const key = readDotNetString(buffer).replace(/:\s*$/, '');
    properties[key] = readDotNetString(buffer);
  }
  return { title, properties };
}

/**
 * Reads a .NET `BinaryWriter` string: a 7-bit-encoded length prefix followed by
 * that many latin1 bytes.
 * @param buffer - the buffer positioned at the length prefix.
 * @returns The decoded string.
 */
function readDotNetString(buffer: IOBuffer): string {
  return buffer.decodeText(read7BitLength(buffer), 'latin1');
}

/**
 * Reads a .NET 7-bit-encoded (LEB128-style) length prefix.
 * @param buffer - the buffer positioned at the length prefix.
 * @returns The decoded length.
 */
function read7BitLength(buffer: IOBuffer): number {
  let result = 0;
  let shift = 0;
  let byte: number;
  do {
    byte = buffer.readUint8();
    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while ((byte & 0x80) !== 0);
  return result;
}
