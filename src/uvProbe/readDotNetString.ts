import type { IOBuffer } from 'iobuffer';

import { decodeText } from '../utility/decodeText.ts';

/**
 * A 7-bit-encoded int32 length takes at most 5 bytes.
 */
const maximumPrefixLength = 5;

/**
 * Reads a .NET `BinaryWriter` string: a 7-bit-encoded byte length followed by
 * the bytes, decoded as UTF-8 or the fallback encoding, NUL-cut and trimmed.
 * @param buffer - little-endian buffer positioned on the length prefix.
 * @param encoding - fallback encoding for text that is not valid UTF-8.
 * @param shouldClamp - cut a string that runs past the end of the buffer
 * instead of throwing.
 * @returns The decoded string.
 * @throws {RangeError} When the length prefix is invalid, or the string runs
 * past the end of the buffer and `shouldClamp` is false.
 */
export function readDotNetString(
  buffer: IOBuffer,
  encoding: string,
  shouldClamp = false,
): string {
  let length = 0;
  let factor = 1;
  let byte: number;
  let prefixLength = 0;
  do {
    if (prefixLength === maximumPrefixLength) {
      throw new RangeError('invalid string length prefix');
    }
    byte = buffer.readUint8();
    length += (byte & 0x7f) * factor;
    factor *= 128;
    prefixLength++;
  } while ((byte & 0x80) !== 0);
  const remaining = buffer.length - buffer.offset;
  if (length > remaining) {
    if (!shouldClamp) {
      throw new RangeError('string runs past the end of the stream');
    }
    length = remaining;
  }
  return decodeText(buffer.readBytes(length), { encoding });
}
