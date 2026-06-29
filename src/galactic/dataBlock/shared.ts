import type { MeasurementXYVariables } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';
import { xySortX } from 'ml-spectra-processing';

import type { Header } from '../fileHeader.ts';

/** The flags encoded in the first byte of the subheader. */
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

/** The subheader (header of the subfile). All formats share the same subheader. */
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
}

/**
 * Parses the subheader (header of the subfile).
 * @param buffer - SPC buffer.
 * @returns subheader object.
 */
export function parseSubHeader(buffer: IOBuffer): SubHeader {
  return {
    parameters: parseSubFlagParameters(buffer.readUint8()),
    exponentY: buffer.readInt8(),
    indexNumber: buffer.readUint16(),
    startingZ: buffer.readFloat32(),
    endingZ: buffer.readFloat32(),
    noiseValue: buffer.readFloat32(),
    numberPoints: buffer.readUint32(),
    numberCoAddedScans: buffer.readUint32(),
    wAxisValue: buffer.readFloat32(),
    reserved: buffer.readChars(4).replaceAll('\u0000', '').trim(),
  };
}

/**
 * Set the X and Y axis (object with labels, values etc.)
 * @param x - X values array.
 * @param y - Y values array.
 * @param fileHeader - main file header.
 * @returns object with x and y as axis.
 */
export function setXYAxis(
  x: Float64Array,
  y: Float64Array,
  fileHeader: Header,
) {
  const xAxis = /(?<label>.*?) ?[([](?<units>.*)[)\]]/.exec(
    fileHeader.xUnitsType as string,
  );
  const yAxis = /(?<label>.*?) ?[([](?<units>.*)[)\]]/.exec(
    fileHeader.yUnitsType,
  );

  const { x: oX, y: oY } = xySortX({ x, y });

  const variables: MeasurementXYVariables = {
    x: {
      symbol: 'x',
      label: xAxis?.groups?.label || (fileHeader.xUnitsType as string),
      units: xAxis?.groups?.units || '',
      data: oX,
      isDependent: false,
    },
    y: {
      symbol: 'y',
      label: yAxis?.groups?.label || fileHeader.yUnitsType,
      units: yAxis?.groups?.units || '',
      data: oY,
      isDependent: true,
    },
  };
  return variables;
}
