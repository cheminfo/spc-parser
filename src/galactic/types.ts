/**
 * Meaning of an axis unit code.
 */
export interface UnitType {
  /**
   * Text of the code in SPC.H, e.g. `Wavenumber (cm-1)`.
   */
  text: string;
  /**
   * Axis label, e.g. `Wavenumber`.
   */
  label: string;
  /**
   * Axis units, e.g. `cm-1`; empty when the quantity has none.
   */
  units: string;
}

type Entry = [text: string, label: string, units: string];

const xzwTable = new Map<number, Entry>([
  [0, ['Arbitrary', 'Arbitrary', '']],
  [1, ['Wavenumber (cm-1)', 'Wavenumber', 'cm-1']],
  [2, ['Micrometers (um)', 'Micrometers', 'um']],
  [3, ['Nanometers (nm)', 'Nanometers', 'nm']],
  [4, ['Seconds', 'Seconds', 's']],
  [5, ['Minutes', 'Minutes', 'min']],
  [6, ['Hertz (Hz)', 'Hertz', 'Hz']],
  [7, ['Kilohertz (KHz)', 'Kilohertz', 'kHz']],
  [8, ['Megahertz (MHz)', 'Megahertz', 'MHz']],
  [9, ['Mass (M/z)', 'Mass', 'm/z']],
  [10, ['Parts per million (PPM)', 'Parts per million', 'ppm']],
  [11, ['Days', 'Days', 'd']],
  [12, ['Years', 'Years', '']],
  [13, ['Raman Shift (cm-1)', 'Raman Shift', 'cm-1']],
  [14, ['eV', 'Energy', 'eV']],
  [15, ['Text labels', 'Arbitrary', '']],
  [16, ['Diode Number', 'Diode Number', '']],
  [17, ['Channel', 'Channel', '']],
  [18, ['Degrees', 'Degrees', '']],
  [19, ['Temperature (F)', 'Temperature', '°F']],
  [20, ['Temperature (C)', 'Temperature', '°C']],
  [21, ['Temperature (K)', 'Temperature', 'K']],
  [22, ['Data Points', 'Data Points', '']],
  [23, ['Milliseconds (mSec)', 'Milliseconds', 'ms']],
  [24, ['Microseconds (uSec)', 'Microseconds', 'µs']],
  [25, ['Nanoseconds (nSec)', 'Nanoseconds', 'ns']],
  [26, ['Gigahertz (GHz)', 'Gigahertz', 'GHz']],
  [27, ['Centimeters (cm)', 'Centimeters', 'cm']],
  [28, ['Meters (m)', 'Meters', 'm']],
  [29, ['Millimeters (mm)', 'Millimeters', 'mm']],
  [30, ['Hours', 'Hours', 'h']],
  [255, ['Double interferogram', 'Double interferogram', '']],
]);

const yTable = new Map<number, Entry>([
  [0, ['Arbitrary Intensity', 'Arbitrary Intensity', '']],
  [1, ['Interferogram', 'Interferogram', '']],
  [2, ['Absorbance', 'Absorbance', '']],
  [3, ['Kubelka-Monk', 'Kubelka-Monk', '']],
  [4, ['Counts', 'Counts', '']],
  [5, ['Volts', 'Volts', '']],
  [6, ['Degrees', 'Degrees', '']],
  [7, ['Milliamps', 'Milliamps', '']],
  [8, ['Millimeters', 'Millimeters', '']],
  [9, ['Millivolts', 'Millivolts', '']],
  [10, ['Log(1/R)', 'Log(1/R)', '']],
  [11, ['Percent', 'Percent', '']],
  [12, ['Intensity', 'Intensity', '']],
  [13, ['Relative Intensity', 'Relative Intensity', '']],
  [14, ['Energy', 'Energy', '']],
  [16, ['Decibel', 'Decibel', '']],
  [19, ['Temperature (F)', 'Temperature', '°F']],
  [20, ['Temperature (C)', 'Temperature', '°C']],
  [21, ['Temperature (K)', 'Temperature', 'K']],
  [22, ['Index of Refraction [N]', 'Index of Refraction', '']],
  [23, ['Extinction Coeff. [K]', 'Extinction Coeff.', '']],
  [24, ['Real', 'Real', '']],
  [25, ['Imaginary', 'Imaginary', '']],
  [26, ['Complex', 'Complex', '']],
  [128, ['Transmission', 'Transmission', '']],
  [129, ['Reflectance', 'Reflectance', '']],
  [
    130,
    [
      'Arbitrary or Single Beam with Valley Peaks',
      'Arbitrary or Single Beam with Valley Peaks',
      '',
    ],
  ],
  [131, ['Emission', 'Emission', '']],
  [255, ['Reference Arbitrary Energy', 'Reference Arbitrary Energy', '']],
]);

const experimentTable = [
  'General SPC (could be anything)',
  'Gas Chromatogram',
  'General Chromatogram (same as SPCGEN with TCGRAM)',
  'HPLC Chromatogram',
  'FT-IR, FT-NIR, FT-Raman Spectrum or Igram (Can also be used for scanning IR.)',
  'NIR Spectrum (Usually multi-spectral data sets for calibration.)',
  'Unknown (code 6)',
  'UV-VIS Spectrum (Can be used for single scanning UV-VIS-NIR.)',
  'X-ray Diffraction Spectrum',
  'Mass Spectrum  (Can be single, GC-MS, Continuum, Centroid or TOF.)',
  'NMR Spectrum or FID',
  'Raman Spectrum (Usually Diode Array, CCD, etc. use SPCFTIR for FT-Raman.)',
  'Fluorescence Spectrum',
  'Atomic Spectrum',
  'Chromatography Diode Array Spectra',
];

/**
 * Gives meaning to an X, Z or W unit code (`fxtype`, `fztype`, `fwtype`).
 * @param code - the unit code.
 * @returns The text, label and units of the code; `Unknown (code N)` when
 * the code is not defined.
 */
export function xzwUnitType(code: number): UnitType {
  return toUnitType(xzwTable.get(code), code);
}

/**
 * Gives meaning to a Y unit code (`fytype`).
 * @param code - the unit code.
 * @returns The text, label and units of the code; `Unknown (code N)` when
 * the code is not defined.
 */
export function yUnitType(code: number): UnitType {
  return toUnitType(yTable.get(code), code);
}

/**
 * Gives meaning to x, z or w type codes.
 * @param xzwType - x, z or w type code.
 * @returns String corresponding to the code.
 */
export function xzwTypes(xzwType: number): string {
  return xzwUnitType(xzwType).text;
}

/**
 * Gives meaning to y type codes.
 * @param yType - y type code.
 * @returns String corresponding to the code.
 */
export function yTypes(yType: number): string {
  return yUnitType(yType).text;
}

/**
 * Convert code to experiment type.
 * @param code - experiment type code (`fexper`).
 * @param isChromatogram - whether TCGRAM is set, which turns the general
 * code 0 into a chromatogram.
 * @returns type of experiment carried out.
 */
export function experimentSettings(code: number, isChromatogram = false) {
  if (code === 0 && isChromatogram) return 'General Chromatogram';
  return experimentTable[code] ?? `Unknown (code ${code})`;
}

/**
 * Converts a table entry.
 * @param entry - the entry, undefined for an unknown code.
 * @param code - the code.
 * @returns The unit type.
 */
function toUnitType(entry: Entry | undefined, code: number): UnitType {
  if (!entry) {
    const text = `Unknown (code ${code})`;
    return { text, label: text, units: '' };
  }
  return { text: entry[0], label: entry[1], units: entry[2] };
}
