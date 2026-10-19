import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';
import { decodeText } from '../utility/decodeText.ts';

import { decodeLogText } from './decodeLogText.ts';
import type { ParsedLogText } from './logText.ts';
import { parseLogText } from './logText.ts';

/**
 * The fixed 64-byte log header (`LOGSTC`).
 */
export interface Metadata {
  /**
   * `logsizd`: bytes of the whole block on disk (header, binary, disk and text).
   */
  size: number;
  /**
   * `logsizm`: memory size, a multiple of 4096 (unreliable).
   */
  memorySize: number;
  /**
   * `logtxto`: offset of the text from the start of the block.
   */
  textOffset: number;
  /**
   * `logbins`: size of the binary area that follows the header.
   */
  binarySize: number;
  /**
   * `logdsks`: size of the disk area that follows the binary area.
   */
  diskArea: number;
  /**
   * `logspar`: reserved bytes, decoded as text.
   */
  reserved: string;
}

/**
 * The log block of a new-format Galactic SPC file.
 */
export interface LogBlock extends ParsedLogText {
  /**
   * The log header (`LOGSTC`) fields, as stored in the file.
   */
  meta: Metadata;
  /**
   * The log text, cut at its terminating NUL, decoded and trimmed.
   */
  text: string;
  /**
   * Copy of the binary area (e.g. NMR imaginary data), clamped to the file.
   */
  binary: Uint8Array;
  /**
   * Copy of the disk area, clamped to the file.
   */
  disk: Uint8Array;
  /**
   * NMR imaginary part (float32 values of the binary area), when the file is
   * NMR data and the log does not set `SPC_REAL=TRUE`. It is in the order of
   * `y`: reversed with it when a decreasing X is sorted.
   * @default undefined
   */
  imaginary?: Float64Array;
}

/**
 * The numeric `LOGSTC` fields.
 */
export type LogFields = Omit<Metadata, 'reserved'>;

const logHeaderSize = 64;

/**
 * Reads the log block located at `flogoff`. The areas it announces are
 * clamped to the file; every anomaly is reported through the context.
 * @param buffer - SPC buffer (its endianness is used for the header fields).
 * @param logOffset - `flogoff` from the main header.
 * @param context - shared parse state (encoding and warnings).
 * @returns The log block, or `null` when there is none or it cannot be read.
 */
export function readLogBlock(
  buffer: IOBuffer,
  logOffset: number,
  context: ParseContext,
): LogBlock | null {
  if (logOffset === 0) return null;
  const fileLength = buffer.length;
  if (logOffset >= fileLength) {
    context.warn(
      `Log block offset ${logOffset} is beyond the end of the file (${fileLength} bytes); log ignored`,
    );
    return null;
  }
  if (logOffset + logHeaderSize > fileLength) {
    context.warn(
      `Log block header at offset ${logOffset} is cut by the end of the file (${fileLength} bytes); log ignored`,
    );
    return null;
  }
  try {
    return decodeLogBlock(buffer, logOffset, context);
  } catch (error) {
    if (context.strict) throw error;
    context.warn(
      `Log block could not be read (${(error as Error).message}); log ignored`,
    );
    return null;
  }
}

/**
 * Returns a view over all the bytes of an SPC buffer.
 * @param buffer - SPC buffer.
 * @returns A `Uint8Array` over the same memory.
 */
export function getBytes(buffer: IOBuffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Extracts the areas of a log block from its numeric header fields: binary
 * and disk areas after the 64-byte header, text at `textOffset`, all clamped
 * to the file, with a warning for every anomaly.
 * @param bytes - the whole file.
 * @param logOffset - where the 64-byte header layout starts.
 * @param fields - the numeric header fields.
 * @param context - shared parse state.
 * @returns The log block.
 */
export function decodeLogAreas(
  bytes: Uint8Array,
  logOffset: number,
  fields: LogFields,
  context: ParseContext,
): LogBlock {
  const fileLength = bytes.length;
  const meta: Metadata = {
    ...fields,
    reserved: decodeText(
      bytes.subarray(logOffset + 20, logOffset + logHeaderSize),
      { encoding: context.encoding },
    ),
  };
  const { size, textOffset, binarySize, diskArea } = meta;

  const blockEnd =
    logOffset + Math.max(size, logHeaderSize + binarySize + diskArea);
  if (blockEnd > fileLength) {
    context.warn(
      `Log block ends ${blockEnd - fileLength} bytes beyond the end of the file; truncated`,
    );
  }

  const binaryStart = logOffset + logHeaderSize;
  const diskStart = binaryStart + binarySize;
  const binary = bytes.slice(binaryStart, Math.min(diskStart, fileLength));
  const disk = bytes.slice(
    Math.min(diskStart, fileLength),
    Math.min(diskStart + diskArea, fileLength),
  );

  let textStart = textOffset;
  let textEnd = logOffset + size;
  if (textStart < logHeaderSize) {
    context.warn(
      `Log text offset ${textOffset} points inside the log header; text read from offset ${logHeaderSize}`,
    );
    textStart = logHeaderSize;
  }
  if (textStart > size) {
    context.warn(
      `Log text offset ${textOffset} is beyond the log block size ${size}; text read up to the end of the file`,
    );
    textEnd = fileLength;
  }
  const start = Math.min(logOffset + textStart, fileLength);
  const end = Math.max(start, Math.min(textEnd, fileLength));
  const text = decodeLogText(bytes.subarray(start, end), context);

  return { meta, text, ...parseLogText(text), binary, disk };
}

/**
 * Decodes a log block whose 64-byte header lies inside the file.
 * @param buffer - SPC buffer.
 * @param logOffset - `flogoff` from the main header.
 * @param context - shared parse state.
 * @returns The log block.
 */
function decodeLogBlock(
  buffer: IOBuffer,
  logOffset: number,
  context: ParseContext,
): LogBlock {
  buffer.offset = logOffset;
  const fields: LogFields = {
    size: buffer.readUint32(),
    memorySize: buffer.readUint32(),
    textOffset: buffer.readUint32(),
    binarySize: buffer.readUint32(),
    diskArea: buffer.readUint32(),
  };
  return decodeLogAreas(getBytes(buffer), logOffset, fields, context);
}
