import { MeasurementXYVariables, MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';
import { createFromToArray } from 'ml-spectra-processing';

import { Header, TheNewHeader, TheOldHeader } from './mainHeader';
import { getSubFlagParameters, SubFlagParameters, } from './utility';

/**
 * Use cheminfo type for better UI compatibility
 *  we add `x`, `y` under `variables`, and the `subheader` as `meta`.
*/
export type Spectrum = MeasurementXY;

/**
 * Header of the subfile
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
}

/**
 * Parses the subheader of the current subfile.
 *
 * @param buffer SPC buffer.
 * @return Current subfile's subheader.
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
 * @param buffer spc buffer.
 * @param mainHeader main header.
 * @return Array containing the spectra.
 */
export function readDataBlock(
  buffer: IOBuffer,
  mainHeader: Header,
): Spectrum[] {
  let x;
  let y;
  let spectra: Spectrum[] = [];

  if (!mainHeader.parameters.xyxy && mainHeader.parameters.xy) {
    x = new Float64Array(mainHeader.numberPoints);
    for (let i = 0; i < mainHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (!mainHeader.parameters.xy) {
    x = createFromToArray(
      {from:mainHeader.startingX,
      to:mainHeader.endingX,
      length:mainHeader.numberPoints}
    );
  }
  if (mainHeader instanceof TheNewHeader) {
    for (let i = 0; i < mainHeader.spectra; i++) {
      spectra.push(makeSpectrum(x, y, mainHeader, buffer));
    }
  } else if (mainHeader instanceof TheOldHeader) {
    for (
      let i = 0;
      buffer.offset + mainHeader.numberPoints < buffer.length;
      i++
    ) {
      spectra.push(makeSpectrum(x, y, mainHeader, buffer));
    }
  }
  return spectra;
}

function makeSpectrum(
  x: Float64Array | undefined,
  y: Float64Array | undefined,
  mainHeader: Header,
  buffer: IOBuffer,
):Spectrum {

  const meta: SubHeader = subHeader(buffer);

  if (mainHeader.parameters.xyxy) {
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
  const variables:MeasurementXYVariables = {
    x: {
      symbol: 'x',
      label: xAxis?.groups?.label || mainHeader.xUnitsType as string,
      units: xAxis?.groups?.units || '',
      data: x as Float64Array,
      isDependent: false,
    },
    y: {
      symbol: 'y',
      label: yAxis?.groups?.label || mainHeader.yUnitsType,
      units: yAxis?.groups?.units || '',
      data: y,
      isDependent: true,
    },
  };
  return {meta, variables}
}
