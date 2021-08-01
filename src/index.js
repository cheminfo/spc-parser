import { IOBuffer } from 'iobuffer';

import { readDataBlock } from './dataBlock';
import { readLogBlock } from './logBlock';
import { mainHeader } from './mainHeader';
/**
 * Parses an SPC file
 *
 * @param {object} buffer SPC file buffer
 * @return {object} Object containing every information contained in the SPC file
 */
export function parse(buffer) {
  const ioBuffer = new IOBuffer(buffer);
  const meta = mainHeader(ioBuffer);
  const spectra = readDataBlock(ioBuffer, meta);
  if (meta.logOffset && meta.logOffset !== 0) {
    return { meta, spectra, logs: readLogBlock(ioBuffer, meta.logOffset) };
  }
  return { meta, spectra };
}
