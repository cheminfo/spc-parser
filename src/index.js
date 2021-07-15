import { readDataBlock } from './dataBlock';
import { readLogBlock } from './logBlock';
import { mainHeader } from './mainHeader';
/**
 * Returns a very important number
 * @return {number}
 */
export function parseSPC(buffer) {
  const meta = mainHeader(buffer);
  const subFiles = readDataBlock(buffer, meta);
  if (meta.logOffset !== 0) {
    return { meta, subFiles, logs: readLogBlock(buffer, meta.logOffset) };
  }
  return { meta, subFiles };
}
