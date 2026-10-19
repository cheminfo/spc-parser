import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';

import type { TheNewHeader } from './fileHeader.ts';
import type { LogBlock, LogFields } from './logBlock.ts';
import { decodeLogAreas, getBytes } from './logBlock.ts';

/**
 * Looks for a log block written right after the data although `flogoff` is 0
 * (Wasatch SPyC_Writer does this). A standard 64-byte `LOGSTC` is tried
 * first, then the variant with 8-byte fields written on Linux and macOS.
 * The block is accepted only when its fields are consistent and its text is
 * printable; a warning is added when one is recovered.
 * @param buffer - SPC buffer, positioned at the end of the last subfile.
 * @param header - the main header.
 * @param context - shared parse state.
 * @returns The recovered log block, or `null` when none is found.
 */
export function probeLogBlock(
  buffer: IOBuffer,
  header: TheNewHeader,
  context: ParseContext,
): LogBlock | null {
  let dataEnd = buffer.offset;
  const { parameters, numberPoints, spectra } = header;
  if (parameters.xyxy && numberPoints !== 0) {
    dataEnd = Math.max(dataEnd, numberPoints + 12 * spectra);
  }
  const bytes = getBytes(buffer);
  const remaining = bytes.length - dataEnd;
  if (remaining < 64) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const narrow = readNarrowFields(view, dataEnd, header.fileVersion !== 0x4c);
  if (isPlausible(bytes, dataEnd, narrow, remaining)) {
    context.warn(
      `Log block found at offset ${dataEnd} although flogoff is 0; recovered`,
    );
    return decodeLogAreas(bytes, dataEnd, narrow, context);
  }

  const wide = remaining >= 80 ? readWideFields(view, dataEnd) : undefined;
  if (wide && isPlausible(bytes, dataEnd + 16, wide, remaining - 16)) {
    context.warn(
      `Log block with 8-byte fields found at offset ${dataEnd} although flogoff is 0; recovered`,
    );
    return decodeLogAreas(bytes, dataEnd + 16, wide, context);
  }
  return null;
}

/**
 * Reads the five 4-byte `LOGSTC` fields.
 * @param view - the whole file.
 * @param offset - start of the candidate block.
 * @param isLittleEndian - byte order of the file.
 * @returns The fields.
 */
function readNarrowFields(
  view: DataView,
  offset: number,
  isLittleEndian: boolean,
): LogFields {
  return {
    size: view.getUint32(offset, isLittleEndian),
    memorySize: view.getUint32(offset + 4, isLittleEndian),
    textOffset: view.getUint32(offset + 8, isLittleEndian),
    binarySize: view.getUint32(offset + 12, isLittleEndian),
    diskArea: view.getUint32(offset + 16, isLittleEndian),
  };
}

/**
 * Reads the Wasatch variant: four little-endian 8-byte fields, then a 4-byte
 * disk size. Its header is 16 bytes longer than announced by its offsets.
 * @param view - the whole file.
 * @param offset - start of the candidate block.
 * @returns The fields, or `undefined` when a high word is not zero.
 */
function readWideFields(view: DataView, offset: number): LogFields | undefined {
  for (let i = 4; i < 32; i += 8) {
    if (view.getUint32(offset + i, true) !== 0) return undefined;
  }
  return {
    size: view.getUint32(offset, true),
    memorySize: view.getUint32(offset + 8, true),
    textOffset: view.getUint32(offset + 16, true),
    binarySize: view.getUint32(offset + 24, true),
    diskArea: view.getUint32(offset + 32, true),
  };
}

/**
 * Checks that candidate fields describe a block that fits and holds text.
 * @param bytes - the whole file.
 * @param base - where the 64-byte header layout starts.
 * @param fields - the candidate fields.
 * @param remaining - bytes available from `base`.
 * @returns True when the areas are consistent and the text is printable.
 */
function isPlausible(
  bytes: Uint8Array,
  base: number,
  fields: LogFields,
  remaining: number,
): boolean {
  const { size, textOffset, binarySize, diskArea } = fields;
  const isFits =
    64 + binarySize + diskArea <= textOffset &&
    textOffset < size &&
    size <= remaining;
  return isFits && isPrintableText(bytes, base + textOffset, base + size);
}

const blankBytes = new Set([9, 10, 13, 32]);

/**
 * Checks that the bytes up to the first NUL are printable text with at least
 * one visible character.
 * @param bytes - the whole file.
 * @param start - first byte of the text.
 * @param end - end of the text area.
 * @returns True for printable text.
 */
function isPrintableText(
  bytes: Uint8Array,
  start: number,
  end: number,
): boolean {
  let isVisible = false;
  for (let i = start; i < end; i++) {
    const byte = bytes[i] as number;
    if (byte === 0) break;
    if (blankBytes.has(byte)) continue;
    if (byte < 32 || byte === 127) return false;
    isVisible = true;
  }
  return isVisible;
}
