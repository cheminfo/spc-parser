import type { MeasurementXYVariables } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

import { decodeText } from '../../utility/decodeText.ts';
import type { Header } from '../fileHeader.ts';

import { applyXOrder, getXOrder } from './xOrder.ts';

/**
 * The flags encoded in the first byte of the subheader.
 */
export interface SubFlagParameters {
  changed: boolean;
  noPeakTable: boolean;
  modifiedArithmetic: boolean;
}

/**
 * Gets the Subfile flags.
 * @param flag - First byte of the subheader.
 * @returns The parameters.
 */
export function parseSubFlagParameters(flag: number): SubFlagParameters {
  return {
    changed: (flag & 1) !== 0,
    noPeakTable: (flag & 8) !== 0,
    modifiedArithmetic: (flag & 128) !== 0,
  };
}

/**
 * The subheader (header of the subfile). All formats share the same subheader.
 */
export interface SubHeader {
  parameters: SubFlagParameters;
  exponentY: number;
  indexNumber: number;
  startingZ: number;
  endingZ: number;
  noiseValue: number;
  numberPoints: number;
  numberCoAddedScans: number;
  wAxisValue: number;
  reserved: string;
  /**
   * Raw `subflgs` byte (undefined bits are written by some software).
   */
  flags: number;
}

/**
 * Metadata of one spectrum: the raw subheader and how its Y values were read.
 */
export interface SpectrumMeta extends SubHeader {
  /**
   * Exponent actually used for the Y values (`-128` for float values).
   * `exponentY` keeps the raw `subexp`.
   */
  exponent: number;
  /**
   * Y values were stored as IEEE float32.
   */
  isFloat: boolean;
  /**
   * 0-based position of the subfile in the file (`indexNumber` is the raw
   * `subindx`, a 16-bit value that wraps).
   */
  index: number;
  /**
   * Interpreted Z value (multifiles only; see `zSpacing` on the header).
   * @default undefined
   */
  z?: number;
  /**
   * End of the Z interval (`subnext`) for ordered or random Z.
   * @default undefined
   */
  zEnd?: number;
  /**
   * Interpreted W value (4D files only).
   * @default undefined
   */
  w?: number;
  /**
   * 0-based W plane (4D files whose planes divide the subfiles evenly).
   * @default undefined
   */
  plane?: number;
  /**
   * Peak-pick noise level, when `subnois` is set (high byte not 0).
   * @default undefined
   */
  noise?: number;
}

/**
 * Parses the subheader (header of the subfile).
 * @param buffer - SPC buffer.
 * @param textEncoding - fallback encoding of `subresv` when it is not UTF-8.
 * @returns subheader object.
 */
export function parseSubHeader(
  buffer: IOBuffer,
  textEncoding = 'windows-1252',
): SubHeader {
  const flags = buffer.readUint8();
  return {
    parameters: parseSubFlagParameters(flags),
    exponentY: buffer.readInt8(),
    indexNumber: buffer.readUint16(),
    startingZ: buffer.readFloat32(),
    endingZ: buffer.readFloat32(),
    noiseValue: buffer.readFloat32(),
    numberPoints: buffer.readUint32(),
    numberCoAddedScans: buffer.readUint32(),
    wAxisValue: buffer.readFloat32(),
    reserved: decodeText(buffer.readBytes(4), { encoding: textEncoding }),
    flags,
  };
}

/**
 * Set the X and Y axis (object with labels, values etc.). The order of X is
 * computed once per X array, so the spectra of a common-X file share it, and
 * `fileHeader.xDirection` records it.
 * @param x - X values array, possibly shared by several spectra (not modified).
 * @param y - Y values array, owned by the spectrum (it may be reversed in place).
 * @param fileHeader - main file header.
 * @param shouldSortX - whether to sort the spectrum by increasing X.
 * @param isXOwned - X was read for this spectrum only, so it is taken over
 * instead of copied.
 * @returns object with x and y as axis.
 */
export function setXYAxis(
  x: Float64Array,
  y: Float64Array,
  fileHeader: Header,
  shouldSortX = true,
  isXOwned = false,
) {
  const { x: xAxis, y: yAxis } = fileHeader.axes;
  const xOrder = getXOrder(x);
  if (fileHeader.xDirection === undefined) {
    fileHeader.xDirection = xOrder.direction;
  } else if (fileHeader.xDirection !== xOrder.direction) {
    fileHeader.xDirection = 'unordered';
  }
  const { x: oX, y: oY } = applyXOrder(x, y, xOrder, {
    shouldSortX,
    isXOwned,
  });

  const variables: MeasurementXYVariables = {
    x: {
      symbol: 'x',
      label: xAxis.label,
      units: xAxis.units,
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
  return variables;
}
