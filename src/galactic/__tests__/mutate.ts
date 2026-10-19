/**
 * Numeric field types that {@link patch} can write.
 */
export type PatchType =
  | 'uint8'
  | 'int8'
  | 'uint16'
  | 'int16'
  | 'uint32'
  | 'int32'
  | 'float32'
  | 'float64';

/**
 * One field to overwrite in a file.
 */
export interface Patch {
  /**
   * Byte offset of the field.
   */
  offset: number;
  /**
   * Type of the field.
   */
  type: PatchType;
  /**
   * Value to write.
   */
  value: number;
  /**
   * Write the value little-endian.
   * @default true
   */
  littleEndian?: boolean;
}

/**
 * Returns a copy of a file with some numeric fields overwritten.
 * @param source - the original file bytes (left untouched).
 * @param patches - fields to overwrite.
 * @returns The patched copy.
 */
export function patch(source: Uint8Array, patches: Patch[]): Uint8Array {
  const bytes = source.slice();
  const view = new DataView(bytes.buffer);
  for (const { offset, type, value, littleEndian = true } of patches) {
    switch (type) {
      case 'uint8':
        view.setUint8(offset, value);
        break;
      case 'int8':
        view.setInt8(offset, value);
        break;
      case 'uint16':
        view.setUint16(offset, value, littleEndian);
        break;
      case 'int16':
        view.setInt16(offset, value, littleEndian);
        break;
      case 'uint32':
        view.setUint32(offset, value, littleEndian);
        break;
      case 'int32':
        view.setInt32(offset, value, littleEndian);
        break;
      case 'float32':
        view.setFloat32(offset, value, littleEndian);
        break;
      case 'float64':
        view.setFloat64(offset, value, littleEndian);
        break;
      default:
        throw new Error(`unknown patch type ${String(type)}`);
    }
  }
  return bytes;
}

/**
 * Returns a copy of a file with bytes written at an offset (e.g. a text field).
 * @param source - the original file bytes (left untouched).
 * @param offset - where to write.
 * @param content - the bytes to write.
 * @returns The patched copy.
 */
export function patchBytes(
  source: Uint8Array,
  offset: number,
  content: Uint8Array,
): Uint8Array {
  const bytes = source.slice();
  bytes.set(content, offset);
  return bytes;
}

/**
 * Returns the first `length` bytes of a file, as a truncated copy.
 * @param source - the original file bytes.
 * @param length - number of bytes to keep.
 * @returns The truncated copy.
 */
export function truncate(source: Uint8Array, length: number): Uint8Array {
  return source.slice(0, length);
}

/**
 * Returns a copy of a file with extra bytes appended.
 * @param source - the original file bytes.
 * @param extra - the bytes to append, or a number of zero bytes.
 * @returns The extended copy.
 */
export function append(
  source: Uint8Array,
  extra: Uint8Array | number,
): Uint8Array {
  const tail = typeof extra === 'number' ? new Uint8Array(extra) : extra;
  const bytes = new Uint8Array(source.length + tail.length);
  bytes.set(source);
  bytes.set(tail, source.length);
  return bytes;
}
