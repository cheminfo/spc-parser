import { MeasurementXYVariables, MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';
import { createFromToArray } from 'ml-spectra-processing';

import { Header, TheNewHeader, TheOldHeader } from './mainHeader';
import { SubFlagParameters } from './utility';

/**
 * Use cheminfo type for better UI compatibility
 */
export type Spectrum = MeasurementXY;

/**
 * Parses the subheader of the current subfile.
 *
 * @param buffer SPC buffer.
 * @return Current subfile's subheader.
 */
export class SubHeader{
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

  constructor(buffer: IOBuffer){
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
 * Creates the spectra given several mandatory arguments (function could be improved.)
 * @param x - Array of x values, always coming before Y values.
 * @param meta - values explain the Y data.
 * @param mainHeader - contains extra info about how to read the data (16 or 32 bits etc.)
 * @param buffer - current file as iobuffer
 */
export function makeSpectrum(
  x: Float64Array|undefined,
  meta:SubHeader,
  mainHeader: Header,
  buffer: IOBuffer,
): Spectrum {
  let y;

  if(mainHeader.parameters.dataShape==="XYXY"){
    x = new Float64Array(meta.numberPoints);
    for (let j = 0; j < meta.numberPoints; j++) {
      x[j] = buffer.readFloat32();
    }
  }
  if (meta.exponentY === 0) {
    meta.exponentY = mainHeader.exponentY;
  }
  const yFactor = Math.pow(
    2,
    meta.exponentY - (mainHeader.parameters.y16BitPrecision ? 16 : 32),
  );

  const nbPoints = meta.numberPoints
    ? meta.numberPoints
    : mainHeader.numberPoints;

  if (mainHeader.parameters.y16BitPrecision) {
    y = new Float64Array(nbPoints);
    for (let j = 0; j < nbPoints; j++) {
      y[j] = buffer.readInt16() * yFactor;
    }
  } else {
    y = new Float64Array(nbPoints);
    for (let j = 0; j < nbPoints; j++) {
      if (mainHeader.fileVersion === 0x4d) {
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
    mainHeader.xUnitsType as string,
  );
  const yAxis = /(?<label>.*?) ?[([](?<units>.*)[)\]]/.exec(
    mainHeader.yUnitsType,
  );
  const variables: MeasurementXYVariables = {
    x: {
      symbol: 'x',
      label: xAxis?.groups?.label || (mainHeader.xUnitsType as string),
      units: xAxis?.groups?.units || '',
      data: x as Float64Array,
      isDependent: false,
    },
    y: {
      symbol: 'y',
      label: yAxis?.groups?.label || mainHeader.yUnitsType,
      units: yAxis?.groups?.units || '',
      data: y as Float64Array,
      isDependent: true,
    },
  };
  return { meta, variables };
}


/**
 * Reads the old-format data block of the SPC file.
 *
 * @param buffer spc buffer.
 * @param mainHeader main header.
 * @return Array containing the spectra.
 */

export function readOldDataBlock(
  buffer: IOBuffer,
  mainHeader: TheOldHeader,
): Spectrum[] {

  let spectra: Spectrum[] = [];

  const { dataShape } = mainHeader.parameters

  const x = createFromToArray({
    from: mainHeader.startingX,
    to: mainHeader.endingX,
    length: mainHeader.numberPoints,
  });

    for (
      let i = 0;
      buffer.offset + mainHeader.numberPoints < buffer.length;
      i++
    ) {
      const subFileHeader = new SubHeader(buffer);
      spectra.push(makeSpectrum(x, subFileHeader, mainHeader, buffer));
  }
  return spectra;
}

/**
 * Reads the data block of the SPC file.
 *
 * @param buffer spc buffer.
 * @param mainHeader main header.
 * @return Array containing the spectra.
 */
export function readNewDataBlock(
  buffer: IOBuffer,
  mainHeader: TheNewHeader,
): Spectrum[] {
  let x;
  let spectra: Spectrum[] = [];
  const {dataShape} = mainHeader.parameters 
  if (dataShape==="XY") {
    x = new Float64Array(mainHeader.numberPoints);
    for (let i = 0; i < mainHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (dataShape==="YY"|| dataShape==="Y") {
    x = createFromToArray({
      from: mainHeader.startingX,
      to: mainHeader.endingX,
      length: mainHeader.numberPoints,
    });
  }

    for (let i = 0; i < mainHeader.spectra; i++) {
      const subFileHeader = new SubHeader(buffer);
      spectra.push(makeSpectrum(x, subFileHeader, mainHeader, buffer));
    }
  return spectra;
}
