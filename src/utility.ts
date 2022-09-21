import { Header } from './fileHeader';

/**
 * The new file format records as:
 * - Y. X is implicit (calc from XStart, XEnd, Y.length)
 * - XY. Single Y uneven, explicit X.
 * - YY. Multiple spectra (Ys), implicit, unique, even X.
 * - XYY. Multiple Ys, one unique, uneven X.
 * - XYYX. Multiple Ys, Multiple Xs (even or not, I think, but will be explicit).
 * The old file format records only: Y or YY./
 *
 * @param multiFile - whether there are multiple spectra (subfiles) or not.
 * @param flag - holds information about how the data is classified
 * @return the shape of the data
 */
export function dataShape(multiFile: boolean, flag: number): DataShape {
  const xy = (flag & 128) !== 0; // Non-evenly spaced X, X before Y
  const xyxy = (flag & 64) !== 0; //One X array per subfile, for discontinuous curves

  if (!multiFile) {
    //single file: Y or XY
    return !xy ? 'Y' : 'XY';
  }
  //multifile
  if (!xy) {
    //one shared even X - equidistant
    return 'YY';
  } else {
    //uneven x, multifile
    return !xyxy ? 'XYY' : 'XYXY';
  }
}

export type DataShape = 'Y' | 'XY' | 'YY' | 'XYY' | 'XYXY';
/**
 * Gets the parameter in each bit of the flag
 *
 * @param  flag First byte of the main header.
 * @returns  The parameters.
 */
export class FlagParameters {
  public y16BitPrecision: boolean;
  public useExperimentExtension: boolean;
  public multiFile: boolean;
  public zValuesRandom: boolean;
  public zValuesUneven: boolean;
  public customAxisLabels: boolean;
  public dataShape: DataShape;
  constructor(flag: number) {
    this.y16BitPrecision = (flag & 1) !== 0; //Y values are 16 bits instead of 32
    this.useExperimentExtension = (flag & 2) !== 0; //Enable experiment mode
    this.multiFile = (flag & 4) !== 0; //Multiple spectra (multifile)
    this.zValuesRandom = (flag & 8) !== 0; //Z values in random order if multiFile
    this.zValuesUneven = (flag & 16) !== 0; //Z values ordered but unevenly spaced if multi
    this.customAxisLabels = (flag & 32) !== 0; //Custom labels
    this.dataShape = dataShape(this.multiFile, flag);
  }
}

/**
 * Gets the Subfile flags.
 *
 * @param  flag First byte of the subheader.
 * @return The parameters.
 */
export class SubFlagParameters {
  public changed: boolean;
  public noPeakTable: boolean;
  public modifiedArithmetic: boolean;
  constructor(flag: number) {
    this.changed = (flag & 1) !== 0;
    this.noPeakTable = (flag & 8) !== 0;
    this.modifiedArithmetic = (flag & 128) !== 0;
  }
}

/**
 * Gets the date encoded in binary in a long number.
 * @param  long Binary date.
 * @return  Date formatted to ISO 8601:2019 convention.
 */
export function longToDate(long: number): string {
  if (long === 0) {
    return '0000-00-00T00:00:00.00Z';
  }
  const date = new Date();
  date.setUTCFullYear(long >> 20);
  date.setUTCMonth(((long >> 16) & 0x0f) - 1);
  date.setUTCDate((long >> 11) & 0x1f);
  date.setUTCHours((long >> 6) & 0x1f);
  date.setUTCMinutes(long & 0x3f);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date.toISOString();
}

/**
 * Classification of standard spectra out of basic
 * `meta` properties
 * Fluorescence could be Atomic or molecular,
 * IR,NIR etc could be standard or the FT ones
 * But if they are not transformed already, they'd
 * fall in the General category.
 */
export type SpectraType = 'ir' | 'uv' | 'raman' | 'mass' | 'other';

/**
 * Inspects properties and tries to classify the spectra
 * For the most common spectra types
 * @param Header
 * @returns string describing the type of spectra or "General" if unsure.
 */
export function guessType(header: Header): SpectraType {
  //xStart and xEnd could be used to narrow down NIR, MIR, FIR
  //and so on. But it is not important yet.
  const { xUnitsType: xU, yUnitsType: yU } = header;
  switch (xU) {
    case 'Mass (M/z)':
      return 'mass';
    case 'Raman Shift (cm-1)':
      return 'raman';
    case 'Micrometers (um)':
      return 'ir';
    case 'Wavenumber (cm-1)':
      return 'uv'; //'UV-Vis-IR';
    case 'Nanometers (nm)':
      if (yU === 'Absorbance' || yU === 'Log(1/R)' || yU === 'Transmission') {
        return 'uv'; // 'Atomic-UV-Vis-NIR';
      }
      return 'other';
    default:
      return 'other';
    /** other possible additions
         else if (yU === 'Counts') {
             //'Fluorescence';
          }
         else if(yU==='Kubelka-Monk'){
            //'Diffuse Reflectance'
          }
        case 'eV':
          //return 'X-Ray';
        case 'Minutes':
          //return 'Chromatogram';
        case 'Parts per million (PPM)':
          //theType = 'nmr';
    */
  }
}
