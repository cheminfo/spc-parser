/**
 * Reads bytes as latin1 characters (one character per byte).
 * @param bytes - the bytes (read in place, not copied).
 * @param start - first byte.
 * @param length - number of bytes; clamped to the end of `bytes`.
 * @returns The characters.
 */
export function readLatin1(
  bytes: Uint8Array,
  start: number,
  length: number,
): string {
  let text = '';
  const end = Math.min(bytes.length, start + length);
  for (let i = start; i < end; i++) {
    text += String.fromCodePoint(bytes[i] as number);
  }
  return text;
}

/**
 * Checks that bytes start with a given signature.
 * @param bytes - the bytes.
 * @param signature - expected first bytes.
 * @returns True on a match.
 */
export function hasSignature(
  bytes: Uint8Array,
  signature: readonly number[],
): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}
