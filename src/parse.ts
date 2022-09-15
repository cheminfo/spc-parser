import { IOBuffer } from 'iobuffer';

import { readDataBlock, Spectrum } from './dataBlock';
import { LogBlock, readLogBlock } from './logBlock';
import { Header, TheNewHeader, mainHeader } from './mainHeader';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

/**
 * Output format for the parsed file
 */
export interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock;
}

/**
 * Parses an SPC file.
 *
 * @param buffer - SPC file buffer.
 * @return Object containing every information contained in the SPC file.
 */
export function parse(buffer: InputData): ParseResult {
  const ioBuffer = new IOBuffer(buffer);
  const meta = mainHeader(ioBuffer);
  const spectra = readDataBlock(ioBuffer, meta);
  if (meta instanceof TheNewHeader && meta.logOffset !== 0) {
    return { meta, spectra, logs: readLogBlock(ioBuffer, meta.logOffset) };
  }
  return { meta, spectra };
}
