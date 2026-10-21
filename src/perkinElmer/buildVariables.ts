import type { MeasurementXYVariables } from 'cheminfo-types';
import { xySortX } from 'ml-spectra-processing';

interface AxisLabel {
  label: string;
  units: string;
}

const abscissas = new Map<string, AxisLabel>([
  ['nm', { label: 'Wavelength', units: 'nm' }],
  ['cm-1', { label: 'Wavenumber', units: 'cm-1' }],
]);

const ordinates = new Map<string, AxisLabel>([
  ['a', { label: 'Absorbance', units: '' }],
  ['%t', { label: 'Transmittance', units: '%' }],
  ['%r', { label: 'Reflectance', units: '%' }],
]);

/**
 * Builds the measurement variables of a PerkinElmer spectrum. The axis codes
 * of the file (`nm`, `cm-1`, `A`, `%T`, `%R`, any case) are turned into a
 * label and units; an unknown code is used as both.
 * @param x - X values.
 * @param y - Y values.
 * @param xCode - X axis code of the file.
 * @param yCode - Y axis code of the file.
 * @param shouldSortX - whether to sort by increasing X.
 * @returns The `x`/`y` measurement variables.
 */
export function buildVariables(
  x: Float64Array,
  y: Float64Array,
  xCode: string,
  yCode: string,
  shouldSortX: boolean,
): MeasurementXYVariables {
  const { x: oX, y: oY } = shouldSortX ? xySortX({ x, y }) : { x, y };
  return {
    x: {
      symbol: 'x',
      ...getAxisLabel(abscissas, xCode),
      data: oX,
      isDependent: false,
    },
    y: {
      symbol: 'y',
      ...getAxisLabel(ordinates, yCode),
      data: oY,
      isDependent: true,
    },
  };
}

/**
 * Looks an axis code up, case-insensitively.
 * @param labels - known codes, lowercase.
 * @param code - code of the file.
 * @returns Label and units of the axis.
 */
function getAxisLabel(labels: Map<string, AxisLabel>, code: string) {
  return labels.get(code.toLowerCase()) ?? { label: code, units: code };
}
