import { IOBuffer } from 'iobuffer';

import { fileHeader, Header, TheNewHeader } from './fileHeader';
import { LogBlock, readLogBlock } from './logBlock';
import { newDataBlock } from './dataBlock/newDataBlock';
import { oldDataBlock } from './dataBlock/oldDataBlock';
import { Spectra } from './dataBlock/shared';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

export interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock | null;
}

/**
 * Parses an SPC file.
 *
 * @param  buffer SPC file buffer.
 * @return JSON-like object with information contained in the SPC file.
 */
export function parse(buffer: InputData): ParseResult {
  const ioBuffer = new IOBuffer(buffer);
  const meta = fileHeader(ioBuffer);

  if (meta instanceof TheNewHeader) {
    //new format
    const spectra = newDataBlock(ioBuffer, meta);
    const logs =
      meta.logOffset !== 0 ? readLogBlock(ioBuffer, meta.logOffset) : null;
    return { meta, spectra, logs };
  } else {
    //old format
    return {
      meta,
      spectra: oldDataBlock(ioBuffer, meta),
    };
  }
}
