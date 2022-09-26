import { Header, TheNewHeader } from '../fileHeader';

import { getDataShape } from './getDataShape';

/**
 * For now "ir" is ir-only spectra
 * uv could be: uv (only), uv-vis, uv-vis-nir, vis-nir.
 */
export type SpectraType = 'ir' | 'uv' | 'raman' | 'mass' | 'other';

/**
 * Inspects properties and tries to classify the spectra
 * For the most common spectra types
 * @param data the parsed data
 * @returns string describing the type of spectra ([[`SpectraType`]]) or "General" if unsure.
 */
export function guessSpectraType(meta: Header): SpectraType {
  //function tested with the `fileHeader.test.ts`
  const { xUnitsType: xU, yUnitsType: yU } = meta;
  // for the new file header they define a "experiment type"
  if (meta instanceof TheNewHeader) {
    // "General SPC" does not give any information
    if (!meta.experimentType.startsWith('General SPC')) {
      const id = meta.experimentType.split(' ')[0];
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
      return uvOrIR(meta, 'micrometer');
    case 'Wavenumber (cm-1)': {
      return uvOrIR(meta, 'wavenumber');
    }
    case 'Nanometers (nm)':
      if (
        [/*'Kubelka-Monk'*/ 'Absorbance', 'Log(1/R)', 'Transmission'].includes(
          yU,
        )
      ) {
        return uvOrIR(meta, 'nanometer');
      }
      return 'other';
    default:
      return 'other';
  }
}

type Regions = 'uv' | 'ir' | 'other';
/**
 * Further classify an X axis that is using "wavenumber" as uv or ir.
 * @param data - the parsed file (a jsonlike object)
 * @returns
 */
export function uvOrIR(
  meta: Header,
  xUnit: 'micrometer' | 'nanometer' | 'wavenumber',
): Regions {
  //tested in "parse" because of the input
  const dataShape = getDataShape(meta.parameters);

  //xyxy and exception won't normally get here anyways (raman or ms normally.)
  const analyze = ['Y', 'YY', 'XY', 'XYY'].includes(dataShape);

  if (analyze) {
    let sX = meta.startingX;
    let eX = meta.endingX;
    if (xUnit !== 'nanometer') {
      sX = unitToNano(sX, xUnit);
      eX = unitToNano(eX, xUnit);
    }
    const lowerBound = sX <= eX ? sX : eX;
    return getRegion(lowerBound);
  }

  return 'other';
}

/**
 * @param lb -  lower boundary in _nanometers_
 * @return type of spectra
 */
export function getRegion(lb: number): Regions {
  return lb < 150 ? 'other' : lb < 700 ? 'uv' : 'ir';
}

/**
 * Converts micrometers or wavenumber units to nanometers
 * This allows a unique way to determine the spectra region (using nanometers).
 * @param x - value
 * @param from - input unit to convert
 * @return equivalent in nanometers
 */
export function unitToNano(x: number, from: 'micrometer' | 'wavenumber') {
  return from === 'micrometer' ? x * 1000 : (1 / x) * 10 ** 7;
}
