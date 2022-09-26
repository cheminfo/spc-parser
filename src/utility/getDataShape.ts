import {FlagParameters} from "./headerUtils";
/**
 * The new file format records as:
 * - Y. X is implicit (calc from XStart, XEnd, Y.length)
 * - XY. Single Y uneven, explicit X.
 * - YY. Multiple spectra (Ys), implicit, unique, even X.
 * - XYY. Multiple Ys, one unique, uneven X.
 * - XYYX. Multiple Ys, Multiple Xs (even or not, I think, but will be explicit).
 * The old file format records only: Y or YY.
 *
 */
export type DataShape = 'Y' | 'XY' | 'YY' | 'XYY' | 'XYXY' | 'exception';

/** Get how the data was stored
 * @param multiFile - whether there are multiple spectra (subfiles) or not.
 * @param xy - uneven x values
 * @param xyxy - multifile with separate x axis
 * @return the shape of the data as a string
 */
export function getDataShape({
  multiFile,
  xy,
  xyxy,
}: FlagParameters): DataShape {
  /* single file */
  if (!multiFile) {
    // Y or XY,
    return !xy ? 'Y' : xyxy ? 'exception' : 'XY';
  }

  /* then multifile */
  if (!xy) {
    /* even X - equidistant */
    return 'YY';
  } else {
    // uneven x
    return !xyxy ? 'XYY' : 'XYXY';
  }
}

