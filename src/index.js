import { mainHeader } from './mainHeader';
import { xPoints } from './utility';
/**
 * Returns a very important number
 * @return {number}
 */
export function parseSPC(buffer) {
  const meta = mainHeader(buffer);
  if (!meta.parameters.xyxy) {
    meta.xPoints = xPoints(meta.startingX, meta.endingX, meta.numberPoints);
  }
  return { meta };
}
