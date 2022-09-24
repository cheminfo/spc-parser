import { TheNewHeader } from './fileHeader';
import { ParseResult } from './parse';

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

/* other possible additions
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
/**
 * Inspects properties and tries to classify the spectra
 * For the most common spectra types
 * @param data the parsed data
 * @returns string describing the type of spectra ([[`SpectraType`]]) or "General" if unsure.
 */
export function guessType(data: ParseResult): SpectraType {
  //function tested with the `fileHeader.test.ts`
  const { xUnitsType: xU, yUnitsType: yU } = data.meta;

  // for the new file header they define a "experiment type"
  if (data.meta instanceof TheNewHeader) {
    // "General SPC" does not give any information
    if (!data.meta.experimentType.startsWith('General SPC')) {
      let id = data.meta.experimentType.split(' ')[0];
      switch (
        id //find all possible ids in `types.ts` file
      ) {
        case 'FT-IR,':
          return 'ir';
        case 'NIR':
          return 'ir';
        case 'UV-VIS':
          return 'uv';
        case 'Mass':
          return 'mass';
        case 'Raman':
          return 'raman';
        default:
          return 'other';
      }
    }
  }
  // for old header or General SPC
  switch (xU) {
    case 'Mass (M/z)':
      return 'mass';
    case 'Raman Shift (cm-1)':
      return 'raman';
    case 'Micrometers (um)':
      return 'ir';
    case 'Wavenumber (cm-1)': {
      const range = uvOrIR(data, 'wavenumber');
      if (range === null) return 'other';
      return range;
    }
    case 'Nanometers (nm)':
      if (
        ['Kubelka-Monk', 'Absorbance', 'Log(1/R)', 'Transmission'].includes(yU)
      ) {
        const range = uvOrIR(data, 'nanometers');
        if (range === null) return 'other';
        return range;
      }
      return 'other';
    default:
      return 'other';
  }
}

//`xyxy` and `exception` are left for the future.
// this is just to distinguins uv-ir from only ir

/**
 * Further classify an X axis that is using "wavenumber" as uv or ir.
 * @param data - the parsed file (a jsonlike object)
 * @returns
 */
export function uvOrIR(data: ParseResult, xUnit: string): 'uv' | 'ir' | null {
  //tested in "parse" because of the input
  const dataShape = getDataShape(data.meta.parameters);
  const analyze = ['Y', 'YY', 'XY', 'XYY'].includes(dataShape);
  if (analyze) {
    const { startingX: sX, endingX: eX } = data.meta;
    if (areTooClose(sX, eX)) return null;

    const lowerBound = sX < eX ? sX : eX;
    if (xUnit === 'nanometers' && lowerBound < 150) return null; //could be X-rays maybe
    if (xUnit === 'wavenumber' && lowerBound > 66666) return null; //
    // then there may be a spectrum
    return getSpectrumRegion(lowerBound, xUnit);
  }
  return null;
}

/**
 * check whether this does not look like a standard spectra
 * @param  startX
 * @param  endX
 * @returns
 */
export function areTooClose(startX: number, endX: number): boolean {
  return Math.abs(startX - endX) < 200;
}

/**
 * @param lb
 * @return type of spectra
 */
export function getSpectrumRegion(lb: number, xUnit: string): 'uv' | 'ir' {
  if (xUnit === 'nanometers') return lb > 700 ? 'ir' : 'uv';
  return lb < 14285 ? 'ir' : 'uv';
}
