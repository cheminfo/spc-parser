/**
 * Header fields to byte-swap: offset, size of one value and number of values.
 */
const headerFields: Array<[offset: number, size: number, count: number]> = [
  [4, 4, 1], // fnpts
  [8, 8, 2], // ffirst, flast
  [24, 4, 1], // fnsub
  [32, 4, 1], // fdate
  [54, 2, 1], // fpeakpt
  [56, 4, 8], // fspare
  [248, 4, 2], // flogoff, fmods
  [258, 2, 1], // fsampin
  [260, 4, 1], // ffactor
  [312, 4, 1], // fzinc
  [316, 4, 1], // fwplanes
  [320, 4, 1], // fwinc
];

/**
 * Subheader fields to byte-swap (relative to the subheader start).
 */
const subheaderFields: Array<[offset: number, size: number, count: number]> = [
  [2, 2, 1], // subindx
  [4, 4, 3], // subtime, subnext, subnois
  [16, 4, 2], // subnpts, subscan
  [24, 4, 1], // subwlevel
];

/**
 * Converts a new-format little-endian (`0x4B`) SPC file into a synthetic
 * `0x4C` (big-endian) file by byte-swapping every multi-byte field, as SPC.H
 * describes. Text fields are copied unchanged. No real `0x4C` file is known,
 * so this is used to exercise the big-endian code path.
 * Port of `to_big_endian.py` from the galactic-spec fixtures.
 * @param source - a `0x4B` file (left untouched).
 * @returns The `0x4C` copy.
 */
export function toBigEndian(source: Uint8Array): Uint8Array {
  if (source[1] !== 0x4b) throw new Error('only 0x4B input is supported');
  const bytes = source.slice();
  const view = new DataView(bytes.buffer);
  const flags = view.getUint8(0);
  const fileExponent = view.getInt8(3);
  const numberPoints = view.getUint32(4, true);
  const numberSubfiles = view.getUint32(24, true);
  const logOffset = view.getUint32(248, true);
  for (const [offset, size, count] of headerFields) {
    swap(bytes, offset, size, count);
  }
  bytes[1] = 0x4c;

  const isShort = (flags & 1) !== 0;
  const isMulti = (flags & 4) !== 0;
  const isXyxy = (flags & 64) !== 0;
  const hasX = (flags & 128) !== 0;
  let position = 512;
  if (hasX && !isXyxy) position = swap(bytes, position, 4, numberPoints);
  const subfiles = numberSubfiles || 1;
  const hasDirectory = isXyxy && numberPoints !== 0;
  for (let index = 0; index < subfiles; index++) {
    // The directory, when present, locates each subfile (it may be relocated).
    if (hasDirectory) {
      position = view.getUint32(numberPoints + 12 * index, true);
    }
    const subExponent = view.getInt8(position + 1);
    const subPoints = view.getUint32(position + 16, true);
    for (const [offset, size, count] of subheaderFields) {
      swap(bytes, position + offset, size, count);
    }
    position += 32;
    const exponent = isMulti ? subExponent : fileExponent;
    let count = numberPoints;
    if (isXyxy) {
      position = swap(bytes, position, 4, subPoints);
      count = subPoints;
    }
    const valueSize = exponent === -128 ? 4 : isShort ? 2 : 4;
    position = swap(bytes, position, valueSize, count);
  }
  if (hasDirectory) {
    let directory = numberPoints;
    for (let index = 0; index < numberSubfiles; index++) {
      directory = swap(bytes, directory, 4, 3);
    }
  }
  if (logOffset) swap(bytes, logOffset, 4, 5);
  return bytes;
}

/**
 * Reverses the bytes of `count` consecutive values of `size` bytes, in place.
 * @param bytes - the file bytes.
 * @param offset - offset of the first value.
 * @param size - size of one value in bytes.
 * @param count - number of values.
 * @returns The offset just after the last value.
 */
function swap(
  bytes: Uint8Array,
  offset: number,
  size: number,
  count: number,
): number {
  const end = offset + size * count;
  for (let start = offset; start < end; start += size) {
    bytes.subarray(start, start + size).reverse();
  }
  return end;
}
