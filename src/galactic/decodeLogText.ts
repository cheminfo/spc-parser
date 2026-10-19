import type { ParseContext } from '../utility/ParseContext.ts';
import { decodeText } from '../utility/decodeText.ts';

/**
 * Decodes the text area of a log block. The text ends at the first NUL; the
 * NUL-separated segments that follow are kept only when they read as
 * `key=value` lines (some writers separate entries with NULs), with a warning.
 * @param view - bytes of the text area (read in place, not copied).
 * @param context - shared parse state (encoding and warnings).
 * @returns The decoded, trimmed log text.
 */
export function decodeLogText(view: Uint8Array, context: ParseContext): string {
  const { encoding } = context;
  const end = view.indexOf(0);
  if (end === -1) return decodeText(view, { encoding });
  const text = decodeText(view.subarray(0, end), { encoding });

  const extra: string[] = [];
  let start = end + 1;
  while (start < view.length) {
    let next = view.indexOf(0, start);
    if (next === -1) next = view.length;
    const segment = decodeText(view.subarray(start, next), { encoding });
    if (isKeyValueText(segment)) extra.push(segment);
    start = next + 1;
  }
  if (extra.length === 0) return text;
  context.warn(
    `Log text holds ${extra.length} key=value segment(s) after its terminating NUL; appended`,
  );
  return text === '' ? extra.join('\r\n') : `${text}\r\n${extra.join('\r\n')}`;
}

/**
 * Checks that a text segment is printable and made only of `key=value` lines.
 * @param segment - decoded text segment.
 * @returns True when every non-blank line has a key before a `=`.
 */
function isKeyValueText(segment: string): boolean {
  if (segment === '' || hasControlCharacter(segment)) return false;
  const lines = segment.split(/[\r\n]+/);
  for (const line of lines) {
    if (line.trim() === '') continue;
    const equal = line.indexOf('=');
    if (equal < 1 || line.slice(0, equal).trim() === '') return false;
  }
  return true;
}

/**
 * Checks for control characters other than tab, CR and LF.
 * @param text - decoded text.
 * @returns True when the text contains a control character.
 */
function hasControlCharacter(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i) ?? 0;
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      code === 127
    ) {
      return true;
    }
  }
  return false;
}
