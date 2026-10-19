import type { MeasurementXYVariables } from 'cheminfo-types';
import { xySortX } from 'ml-spectra-processing';

/**
 * Label and units of the ordinate.
 */
export interface YAxis {
  /**
   * Axis label, e.g. `Absorbance`.
   */
  label: string;
  /**
   * Axis units, e.g. `%`.
   */
  units: string;
}

/**
 * The default ordinate of UVProbe spectra.
 */
export const absorbanceAxis: YAxis = { label: 'Absorbance', units: '' };

/**
 * Builds measurement variables for UVProbe spectra.
 * @param x - wavelength values (nm).
 * @param y - ordinate values.
 * @param yAxis - label and units of the ordinate.
 * @param shouldSortX - whether to sort by increasing wavelength.
 * @returns The `x`/`y` measurement variables.
 */
export function buildVariables(
  x: Float64Array,
  y: Float64Array,
  yAxis: YAxis = absorbanceAxis,
  shouldSortX = true,
): MeasurementXYVariables {
  const { x: oX, y: oY } = shouldSortX ? xySortX({ x, y }) : { x, y };
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
      label: yAxis.label,
      units: yAxis.units,
      data: oY,
      isDependent: true,
    },
  };
}
