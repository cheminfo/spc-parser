import { IOBuffer } from 'iobuffer';

interface MetaData {
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
 *
 * @param  buffer SPC buffer.
 * @param  logOffset Offset of the log (from mainHeader).
 * @return  Object containing log meta, data and text.
 */
export function readLogBlock(buffer: IOBuffer, logOffset: number): LogBlock {
  let logHeader: MetaData = {
    size: buffer.readUint32(), //Size of the block in bytes
    memorySize: buffer.readUint32(), //Size of the memory rounded up to nearest multiple of 4096
    textOffset: buffer.readUint32(), //Offset to Text section
    binarySize: buffer.readUint32(), //Size of binary log block
    diskArea: buffer.readUint32(), //Size of the disk area
    reserved: buffer.readChars(44).trim().replace(/\x00/g, ''), //Reserved space
  };
  const logData = buffer.readChars(logHeader.binarySize);
  buffer.offset = logOffset + logHeader.textOffset;
  const logASCII = buffer
    .readChars(logHeader.size - logHeader.textOffset)
    .trim()
    .replace(/\x00/g, '');
  return { meta: logHeader, data: logData, text: logASCII };
}
