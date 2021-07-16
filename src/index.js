import { readDataBlock } from './dataBlock';
import { readLogBlock } from './logBlock';
import { mainHeader } from './mainHeader';
/**
 * Parses an SPC file
 *
 * @param {object} buffer SPC file buffer
 * @return {object} Object containing every information contained in the SPC file
 */
export function parseSPC(buffer) {
  const meta = mainHeader(buffer);
  const spectra = readDataBlock(buffer, meta);
  if (meta.logOffset && meta.logOffset !== 0) {
    return { meta, spectra, logs: readLogBlock(buffer, meta.logOffset) };
  }
  return { meta, spectra };
}
