import type { MeasurementXY } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

import { newDataBlock } from './dataBlock/newDataBlock.ts';
import { oldDataBlock } from './dataBlock/oldDataBlock.ts';
import type { Header } from './fileHeader.ts';
import { fileHeader } from './fileHeader.ts';
import type { LogBlock } from './logBlock.ts';
import { readLogBlock } from './logBlock.ts';

export interface GalacticParseResult {
  meta: Header;
  spectra: MeasurementXY[];
  logs?: LogBlock | null;
}

/**
 * Parses a Thermo Galactic GRAMS SPC file (`0x4B`/`0x4C`/`0x4D`).
 * @param ioBuffer - SPC buffer positioned at the start of the file.
 * @returns JSON-like object with information contained in the SPC file.
 */
export function parseGalactic(ioBuffer: IOBuffer): GalacticParseResult {
  const meta = fileHeader(ioBuffer);

  if (meta.kind === 'new') {
    const spectra = newDataBlock(ioBuffer, meta);
    const logs =
      meta.logOffset !== 0 ? readLogBlock(ioBuffer, meta.logOffset) : null;
    return { meta, spectra, logs };
  }
  return {
    meta,
    spectra: oldDataBlock(ioBuffer, meta),
  };
}
