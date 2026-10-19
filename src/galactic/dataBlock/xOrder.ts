import { xGetSortOrder, xIsMonotonic, xySortX } from 'ml-spectra-processing';

/**
 * Order of the X values as stored in the file.
 * `unordered` also covers a file whose spectra do not share one direction.
 */
export type XDirection = 'increasing' | 'decreasing' | 'unordered';

/**
 * How to bring an X array into increasing order.
 */
export interface XOrder {
  direction: XDirection;
  /**
   * Permutation that sorts an unordered X, when it is worth computing once.
   * @default undefined
   */
  order?: Uint32Array;
}

/**
 * Below this length, sorting each spectrum on its own is as fast as reusing
 * a permutation.
 */
const minimumPermutationLength = 256;

const cache = new WeakMap<Float64Array, XOrder>();

/**
 * Gets the order of an X array. The result is cached per array, so that the
 * spectra of a common-X file reuse the order computed for the first one.
 * @param x - X values, not modified afterwards.
 * @returns The direction of X and, when unordered, its sorting permutation.
 */
export function getXOrder(x: Float64Array): XOrder {
  let xOrder = cache.get(x);
  if (!xOrder) {
    xOrder = computeXOrder(x);
    cache.set(x, xOrder);
  }
  return xOrder;
}

/**
 * How {@link applyXOrder} treats the X array.
 */
export interface ApplyXOrderOptions {
  /**
   * Whether to sort by increasing X.
   */
  shouldSortX: boolean;
  /**
   * X belongs to this spectrum only: it is taken over (and possibly reversed
   * in place) instead of copied.
   * @default false
   */
  isXOwned?: boolean;
}

/**
 * Returns the spectrum with its own X, sorted by increasing X unless
 * `shouldSortX` is false. The Y array is taken over: it may be reversed in place.
 * @param x - X values, never modified unless `isXOwned` is set.
 * @param y - Y values, owned by this spectrum.
 * @param xOrder - the order of X, from {@link getXOrder}.
 * @param options - sorting and ownership of X.
 * @returns The X and Y arrays of the spectrum.
 */
export function applyXOrder(
  x: Float64Array,
  y: Float64Array,
  xOrder: XOrder,
  options: ApplyXOrderOptions,
): { x: Float64Array; y: Float64Array } {
  const { shouldSortX, isXOwned = false } = options;
  if (!shouldSortX || xOrder.direction === 'increasing') {
    return { x: isXOwned ? x : x.slice(), y };
  }
  if (xOrder.direction === 'decreasing') {
    // In place on fresh arrays: TypedArray#toReversed is about 2x slower.
    const reversedX = isXOwned ? x : x.slice();
    reversedX.reverse();
    y.reverse();
    return { x: reversedX, y };
  }
  const { order } = xOrder;
  if (!order) return xySortX({ x, y });
  const sortedX = new Float64Array(order.length);
  const sortedY = new Float64Array(order.length);
  for (let i = 0; i < order.length; i++) {
    const at = order[i] as number;
    sortedX[i] = x[at] as number;
    sortedY[i] = y[at] as number;
  }
  return { x: sortedX, y: sortedY };
}

/**
 * Computes the order of an X array.
 * @param x - X values.
 * @returns The direction and, for a long unordered X, the permutation.
 */
function computeXOrder(x: Float64Array): XOrder {
  if (x.length < 2) return { direction: 'increasing' };
  const monotonic = xIsMonotonic(x);
  if (monotonic === 1) return { direction: 'increasing' };
  if (monotonic === -1) return { direction: 'decreasing' };
  if (x.length < minimumPermutationLength) return { direction: 'unordered' };
  return { direction: 'unordered', order: xGetSortOrder(x) };
}
