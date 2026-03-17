import { IOBuffer } from 'iobuffer';

import { newDataBlock } from './dataBlock/newDataBlock.ts';
import { oldDataBlock } from './dataBlock/oldDataBlock.ts';
import type { Spectrum } from './dataBlock/shared.ts';
import type { Header } from './fileHeader.ts';
import { TheNewHeader, fileHeader } from './fileHeader.ts';
import type { LogBlock } from './logBlock.ts';
import { readLogBlock } from './logBlock.ts';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;

export interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock | null;
}

/**
 * Parses an SPC file.
 * @param  buffer - SPC file buffer.
 * @returns JSON-like object with information contained in the SPC file.
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
