import { SpcParserError } from '../../utility/SpcParserError.ts';
import type { FlagParameters } from '../utility/headerUtilities.ts';

import type { YEncoding } from './subfileLayout.ts';
import { getYEncoding } from './subfileLayout.ts';

/**
 * Header byte length of the old format before the first subfile header.
 */
export const oldDataStart = 224;

/**
 * One complete subfile of an old-format file.
 */
export interface OldSubfile {
  /**
   * Offset of the subfile header.
   */
  position: number;
  /**
   * How the Y values of the subfile are stored.
   */
  encoding: YEncoding;
}

/**
 * Layout of the subfiles of an old-format (`0x4D`) file.
 */
export interface OldSubfileLayout {
  /**
   * Rounded number of points of every subfile.
   */
  numberPoints: number;
  /**
   * The complete subfiles, in file order.
   */
  subfiles: OldSubfile[];
  /**
   * Offset after the last complete subfile.
   */
  end: number;
  /**
   * Bytes left after the last complete subfile.
   */
  remainder: number;
}

/**
 * Fields of an old-format header that govern the subfile layout.
 */
export interface OldLayoutHeader {
  /**
   * Point count, stored as a float (`onpts`).
   */
  numberPoints: number;
  /**
   * File exponent (`oexp`).
   */
  exponentY: number;
  /**
   * File flags.
   */
  parameters: FlagParameters;
}

const subHeaderLength = 32;

/**
 * Locates the subfiles of an old-format file, which does not store their
 * count: a multifile holds as many subfiles as fit in the file. Each subfile
 * is sized from its own encoding, because float32 values (exponent `-128`)
 * take 4 bytes even when the 16-bit flag is set.
 * @param header - point count, file exponent and flags.
 * @param bytes - the whole file (read in place, not copied).
 * @returns The layout of the subfiles.
 */
export function getOldSubfileLayout(
  header: OldLayoutHeader,
  bytes: Uint8Array,
): OldSubfileLayout {
  const { parameters, exponentY } = header;
  const numberPoints = Math.round(header.numberPoints);
  if (!Number.isFinite(numberPoints) || numberPoints <= 0) {
    throw new SpcParserError(
      'UNSUPPORTED_FORMAT',
      `Unsupported SPC file: old-format point count ${header.numberPoints} is not a positive number`,
    );
  }
  const maxCount = parameters.multiFile ? Infinity : 1;
  const subfiles: OldSubfile[] = [];
  let position = oldDataStart;
  let firstSize = 0;
  while (
    subfiles.length < maxCount &&
    position + subHeaderLength <= bytes.length
  ) {
    const subExponent = ((bytes[position + 1] as number) << 24) >> 24;
    const encoding = getYEncoding(subExponent, exponentY, parameters);
    const size = subHeaderLength + encoding.bytesPerY * numberPoints;
    if (subfiles.length === 0) firstSize = size;
    if (position + size > bytes.length) break;
    subfiles.push({ position, encoding });
    position += size;
  }
  if (subfiles.length === 0) {
    const size =
      firstSize ||
      subHeaderLength +
        getYEncoding(exponentY, exponentY, parameters).bytesPerY * numberPoints;
    throw new SpcParserError(
      'TRUNCATED',
      `Truncated SPC file: ${bytes.length} bytes cannot hold one subfile of ${size} bytes`,
    );
  }
  return {
    numberPoints,
    subfiles,
    end: position,
    remainder: bytes.length - position,
  };
}
