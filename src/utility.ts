import { Header } from './fileHeader';

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
export type DataShape = 'Y' | 'XY' | 'YY' | 'XYY' | 'XYXY';

/** Get how the data was stored 
 * @param multiFile - whether there are multiple spectra (subfiles) or not.
 * @param xy - uneven x values
 * @param xyxy - multifile with separate x axis
 * @return the shape of the data as a string
 */
export function getDataShape(multifile:boolean,xy:boolean,xyxy:boolean): DataShape {

  /* single file */
  if (!multiFile) {// Y or XY, 
   // XYXY is an exeption detailed at page 11 
   //https://ensembles-eu.metoffice.gov.uk/met-res/aries/technical/GSPC_UDF.PDF
    return !xy ? 'Y' : xyxy ? "XYXY" : 'XY';
  } 

  /* then multifile */
  if (!xy) { /* even X - equidistant */
    return 'YY';
  } else { // uneven x
    return !xyxy ? 'XYY' : 'XYXY';
  }
}

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
  public xyxy: boolean;
  public xy: boolean;
  constructor(flag: number) {
    this.y16BitPrecision = (flag & 1) !== 0; //Y values are 16 bits instead of 32
    this.useExperimentExtension = (flag & 2) !== 0; //Enable experiment mode
    this.multiFile = (flag & 4) !== 0; //Multiple spectra (multifile)
    this.zValuesRandom = (flag & 8) !== 0; //Z values in random order if multiFile
    this.zValuesUneven = (flag & 16) !== 0; //Z values ordered but unevenly spaced if multi
    this.customAxisLabels = (flag & 32) !== 0; //Custom labels
    this.xyxy = (flag & 64) !== 0; //One X array per subfile, for discontinuous curves
    this.xy = (flag & 128) !== 0; // Non-evenly spaced X, X before Y
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
 * For now ir is only ir spectra
 * uv could be: uv (only), uv-vis, uv-vis-nir, vis-nir. 
 */
export type SpectraType = 'ir' | 'uv' | 'raman' | 'mass' | 'other';

/**
 * Inspects properties and tries to classify the spectra
 * For the most common spectra types
 * @param Header
 * @returns string describing the type of spectra or "General" if unsure.
 */
export function guessType(fileHeader: Header): SpectraType {

  const { xUnitsType: xU, yUnitsType: yU } = fileHeader;

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
