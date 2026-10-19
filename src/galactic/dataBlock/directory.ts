import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../../utility/ParseContext.ts';

/**
 * One entry (`SSFSTC`) of the subfile directory of an XYXY multifile.
 */
export interface DirectoryEntry {
  /**
   * File offset of the subfile header (`ssfposn`).
   */
  position: number;
  /**
   * Bytes reserved for the subfile (`ssfsize`), possibly more than used.
   */
  size: number;
  /**
   * Copy of the subfile Z value (`ssftime`), sometimes garbage.
   */
  time: number;
}

const headerLength = 512;
const entryLength = 12;

/**
 * Reads and validates the subfile directory of an XYXY file. It is announced
 * by a non-zero `fnpts` (its offset) and lists where each subfile is: GRAMS
 * moves subfiles to the end of the file when they grow, so the sequential
 * layout can be stale.
 * @param buffer - SPC buffer.
 * @param offset - `fnpts`, the offset of the directory (0 when absent).
 * @param count - number of subfiles (`fnsub`).
 * @param logOffset - `flogoff`.
 * @param context - receives a warning when the directory is not usable.
 * @returns The entries, or `undefined` when there is no valid directory.
 */
export function readDirectory(
  buffer: IOBuffer,
  offset: number,
  count: number,
  logOffset: number,
  context: ParseContext,
): DirectoryEntry[] | undefined {
  if (offset === 0) return undefined;
  const end = offset + entryLength * count;
  if (
    offset < headerLength ||
    end > buffer.length ||
    (logOffset !== 0 && end > logOffset)
  ) {
    context.warn(
      `The subfile directory at offset ${offset} does not fit in the file; subfiles read sequentially`,
    );
    return undefined;
  }
  buffer.seek(offset);
  const entries: DirectoryEntry[] = [];
  for (let i = 0; i < count; i++) {
    const position = buffer.readUint32();
    const size = buffer.readUint32();
    const time = buffer.readFloat32();
    if (position < headerLength || position + 32 > buffer.length) {
      context.warn(
        `Subfile directory entry ${i + 1} of ${count} points outside the file (${position}); subfiles read sequentially`,
      );
      return undefined;
    }
    entries.push({ position, size, time });
  }
  return entries;
}
