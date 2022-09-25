import { MeasurementVariable } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';
import { createFromToArray } from 'ml-spectra-processing';

import { Header, TheOldHeader } from './fileHeader';
import { SubFlagParameters } from './utility';

export interface Spectrum {
 meta:SubHeader;
 variables: Record<string, MeasurementVariable>
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
 * Reads a file's data block (old SPC format)
 *
 * @param buffer spc buffer.
 * @param fileHeader header.
 * @return Array containing the spectra.
 */
export function oldDataBlock(
  buffer: IOBuffer,
  fileHeader: TheOldHeader,
): Spectrum[] {
  // either Y or YY fall on the for loop
  let spectra: Spectrum[] = [];

  // old format uses always equidistant arrays
  const x: Float64Array = createFromToArray({
    from: fileHeader.startingX,
    to: fileHeader.endingX,
    length: fileHeader.numberPoints,
  });

  for (
    let i = 0;
    buffer.offset + fileHeader.numberPoints < buffer.length;
    i++
  ) {
    const subFileHeader = new SubHeader(buffer);
    const y = getOldY(
      new Float64Array(x.length),
      subFileHeader,
      fileHeader,
      buffer,
    );
    const variables = setXYAxis(x, y, fileHeader);

    spectra.push({ meta: subFileHeader, variables });
  }

  return spectra;
}

/**
 *
 *
 * @export
 * @param {Float64Array} y
 * @param {SubHeader} subHeader
 * @param {TheOldHeader} fileHeader
 * @param {IOBuffer} buffer
 * @return {*}
 */
export function getOldY(
  y: Float64Array,
  subHeader: SubHeader,
  fileHeader: TheOldHeader,
  buffer: IOBuffer,
) {
  const {
    fileVersion,
    exponentY,
    parameters: { y16BitPrecision },
  } = fileHeader;

  if (subHeader.exponentY === 0) {
    subHeader.exponentY = exponentY;
  }
  const yFactor = Math.pow(
    2,
    subHeader.exponentY - (y16BitPrecision ? 16 : 32),
  );

  if (y16BitPrecision) {
    for (let j = 0; j < y.length; j++) {
      y[j] = buffer.readInt16() * yFactor;
    }
  } else {
    for (let j = 0; j < y.length; j++) {
      if (fileVersion === 0x4d) {
        y[j] =
          ((buffer.readUint8() << 16) +
            (buffer.readInt8() << 24) +
            (buffer.readUint8() << 0) +
            (buffer.readUint8() << 8)) *
          yFactor;
      }
    }
  }
  return y;
}

/**
 *
 *
 * @export
 * @param {Float64Array} x
 * @param {Float64Array} y
 * @param {Header} fileHeader
 * @return {*}
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
/**
 * Use cheminfo type for UI compatibility
 */
  const variables: Record<string, MeasurementVariable> = {
    x: {
      symbol: 'x',
      label: xAxis?.groups?.label || (fileHeader.xUnitsType as string),
      units: xAxis?.groups?.units || '',
      data: x,
      isDependent: false,
    },
    y: {
      symbol: 'y',
      label: yAxis?.groups?.label || fileHeader.yUnitsType,
      units: yAxis?.groups?.units || '',
      data: y,
      isDependent: true,
    },
  };
  return variables;
}
