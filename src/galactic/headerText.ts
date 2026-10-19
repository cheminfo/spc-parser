import type { IOBuffer } from 'iobuffer';

import type { DecodeTextOptions } from '../utility/decodeText.ts';
import { decodeText, splitNulFields } from '../utility/decodeText.ts';

/**
 * Custom axis labels stored in `fcatxt` (new format) or `ocatxt` (old format).
 * An empty string means that the position holds no label.
 */
export interface CustomLabels {
  x: string;
  y: string;
  z: string;
}

/**
 * The memo and custom-label area of a header (`fcmnt` + `fcatxt`).
 */
export interface MemoAndLabels {
  memo: string;
  memoFragments: string[];
  xyzLabels: string;
  customLabels: CustomLabels;
}

const memoLength = 130;
const labelsLength = 30;

/**
 * Reads the 130-byte memo followed by the 30-byte custom labels. When the
 * custom labels are not in use and the memo has no terminating NUL, the memo
 * continues into the label area (SPC.H), and no custom labels are reported.
 * @param buffer - SPC buffer positioned at the memo.
 * @param hasCustomLabels - whether TALABS (or ZTEXTL) enables the labels.
 * @param options - text decoding options.
 * @returns The decoded memo, its leftover fragments and the labels.
 */
export function readMemoAndLabels(
  buffer: IOBuffer,
  hasCustomLabels: boolean,
  options: DecodeTextOptions,
): MemoAndLabels {
  const area = readView(buffer, memoLength + labelsLength);
  const isMemoExtended =
    !hasCustomLabels && !area.subarray(0, memoLength).includes(0);
  const memoBytes = isMemoExtended ? area : area.subarray(0, memoLength);
  const labelBytes = isMemoExtended
    ? new Uint8Array(0)
    : area.subarray(memoLength, memoLength + labelsLength);
  const fields = splitNulFields(labelBytes, options);
  return {
    memo: decodeText(memoBytes, options),
    memoFragments: textFragments(memoBytes, options),
    xyzLabels: fields.join(''),
    customLabels: {
      x: fields[0] ?? '',
      y: fields[1] ?? '',
      z: fields[2] ?? '',
    },
  };
}

/**
 * Reads a fixed-size NUL-terminated text field and decodes it.
 * @param buffer - SPC buffer positioned at the field.
 * @param length - size of the field in bytes.
 * @param options - text decoding options.
 * @returns The decoded text.
 */
export function readText(
  buffer: IOBuffer,
  length: number,
  options: DecodeTextOptions,
): string {
  return decodeText(readView(buffer, length), options);
}

/**
 * Returns a view (not a copy) of the next bytes and advances the buffer.
 * @param buffer - SPC buffer.
 * @param length - number of bytes.
 * @returns A view over the bytes.
 */
function readView(buffer: IOBuffer, length: number): Uint8Array {
  const view = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset + buffer.offset,
    length,
  );
  buffer.skip(length);
  return view;
}

const meaningfulText = /[\dA-Za-z]{3}/;

/**
 * Collects the readable leftovers that follow the first NUL of a text field
 * (text of a previous, longer value that the writer did not clear). The bytes
 * are split at NUL and control characters, and a fragment is kept when it
 * contains at least 3 consecutive ASCII letters or digits, which rejects
 * binary garbage.
 * @param view - bytes of the field.
 * @param options - text decoding options.
 * @returns The fragments, in file order.
 */
function textFragments(view: Uint8Array, options: DecodeTextOptions) {
  const fragments: string[] = [];
  const first = view.indexOf(0);
  if (first === -1) return fragments;
  let start = first + 1;
  for (let i = start; i <= view.length; i++) {
    if (i < view.length && !isControl(view[i] as number)) continue;
    if (i > start) {
      const text = decodeText(view.subarray(start, i), options);
      if (meaningfulText.test(text)) fragments.push(text);
    }
    start = i + 1;
  }
  return fragments;
}

/**
 * Checks for an ASCII control byte (including NUL and DEL).
 * @param byte - the byte.
 * @returns True for a control byte.
 */
function isControl(byte: number): boolean {
  return byte < 0x20 || byte === 0x7f;
}
