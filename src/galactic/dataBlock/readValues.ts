import type { IOBuffer } from 'iobuffer';

import type { YEncoding } from './subfileLayout.ts';

/**
 * Reads float32 values into a new array.
 * @param buffer - SPC buffer, positioned on the values.
 * @param length - number of values.
 * @returns The values.
 */
export function readFloat32Array(
  buffer: IOBuffer,
  length: number,
): Float64Array {
  const values = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    values[i] = buffer.readFloat32();
  }
  return values;
}

/**
 * Reads the Y values of a new-format subfile.
 * @param buffer - SPC buffer, positioned on the Y values.
 * @param length - number of values.
 * @param encoding - how the values are stored.
 * @returns The Y values.
 */
export function readY(
  buffer: IOBuffer,
  length: number,
  encoding: YEncoding,
): Float64Array {
  if (encoding.isFloat) return readFloat32Array(buffer, length);
  const y = new Float64Array(length);
  if (encoding.bytesPerY === 2) {
    const factor = 2 ** (encoding.exponent - 16);
    for (let i = 0; i < length; i++) {
      y[i] = buffer.readInt16() * factor;
    }
  } else {
    const factor = 2 ** (encoding.exponent - 32);
    for (let i = 0; i < length; i++) {
      y[i] = buffer.readInt32() * factor;
    }
  }
  return y;
}
