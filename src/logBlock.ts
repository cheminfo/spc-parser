import type { IOBuffer } from 'iobuffer';

export interface MetaData {
  size: number;
  memorySize: number;
  textOffset: number;
  binarySize: number;
  diskArea: number;
  reserved: string;
}

export interface LogBlock {
  meta: MetaData;
  data: string;
  text: string;
}

/**
 * Reads the log block from an SPC file.
 * @param  buffer - SPC buffer.
 * @param  logOffset - Offset of the log (from mainHeader).
 * @returns  Object containing log meta, data and text.
 */
export function readLogBlock(buffer: IOBuffer, logOffset: number): LogBlock {
  const logHeader: MetaData = {
    size: buffer.readUint32(), //Size of the block in bytes
    memorySize: buffer.readUint32(), //Size of the memory rounded up to nearest multiple of 4096
    textOffset: buffer.readUint32(), //Offset to Text section
    binarySize: buffer.readUint32(), //Size of binary log block
    diskArea: buffer.readUint32(), //Size of the disk area
    reserved: buffer.readChars(44).trim().replaceAll('\u0000', ''), //Reserved space
  };
  const logData = buffer.readChars(logHeader.binarySize);
  buffer.offset = logOffset + logHeader.textOffset;
  const logASCII = buffer
    .readChars(logHeader.size - logHeader.textOffset)
    .trim()
    .replaceAll('\u0000', '');
  return { meta: logHeader, data: logData, text: logASCII };
}
