/**
 * Galactic file versions (second byte of the file): new little-endian,
 * new big-endian and old LabCalc format.
 */
const newLittleEndian = 0x4b;
const newBigEndian = 0x4c;
const oldFormat = 0x4d;

const multiFileFlag = 0x04;
const xyxyFlag = 0x40;

/**
 * Minimum number of bytes needed to judge a Galactic header.
 */
const minimumSniffLength = 32;
/**
 * Upper bound on counts read from a header that is itself truncated.
 */
const maximumCount = 2 ** 24;

/**
 * Checks that the bytes start with a plausible Thermo Galactic SPC header.
 *
 * The second byte must be a Galactic version (`0x4B`, `0x4C` or `0x4D`) and the
 * point and subfile counts must be consistent with the file length. The bounds
 * are deliberately loose so that truncated files are still recognised (and then
 * rejected as truncated) instead of being reported as another format.
 * @param bytes - the whole file as bytes.
 * @returns True when the file looks like a Galactic SPC file.
 */
export function isGalactic(bytes: Uint8Array): boolean {
  if (bytes.length < minimumSniffLength) return false;
  const version = bytes[1];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (version === newLittleEndian) return isPlausibleNew(bytes, view, true);
  if (version === newBigEndian) return isPlausibleNew(bytes, view, false);
  if (version === oldFormat) return isPlausibleOld(bytes, view);
  return false;
}

/**
 * Returns the fixed header length of a Galactic file.
 * @param bytes - the whole file as bytes (a Galactic file).
 * @returns 256 for the old format, 512 for the new format.
 */
export function galacticHeaderLength(bytes: Uint8Array): number {
  return bytes[1] === oldFormat ? 256 : 512;
}

/**
 * Checks the counts of a new-format (`0x4B`/`0x4C`) header.
 * @param bytes - the whole file as bytes.
 * @param view - data view over the file.
 * @param isLittleEndian - byte order of the header.
 * @returns True when the header is plausible.
 */
function isPlausibleNew(
  bytes: Uint8Array,
  view: DataView,
  isLittleEndian: boolean,
): boolean {
  const first = view.getFloat64(8, isLittleEndian);
  const last = view.getFloat64(16, isLittleEndian);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return false;
  const flags = bytes[0] ?? 0;
  const numberPoints = view.getUint32(4, isLittleEndian);

  const isComplete = bytes.length >= 512;
  const limit = isComplete ? bytes.length : maximumCount;
  const isPointsOk =
    (flags & xyxyFlag) !== 0
      ? numberPoints === 0 || numberPoints < limit
      : numberPoints >= 1 && numberPoints <= limit;
  if (!isPointsOk) return false;
  if ((flags & multiFileFlag) === 0) return true;
  const subfiles = view.getUint32(24, isLittleEndian);
  return subfiles <= (isComplete ? bytes.length / 32 : maximumCount);
}

/**
 * Checks the point count of an old-format (`0x4D`) header.
 * @param bytes - the whole file as bytes.
 * @param view - data view over the file.
 * @returns True when the header is plausible.
 */
function isPlausibleOld(bytes: Uint8Array, view: DataView): boolean {
  const numberPoints = view.getFloat32(4, true);
  const limit = bytes.length >= 256 ? bytes.length : maximumCount;
  return (
    Number.isFinite(numberPoints) && numberPoints >= 1 && numberPoints <= limit
  );
}
