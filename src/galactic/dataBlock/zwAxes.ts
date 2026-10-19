import type { ParseContext } from '../../utility/ParseContext.ts';
import type { FlagParameters } from '../utility/headerUtilities.ts';

import type { SpectrumMeta } from './shared.ts';

/**
 * How the Z values of a multifile are spaced.
 */
export type ZSpacing = 'even' | 'ordered' | 'random';

/**
 * File-level description of the Z and W axes.
 */
export interface ZwLayout {
  /**
   * Spacing of the Z values (multifiles only).
   * @default undefined
   */
  zSpacing?: ZSpacing;
  /**
   * Number of consecutive subfiles in one W plane (4D files only).
   * @default undefined
   */
  planeSize?: number;
}

/**
 * Header values that govern the Z and W axes.
 */
export interface ZwHeader {
  /**
   * File flags.
   */
  parameters: FlagParameters;
  /**
   * Number of subfiles announced by the header (`fnsub`, or the count read).
   */
  spectra: number;
  /**
   * `fzinc`, the even-Z increment (0 in the old format).
   * @default 0
   */
  zSubIncrement?: number;
  /**
   * `fwplanes`, the number of W planes.
   * @default 0
   */
  wPlanes?: number;
  /**
   * `fwinc`, the W increment between planes.
   * @default 0
   */
  wPlaneIncrement?: number;
}

/**
 * Interprets the Z and W values of every subfile (SPC.H and GSPCIO rules):
 * even Z is computed from the first subfile and restarts in every W plane,
 * ordered or random Z is the stored `subtime`, and each W plane groups
 * `fnsub / fwplanes` consecutive subfiles. Sets `z`, `zEnd`, `w`, `plane`
 * and `noise` on each spectrum meta; raw fields are left untouched.
 * @param metas - the spectrum metadata, in file order.
 * @param header - header values of the file.
 * @param context - receives the warnings.
 * @returns The Z spacing and the plane size.
 */
export function applyZwAxes(
  metas: SpectrumMeta[],
  header: ZwHeader,
  context: ParseContext,
): ZwLayout {
  for (const meta of metas) {
    const noise = getNoise(meta.noiseValue);
    if (noise !== undefined) meta.noise = noise;
  }
  if (!header.parameters.multiFile || metas.length === 0) return {};

  const planeSize = getPlaneSize(header, metas.length, context);
  const zSpacing = getZSpacing(header.parameters);
  if (zSpacing === 'even') {
    setEvenZ(metas, header.zSubIncrement ?? 0, planeSize ?? metas.length);
  } else {
    for (const meta of metas) {
      setIfFinite(meta, 'z', meta.startingZ);
      setIfFinite(meta, 'zEnd', meta.endingZ);
    }
  }
  if (header.wPlanes) setW(metas, header.wPlaneIncrement ?? 0, planeSize);
  return planeSize === undefined ? { zSpacing } : { zSpacing, planeSize };
}

/**
 * Z spacing declared by the file flags.
 * @param parameters - file flags.
 * @returns The spacing.
 */
function getZSpacing(parameters: FlagParameters): ZSpacing {
  if (parameters.zValuesRandom) return 'random';
  return parameters.zValuesUneven ? 'ordered' : 'even';
}

/**
 * Computes the number of subfiles per W plane.
 * @param header - header values of the file.
 * @param count - number of subfiles read.
 * @param context - receives the warnings.
 * @returns The plane size, or `undefined` without (valid) W planes.
 */
function getPlaneSize(
  header: ZwHeader,
  count: number,
  context: ParseContext,
): number | undefined {
  const { wPlanes = 0 } = header;
  if (wPlanes === 0) return undefined;
  const total = header.spectra || count;
  if (total % wPlanes !== 0) {
    context.warn(
      `fwplanes (${wPlanes}) does not divide the number of subfiles (${total}); W planes ignored and raw W values kept`,
    );
    return undefined;
  }
  return total / wPlanes;
}

/**
 * Sets evenly spaced Z values. The increment is `fzinc`, or the difference
 * between `subnext` and `subtime` of the first subfile; when it is unusable
 * the stored Z values are used if they differ, otherwise the position.
 * @param metas - the spectrum metadata.
 * @param zIncrement - `fzinc`.
 * @param planeSize - subfiles per W plane (Z restarts in each plane).
 */
function setEvenZ(
  metas: SpectrumMeta[],
  zIncrement: number,
  planeSize: number,
): void {
  const first = metas[0] as SpectrumMeta;
  const start = first.startingZ;
  const increment = zIncrement || first.endingZ - start;
  if (increment !== 0 && Number.isFinite(increment) && Number.isFinite(start)) {
    for (let n = 0; n < metas.length; n++) {
      (metas[n] as SpectrumMeta).z = start + increment * (n % planeSize);
    }
    return;
  }
  const isUseStored = hasDistinctFiniteZ(metas);
  for (let n = 0; n < metas.length; n++) {
    const meta = metas[n] as SpectrumMeta;
    if (isUseStored) {
      setIfFinite(meta, 'z', meta.startingZ);
    } else {
      meta.z = n % planeSize;
    }
  }
}

/**
 * Checks whether the stored Z values are finite and not all equal.
 * @param metas - the spectrum metadata.
 * @returns True when the stored Z values carry information.
 */
function hasDistinctFiniteZ(metas: SpectrumMeta[]): boolean {
  const start = (metas[0] as SpectrumMeta).startingZ;
  if (!Number.isFinite(start)) return false;
  let isDistinct = false;
  for (let n = 1; n < metas.length; n++) {
    const z = (metas[n] as SpectrumMeta).startingZ;
    if (!Number.isFinite(z)) return false;
    if (z !== start) isDistinct = true;
  }
  return isDistinct;
}

/**
 * Sets the W value and plane of every subfile of a 4D file.
 * @param metas - the spectrum metadata.
 * @param wIncrement - `fwinc`.
 * @param planeSize - subfiles per plane, `undefined` when unusable.
 */
function setW(
  metas: SpectrumMeta[],
  wIncrement: number,
  planeSize: number | undefined,
): void {
  if (planeSize === undefined) {
    for (const meta of metas) setIfFinite(meta, 'w', meta.wAxisValue);
    return;
  }
  const start = (metas[0] as SpectrumMeta).wAxisValue;
  for (let n = 0; n < metas.length; n++) {
    const meta = metas[n] as SpectrumMeta;
    const plane = Math.floor(n / planeSize);
    meta.plane = plane;
    const w = wIncrement
      ? start + wIncrement * plane
      : (metas[plane * planeSize] as SpectrumMeta).wAxisValue;
    setIfFinite(meta, 'w', w);
  }
}

/**
 * Sets an interpreted numeric field only when the value is finite.
 * @param meta - the spectrum metadata.
 * @param key - the field to set.
 * @param value - the value.
 */
function setIfFinite(
  meta: SpectrumMeta,
  key: 'z' | 'zEnd' | 'w',
  value: number,
): void {
  if (Number.isFinite(value)) meta[key] = value;
}

const noiseView = new DataView(new ArrayBuffer(4));

/**
 * Peak-pick noise level, valid only when the high byte of `subnois` is not 0.
 * @param value - `subnois` as a float.
 * @returns The noise level, or `undefined` when it is not set.
 */
function getNoise(value: number): number | undefined {
  noiseView.setFloat32(0, value);
  if (noiseView.getUint8(0) === 0 || !Number.isFinite(value)) return undefined;
  return value;
}
