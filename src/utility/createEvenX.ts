import { createFromToArray } from 'ml-spectra-processing';

/**
 * Creates evenly spaced X values from the first to the last one. A single
 * point is placed at `from`.
 * @param from - first X value.
 * @param to - last X value.
 * @param length - number of points.
 * @returns The X values.
 */
export function createEvenX(
  from: number,
  to: number,
  length: number,
): Float64Array {
  if (length === 1) return Float64Array.of(from);
  return createFromToArray({ from, to, length });
}
