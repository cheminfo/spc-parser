import type { MeasurementXYVariables } from 'cheminfo-types';
import { xySortX } from 'ml-spectra-processing';

/**
 * Builds increasing-X measurement variables for UVProbe absorbance spectra.
 * @param x - wavelength values (nm).
 * @param y - absorbance values.
 * @returns The `x`/`y` measurement variables with increasing wavelength.
 */
export function buildVariables(
  x: Float64Array,
  y: Float64Array,
): MeasurementXYVariables {
  const { x: oX, y: oY } = xySortX({ x, y });
  return {
    x: {
      symbol: 'x',
      label: 'Wavelength',
      units: 'nm',
      data: oX,
      isDependent: false,
    },
    y: {
      symbol: 'y',
      label: 'Absorbance',
      units: '',
      data: oY,
      isDependent: true,
    },
  };
}
