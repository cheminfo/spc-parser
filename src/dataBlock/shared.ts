import { MeasurementXY, MeasurementXYVariables } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';

import { Header } from '../fileHeader';

import { ensureIncreasingXValues } from './utility/ensureIncreasingXValues';

/**
 * Use cheminfo type for better UI compatibility
 */
export type Spectrum = MeasurementXY;

/**
 * Gets the Subfile flags.
 *
 * @param  flag First byte of the subheader.
 * @return The parameters.
 */
export class SubFlagParameters {
  public changed: boolean;
  public noPeakTable: boolean;
  public modifiedArithmetic: boolean;
  constructor(flag: number) {
    this.changed = (flag & 1) !== 0;
    this.noPeakTable = (flag & 8) !== 0;
    this.modifiedArithmetic = (flag & 128) !== 0;
  }
}

/**
 * Parses the subheader (header of the subfile)
 *
 * @param buffer SPC buffer.
 * @return subheader object
 */
export class SubHeader {
  //all formats have the same subheader
  public parameters: SubFlagParameters;
  public exponentY: number;
  public indexNumber: number;
  public startingZ: number;
  public endingZ: number;
  public noiseValue: number;
  public numberPoints: number;
  public numberCoAddedScans: number;
  public wAxisValue: number;
  public reserved: string;

  constructor(buffer: IOBuffer) {
    this.parameters = new SubFlagParameters(buffer.readUint8());
    this.exponentY = buffer.readInt8();
    this.indexNumber = buffer.readUint16();
    this.startingZ = buffer.readFloat32();
    this.endingZ = buffer.readFloat32();
    this.noiseValue = buffer.readFloat32();
    this.numberPoints = buffer.readUint32();
    this.numberCoAddedScans = buffer.readUint32();
    this.wAxisValue = buffer.readFloat32();
    this.reserved = buffer.readChars(4).replace(/\x00/g, '').trim();
  }
}

/**
 * Set the X and Y axis (object with labels, values etc.)
 * @param x
 * @param y
 * @param fileHeader
 * @return object with x and y as axis.
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

  const [oX, oY]: [Float64Array, Float64Array] = ensureIncreasingXValues(x, y);

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
