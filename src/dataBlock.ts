import { MeasurementXYVariables, MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';
import { createFromToArray } from 'ml-spectra-processing';

import { Header, TheNewHeader, TheOldHeader } from './fileHeader';
import { getDataShape, SubFlagParameters } from './utility';

/**
 * Use cheminfo type for better UI compatibility
 */
export type Spectrum = MeasurementXY;

/**
 * Parses the subheader of the subfile.
 *
 * @param buffer SPC buffer.
 * @return Subfile's subheader.
 */
export class SubHeader {
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
 * Creates the spectra given several mandatory arguments (function may need refactor.)
 * @param x - Array of x values, always coming before Y values.
 * @param meta - values explain the Y data.
 * @param fileHeader - contains extra info about how to read the data (16 or 32 bits etc.)
 * @param buffer - current file as iobuffer
 */
export function makeSpectrum(
  x: Float64Array | undefined,
  dataShape: DataShape,
  meta: SubHeader,
  fileHeader: Header,
  buffer: IOBuffer,
): Spectrum {
  const nbPoints = x ? x.length : meta.numberPoints;

  x = x || new Float64Array(nbPoints); //for `xyxy` and exception
  let y = new Float64Array(nbPoints);

  if (dataShape === 'XYXY' || dataShape === 'exception') {
    for (let j = 0; j < nbPoints; j++) {
      x[j] = buffer.readFloat32();
    }
  }

  if (meta.exponentY === 0) {
    meta.exponentY = fileHeader.exponentY;
  }
  const yFactor = Math.pow(
    2,
    meta.exponentY - (fileHeader.parameters.y16BitPrecision ? 16 : 32),
  );

  if (fileHeader.parameters.y16BitPrecision) {
    for (let j = 0; j < nbPoints; j++) {
      y[j] = buffer.readInt16() * yFactor;
    }
  } else {
    for (let j = 0; j < nbPoints; j++) {
      if (fileHeader.fileVersion === 0x4d) {
        y[j] =
          ((buffer.readUint8() << 16) +
            (buffer.readInt8() << 24) +
            (buffer.readUint8() << 0) +
            (buffer.readUint8() << 8)) *
          yFactor;
      } else if (meta.exponentY !== -128) {
        y[j] = buffer.readInt32() * yFactor;
      } else {
        y[j] = buffer.readFloat32();
      }
    }
  }
  const xAxis = /(?<label>.*?) ?[([](?<units>.*)[)\]]/.exec(
    fileHeader.xUnitsType as string,
  );
  const yAxis = /(?<label>.*?) ?[([](?<units>.*)[)\]]/.exec(
    fileHeader.yUnitsType,
  );
  const variables: MeasurementXYVariables = {
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
  return { meta, variables };
}

/**
 * Reads the old-format data block of the SPC file.
 *
 * @param buffer spc buffer.
 * @param fileHeader main header.
 * @return Array containing the spectra.
 */

export function readOldDataBlock(
  buffer: IOBuffer,
  fileHeader: TheOldHeader,
): Spectrum[] {
  let spectra: Spectrum[] = [];

  const { multiFile, xy, xyxy } = fileHeader.parameters;
  const dataShape = getDataShape(multiFile, xy, xyxy);

  const x = createFromToArray({
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
    spectra.push(makeSpectrum(x, dataShape, subFileHeader, fileHeader, buffer));
  }
  return spectra;
}

/**
 * Reads the data block of the SPC file.
 *
 * @param buffer spc buffer.
 * @param fileHeader main header.
 * @return Array containing the spectra.
 */
export function readNewDataBlock(
  buffer: IOBuffer,
  fileHeader: TheNewHeader,
): Spectrum[] {
  let x;
  let spectra: Spectrum[] = [];
  const { multiFile, xy, xyxy } = fileHeader.parameters;
  const dataShape = getDataShape(multiFile, xy, xyxy);

  if (dataShape === 'XY' || dataShape === 'XYY') {
    x = new Float64Array(fileHeader.numberPoints);
    for (let i = 0; i < fileHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (dataShape === 'YY' || dataShape === 'Y') {
    x = createFromToArray({
      from: fileHeader.startingX,
      to: fileHeader.endingX,
      length: fileHeader.numberPoints,
    });
  }

  for (let i = 0; i < fileHeader.spectra; i++) {
    const subFileHeader = new SubHeader(buffer);
    spectra.push(makeSpectrum(x, dataShape, subFileHeader, fileHeader, buffer));
  }
  return spectra;
}
