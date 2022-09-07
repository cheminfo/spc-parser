import { IOBuffer } from 'iobuffer';

import { Header } from './mainHeader';
import {
  equidistantArray,
  getSubFlagParameters,
  SubFlagParameters,
} from './utility';

export class Spectrum {
  public meta!: SubHeader;
  public variables!: {
    x: {
      symbol: string;
      label: string;
      units: string;
      data: Float32Array | Float64Array;
      type: string;
    };
    y: {
      symbol: string;
      label: string;
      units: string;
      data: Float32Array | Float64Array;
      type: string;
    };
  };
}

interface SubHeader {
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
 * Parses the subheader of the current subfile.
 *
 * @param {object} buffer SPC buffer.
 * @return {object} Current subfile's subheader.
 */
export function subHeader(buffer: IOBuffer): SubHeader {
  const subHeader: SubHeader = {
    parameters: getSubFlagParameters(buffer.readUint8()),
    exponentY: buffer.readInt8(),
    indexNumber: buffer.readUint16(),
    startingZ: buffer.readFloat32(),
    endingZ: buffer.readFloat32(),
    noiseValue: buffer.readFloat32(),
    numberPoints: buffer.readUint32(),
    numberCoAddedScans: buffer.readUint32(),
    wAxisValue: buffer.readFloat32(),
    reserved: buffer.readChars(4).trim().replace(/\x00/g, ''),
  };
  return subHeader;
}

/**
 * Reads the data block of the SPC file.
 *
 * @export
 * @param {IOBuffer} buffer spc buffer.
 * @param {Header} mainHeader main header.
 * @return {array} Array containing the spectra.
 */
export function readDataBlock(
  buffer: IOBuffer,
  mainHeader: Header,
): Spectrum[] {
  let x;
  let y;
  let spectra: Spectrum[] = [];

  if (!mainHeader.parameters.xyxy && mainHeader.parameters.xy) {
    x = new Float32Array(mainHeader.numberPoints);
    for (let i = 0; i < mainHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (!mainHeader.parameters.xy) {
    x = equidistantArray(
      mainHeader.startingX,
      mainHeader.endingX,
      mainHeader.numberPoints,
    );
  }
  let spectrum: Spectrum;
  for (
    let i = 0;
    i < mainHeader.spectra ||
    (mainHeader.fileVersion === 0x4d &&
      buffer.offset + mainHeader.numberPoints < buffer.length);
    i++
  ) {
    spectrum = new Spectrum();
    spectrum.meta = subHeader(buffer);
    if (mainHeader.parameters.xyxy) {
      x = new Float32Array(spectrum.meta.numberPoints);
      for (let j = 0; j < spectrum.meta.numberPoints; j++) {
        x[j] = buffer.readFloat32();
      }
    }
    if (spectrum.meta.exponentY === 0) {
      spectrum.meta.exponentY = mainHeader.exponentY;
    }
    const yFactor = Math.pow(
      2,
      spectrum.meta.exponentY -
        (mainHeader.parameters.y16BitPrecision ? 16 : 32),
    );

    const nbPoints = spectrum.meta.numberPoints
      ? spectrum.meta.numberPoints
      : mainHeader.numberPoints;

    if (mainHeader.parameters.y16BitPrecision) {
      y = new Float32Array(nbPoints);
      for (let j = 0; j < nbPoints; j++) {
        y[j] = buffer.readInt16() * yFactor;
      }
    } else {
      y = new Float32Array(nbPoints);
      for (let j = 0; j < nbPoints; j++) {
        if (mainHeader.fileVersion === 0x4d) {
          y[j] =
            ((buffer.readUint8() << 16) +
              (buffer.readInt8() << 24) +
              (buffer.readUint8() << 0) +
              (buffer.readUint8() << 8)) *
            yFactor;
        } else if (spectrum.meta.exponentY !== -128) {
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
    const variables = {
      x: {
        symbol: 'x',
        label: xAxis?.groups?.label || (mainHeader.xUnitsType as string),
        units: xAxis?.groups?.units || '',
        data: x as Float32Array | Float64Array,
        type: 'INDEPENDENT',
      },
      y: {
        symbol: 'y',
        label: yAxis?.groups?.label || mainHeader.yUnitsType,
        units: yAxis?.groups?.units || '',
        data: y,
        type: 'DEPENDENT',
      },
    };
    spectrum.variables = variables;
    spectra.push(spectrum);
  }
  return spectra;
}
