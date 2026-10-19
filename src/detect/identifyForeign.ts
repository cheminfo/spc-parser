import { hasSignature, readLatin1 } from '../utility/bytes.ts';

/**
 * Signature of an unidentified vendor's enciphered `.spc` files.
 */
const encryptedSignature = [0x0b, 0xf4, 0x2d, 0x4b, 0x0f, 0xc3, 0x7f, 0xce];

/**
 * Control characters allowed in text files: tab, line feed, carriage return.
 */
const textWhitespace = new Set([0x09, 0x0a, 0x0d]);

/**
 * Identifies the known non-SPC formats that are saved with a `.spc` extension.
 *
 * Checked in order: Shimadzu RF-5300, EDAX EDS/XRF, ORTEC gamma, ASD FieldSpec,
 * gzip (R RDS objects), the encrypted family, Becker & Hickl TCSPC, then text
 * (Bruker EPR `.par`, XY data). Headerless binary data such as a Bruker EPR
 * `.spc` cannot be identified and gives undefined.
 * @param bytes - the whole file as bytes.
 * @returns A description of the detected format, or undefined.
 */
export function identifyForeign(bytes: Uint8Array): string | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = bytes.length;
  if (hasTextAt(bytes, 0, '\u{1}\u{E0}RF-5')) {
    return 'Shimadzu RF-5300 fluorescence spectrum';
  }
  if (size >= 34 && isEdax(view)) return 'EDAX/AMETEK EDS or XRF spectrum';
  if (
    size >= 128 &&
    size % 128 === 0 &&
    view.getUint16(0, true) === 1 &&
    [1, 5].includes(view.getUint16(2, true))
  ) {
    return 'ORTEC/EG&G gamma-spectroscopy spectrum';
  }
  if (/^(?:ASD|as[2-8])$/.test(readLatin1(bytes, 0, 3))) {
    return 'ASD FieldSpec binary spectrum';
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return 'gzip-compressed data (e.g. an R RDS object)';
  }
  if (hasSignature(bytes, encryptedSignature)) {
    return 'encrypted .spc of an unidentified vendor';
  }
  if (size >= 8 && size % 2 === 0 && isBeckerHickl(view)) {
    return 'Becker & Hickl TCSPC photon stream, not a spectrum';
  }
  if (
    isText(bytes, 64) &&
    /^(?:DOS|JSS|ANZ|GST|HCF|RES)\s/m.test(readLatin1(bytes, 0, 1024))
  ) {
    return 'Bruker EPR .par parameter file';
  }
  if (isText(bytes, 1024)) {
    return 'plain text (e.g. XY data), not a binary SPC file';
  }
  return undefined;
}

/**
 * EDAX Genesis/TEAM header: file version, data offset 3840 and channel count.
 * @param view - data view over the file.
 * @returns True for an EDAX spectrum.
 */
function isEdax(view: DataView): boolean {
  const fileVersion = view.getFloat32(0, true);
  const channels = view.getInt16(32, true);
  return (
    fileVersion >= 0.5 &&
    fileVersion < 1 &&
    view.getInt32(28, true) === 3840 &&
    channels >= 1 &&
    channels <= 16384
  );
}

/**
 * Becker & Hickl FIFO header record: bit 31 set, macrotime unit in bits 0-23.
 * @param view - data view over the file.
 * @returns True for a Becker & Hickl photon stream.
 */
function isBeckerHickl(view: DataView): boolean {
  const header = view.getUint32(0, true);
  const macrotimeUnit = header & 0xffffff;
  return header >= 0x80000000 && macrotimeUnit >= 1 && macrotimeUnit <= 0xffff;
}

/**
 * Checks that the first bytes hold only printable characters and whitespace.
 * @param bytes - the whole file as bytes.
 * @param maximumLength - number of bytes to check.
 * @returns True for a non-empty text start.
 */
function isText(bytes: Uint8Array, maximumLength: number): boolean {
  const length = Math.min(bytes.length, maximumLength);
  if (length === 0) return false;
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] as number;
    if (!textWhitespace.has(byte) && (byte < 0x20 || byte === 0x7f)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks that the bytes contain a latin1 string at a given offset.
 * @param bytes - the whole file as bytes.
 * @param start - byte offset.
 * @param text - expected characters.
 * @returns True on a match.
 */
function hasTextAt(bytes: Uint8Array, start: number, text: string): boolean {
  return readLatin1(bytes, start, text.length) === text;
}
