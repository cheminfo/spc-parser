import type { UvProbeMeta } from '../../uvProbe/types.ts';
import type { Header } from '../fileHeader.ts';

import { getDataShape } from './getDataShape.ts';

/**
 * For now "ir" is ir-only spectra
 * uv could be: uv (only), uv-vis, uv-vis-nir, vis-nir.
 */
export type SpectraType = 'ir' | 'uv' | 'raman' | 'mass' | 'other';

/**
 * Spectrum types given by the experiment codes (`fexper`) that tell one.
 */
const experimentTypes = new Map<number, SpectraType>([
  [4, 'ir'],
  [5, 'ir'],
  [7, 'uv'],
  [9, 'mass'],
  [11, 'raman'],
]);

/**
 * Y codes (absorbance, log(1/R), transmission) whose nanometer X axis can be
 * classified by its range.
 */
const opticalYCodes = new Set([2, 10, 128]);

/**
 * Inspects properties and tries to classify the spectra for the most common spectra types.
 * Shimadzu UVProbe files (`kind` `'ole'` or `'flat'`) are always `'uv'`.
 * @param meta - the parsed file header (`result.meta`).
 * @returns string describing the type of spectra or "other" if unsure.
 */
export function guessSpectraType(meta: Header | UvProbeMeta): SpectraType {
  return meta.kind === 'new' || meta.kind === 'old'
    ? guessGalacticType(meta)
    : 'uv';
}

/**
 * Classifies a Galactic file from its experiment, X and Y codes.
 * @param meta - the parsed Galactic header.
 * @returns The spectrum type, or "other" if unsure.
 */
function guessGalacticType(meta: Header): SpectraType {
  const { experiment, x, y } = meta.codes;
  // Codes 1 to 14 name a technique; 0 (general), 6 and others do not.
  if (experiment >= 1 && experiment <= 14 && experiment !== 6) {
    return experimentTypes.get(experiment) ?? 'other';
  }
  switch (x) {
    case 9:
      return 'mass';
    case 13:
      return 'raman';
    case 2:
      return uvOrIR(meta, 'micrometer');
    case 1:
      return uvOrIR(meta, 'wavenumber');
    case 3:
      return opticalYCodes.has(y) ? uvOrIR(meta, 'nanometer') : 'other';
    default:
      return 'other';
  }
}

type Regions = 'uv' | 'ir' | 'other';
/**
 * Further classify an X axis that is using "wavenumber" as uv or ir.
 * @param meta - the parsed file header.
 * @param xUnit - the unit of the X axis.
 * @returns the region classification.
 */
export function uvOrIR(
  meta: Header,
  xUnit: 'micrometer' | 'nanometer' | 'wavenumber',
): Regions {
  //tested in "parse" because of the input
  const dataShape = getDataShape(meta.parameters);

  //xyxy and exception won't normally get here anyways (raman or ms normally.)
  const isAnalyze = ['Y', 'YY', 'XY', 'XYY'].includes(dataShape);

  if (isAnalyze) {
    let startX = meta.startingX;
    let endX = meta.endingX;
    if (xUnit !== 'nanometer') {
      startX = unitToNano(startX, xUnit);
      endX = unitToNano(endX, xUnit);
    }
    const lowerBound = Math.min(startX, endX);
    return getRegion(lowerBound);
  }

  return 'other';
}

/**
 * Determines the spectral region from a wavelength boundary.
 * @param lb - lower boundary in nanometers.
 * @returns type of spectra.
 */
export function getRegion(lb: number): Regions {
  return lb < 150 ? 'other' : lb < 700 ? 'uv' : 'ir';
}

/**
 * Converts micrometers or wavenumber units to nanometers
 * This allows a unique way to determine the spectra region (using nanometers).
 * @param x - value
 * @param from - input unit to convert
 * @returns equivalent in nanometers
 */
export function unitToNano(x: number, from: 'micrometer' | 'wavenumber') {
  return from === 'micrometer' ? x * 1000 : (1 / x) * 10 ** 7;
}
