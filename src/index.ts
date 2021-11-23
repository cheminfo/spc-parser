import { IOBuffer } from 'iobuffer';

import { readDataBlock, Spectrum } from './dataBlock';
import { LogBlock, readLogBlock } from './logBlock';
import { Header, mainHeader } from './mainHeader';

declare type InputData =
  | number
  | ArrayBufferLike
  | ArrayBufferView
  | IOBuffer
  | Buffer;

interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock;
}

/**
 * Parses an SPC file
 *
 * @param {InputData} buffer SPC file buffer
 * @return {ParseResult} Object containing every information contained in the SPC file
 */
export function parse(buffer: InputData): ParseResult {
  const ioBuffer = new IOBuffer(buffer);
  const meta = mainHeader(ioBuffer);
  const spectra = readDataBlock(ioBuffer, meta);
  if (meta.logOffset && meta.logOffset !== 0) {
    return { meta, spectra, logs: readLogBlock(ioBuffer, meta.logOffset) };
  }
  return { meta, spectra };
}
