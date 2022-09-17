import { Header } from './mainHeader';

export interface SubFlagParameters {
  changed: boolean;
  noPeakTable: boolean;
  modifiedArithmetic: boolean;
}

export interface FlagParameters {
  y16BitPrecision: boolean;
  useExperimentExtension: boolean;
  multiFile: boolean;
  zValuesRandom: boolean;
  zValuesUneven: boolean;
  customAxisLabels: boolean;
  xyxy: boolean;
  xy: boolean;
}

/**
 * Gets the parameter in each bit of the flag
 *
 * @param  flag First byte of the main header.
 * @returns  The parameters.
 */
export function getFlagParameters(flag: number): FlagParameters {
  const parameters: FlagParameters = {
    y16BitPrecision: (flag & 1) !== 0, //Y values are 16 bits instead of 32
    useExperimentExtension: (flag & 2) !== 0, //Enable experiment mode
    multiFile: (flag & 4) !== 0, //Multiple spectra
    zValuesRandom: (flag & 8) !== 0, //Z values in random order if multiFile
    zValuesUneven: (flag & 16) !== 0, //Z values ordered but unevenly spaced if multi
    customAxisLabels: (flag & 32) !== 0, //Custom labels
    xyxy: (flag & 64) !== 0, //One X array per subfile, for discontinuous curves
    xy: (flag & 128) !== 0, // Non-evenly spaced X, X before Y
  }; //Z is time

  return parameters;
}

/**
 * Gets the Subfile flags.
 *
 * @param  flag First byte of the subheader.
 * @return The parameters.
 */
export function getSubFlagParameters(flag: number): SubFlagParameters {
  const parameters = {
    changed: (flag & 1) !== 0,
    noPeakTable: (flag & 8) !== 0,
    modifiedArithmetic: (flag & 128) !== 0,
  };
  return parameters;
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
 */
export type SpectraType =
  | 'IR'
  | 'Raman'
  | 'Chromatogram'
  | 'Mass'
  | 'Atomic-UV-Vis-NIR'
  | 'NMR'
  | 'X-Ray'
  | 'Fluorescence'
  | 'Atomic'
  | 'General';

/**
 * Inspects properties and tries to classify the spectra
 * For the most common spectra types
 * @param Header
 * @returns string describing the type of spectra or "General" if unsure.
 */
export function guessType(header: Header): SpectraType {
  let theType: SpectraType = 'General';
  //xStart and xEnd could be used to narrow down NIR, MIR, FIR
  //and so on. But it is not important yet.
  const { xUnitsType: xU, yUnitsType: yU } = header;
  switch (xU) {
    case 'Mass (M/z)':
      theType = 'Mass';
      break;
    case 'Parts per million (PPM)':
      theType = 'NMR';
      break;
    case 'Raman Shift (cm-1)':
      theType = 'Raman';
      break;
    case 'Wavenumber (cm-1)':
    case 'Micrometers (um)':
      theType = 'IR';
      break;
    case 'Nanometers (nm)':
      if (yU === 'Counts') {
        //Or Phosphorescence, but that less common analysis.
        theType = 'Fluorescence';
      } else if (
        yU === 'Absorbance' ||
        yU === 'Log(1/R)' ||
        yU === 'Transmission'
      ) {
        theType = 'Atomic-UV-Vis-NIR';
      }
      break;
    case 'eV':
      theType = 'X-Ray';
      break;
    default:
      theType = 'General';
  }
  return theType;
}
