import { IOBuffer } from 'iobuffer';

import { readNewDataBlock, readOldDataBlock, Spectrum } from './dataBlock';
import { LogBlock, readLogBlock } from './logBlock';
import { Header, TheNewHeader, mainHeader } from './mainHeader';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

export interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock;
}

/**
 * Parses an SPC file.
 *
 * @param  buffer SPC file buffer.
 * @return Object containing every information contained in the SPC file.
 */
export function parse(buffer: InputData): ParseResult {
  const ioBuffer = new IOBuffer(buffer);
  const meta = mainHeader(ioBuffer);
  if (meta instanceof TheNewHeader && meta.logOffset !== 0) {
    return { meta, spectra: readNewDataBlock(ioBuffer, meta), logs: readLogBlock(ioBuffer, meta.logOffset) };
  }
  return { meta, spectra: readOldDataBlock };
}
