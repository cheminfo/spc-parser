import { readDataBlock } from './dataBlock';
import { mainHeader } from './mainHeader';
/**
 * Returns a very important number
 * @return {number}
 */
export function parseSPC(buffer) {
  const meta = mainHeader(buffer);
  const subFiles = readDataBlock(buffer, meta);
  return { meta, subFiles };
}
