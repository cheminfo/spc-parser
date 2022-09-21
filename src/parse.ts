import { IOBuffer } from 'iobuffer';

import { readNewDataBlock, readOldDataBlock, Spectrum } from './dataBlock';
import { fileHeader, Header, TheNewHeader } from './fileHeader';
import { LogBlock, readLogBlock } from './logBlock';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;
export interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock | null;
}

/**
 * Main header parsing - First 512/256 bytes (new/old format).
 * @param buffer SPC buffer.
 * @return Main header.
 */

/**
 * Parses an SPC file.
 *
 * @param  buffer SPC file buffer.
 * @return Object containing every information contained in the SPC file.
 */
export function parse(buffer: InputData): ParseResult {
  const ioBuffer = new IOBuffer(buffer);
  const meta = fileHeader(ioBuffer);

  if (meta instanceof TheNewHeader) {
    const spectra = readNewDataBlock(ioBuffer, meta);
    const logs =
      meta.logOffset !== 0 ? readLogBlock(ioBuffer, meta.logOffset) : null;
    return { meta, spectra, logs };
  } else {
    //the old meta
    return {
      meta,
      spectra: readOldDataBlock(ioBuffer, meta),
    };
  }
}
