/**
 * Options of {@link decodeText} and {@link splitNulFields}.
 */
export interface DecodeTextOptions {
  /**
   * Encoding used when the bytes are not valid UTF-8.
   * @default 'windows-1252'
   */
  encoding?: string;
}

const utf8Decoder = new TextDecoder('utf-8');
const strictUtf8Decoder = new TextDecoder('utf-8', { fatal: true });
const fallbackDecoders = new Map<string, TextDecoder>();

/**
 * Decodes a NUL-terminated text field: the bytes are cut at the first NUL,
 * decoded as strict UTF-8 when valid, otherwise with the fallback encoding,
 * and trimmed.
 * @param view - bytes of the field (read in place, not copied).
 * @param options - decoding options.
 * @returns The decoded text, `''` when the field is empty.
 */
export function decodeText(
  view: Uint8Array,
  options: DecodeTextOptions = {},
): string {
  const end = view.indexOf(0);
  const bytes = end === -1 ? view : view.subarray(0, end);
  return decodeBytes(bytes, options.encoding).trim();
}

/**
 * Splits a block of NUL-separated text fields (e.g. `fcatxt`) and decodes each
 * field like {@link decodeText}. Empty fields between separators are kept so
 * that positions are preserved; trailing empty fields are dropped.
 * @param view - bytes of the block (read in place, not copied).
 * @param options - decoding options.
 * @returns The decoded fields.
 */
export function splitNulFields(
  view: Uint8Array,
  options: DecodeTextOptions = {},
): string[] {
  const fields: string[] = [];
  let start = 0;
  while (start <= view.length) {
    let end = view.indexOf(0, start);
    if (end === -1) end = view.length;
    fields.push(
      decodeBytes(view.subarray(start, end), options.encoding).trim(),
    );
    start = end + 1;
  }
  while (fields.length > 0 && fields.at(-1) === '') fields.pop();
  return fields;
}

/**
 * Gets the cached decoder of a fallback encoding.
 * @param encoding - a WHATWG encoding label.
 * @returns The decoder.
 * @throws {RangeError} When the encoding is not supported.
 */
export function getFallbackDecoder(encoding: string): TextDecoder {
  let decoder = fallbackDecoders.get(encoding);
  if (!decoder) {
    decoder = new TextDecoder(encoding);
    fallbackDecoders.set(encoding, decoder);
  }
  return decoder;
}

/**
 * Decodes bytes as strict UTF-8, falling back to the given encoding. Invalid
 * UTF-8 is detected without relying on a thrown exception, which is slow.
 * @param bytes - the bytes to decode.
 * @param encoding - fallback encoding.
 * @returns The decoded string.
 */
function decodeBytes(bytes: Uint8Array, encoding = 'windows-1252'): string {
  const text = utf8Decoder.decode(bytes);
  if (!text.includes('\u{FFFD}') || isValidUtf8(bytes)) return text;
  return getFallbackDecoder(encoding).decode(bytes);
}

/**
 * Checks bytes that decoded to at least one U+FFFD. The replacement character
 * comes from invalid UTF-8 unless the bytes encode it (EF BF BD).
 * @param bytes - the bytes to check.
 * @returns Whether the bytes are valid UTF-8.
 */
function isValidUtf8(bytes: Uint8Array): boolean {
  if (!hasReplacementCharacter(bytes)) return false;
  try {
    strictUtf8Decoder.decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether the bytes contain the UTF-8 encoding of U+FFFD.
 * @param bytes - the bytes to scan.
 * @returns `true` when EF BF BD occurs.
 */
function hasReplacementCharacter(bytes: Uint8Array): boolean {
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] === 0xef && bytes[i + 1] === 0xbf && bytes[i + 2] === 0xbd) {
      return true;
    }
  }
  return false;
}
