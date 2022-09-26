import { IOBuffer } from 'iobuffer';
import { createFromToArray } from 'ml-spectra-processing';

import { TheNewHeader } from '../fileHeader';
import { getDataShape } from '../utility/getDataShape';

import { SubHeader, setXYAxis, Spectrum } from './shared';

/**
 * Reads the data block of the SPC file.
 *
 * @param buffer spc buffer.
 * @param fileHeader main header.
 * @return Array containing the spectra.
 */
export function newDataBlock(
  buffer: IOBuffer,
  fileHeader: TheNewHeader,
): Spectrum[] {
  let x;
  let spectra: Spectrum[] = [];

  const dataShape = getDataShape(fileHeader.parameters);

  if (dataShape === 'XY' || dataShape === 'XYY') {
    //for these ones, X axis comes before subheader !!
    x = new Float64Array(fileHeader.numberPoints);
    for (let i = 0; i < fileHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (dataShape === 'YY' || dataShape === 'Y') {
    //for these ones, no X axis, we create it as we have all parameters
    x = createFromToArray({
      from: fileHeader.startingX,
      to: fileHeader.endingX,
      length: fileHeader.numberPoints,
    });
  }

  for (let i = 0; i < fileHeader.spectra; i++) {
    // here Y is set (runs only once for a single spectra.)
    const subFileHeader = new SubHeader(buffer);

    // set X for the remaining cases if neccesary
    if (dataShape === 'XYXY' || dataShape === 'exception') {
      x = new Float64Array(subFileHeader.numberPoints);
      for (let j = 0; j < x.length; j++) {
        x[j] = buffer.readFloat32();
      }
    }

    const y = getNewY(
      new Float64Array((x as Float64Array).length),
      subFileHeader,
      fileHeader,
      buffer,
    );

    const variables = setXYAxis(x as Float64Array, y, fileHeader);

    spectra.push({ meta: subFileHeader, variables });
  }
  return spectra;
}

export function getNewY(
  y: Float64Array,
  subHeader: SubHeader,
  fileHeader: TheNewHeader,
  buffer: IOBuffer,
) {
  const {
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
      if (subHeader.exponentY !== -128) {
        y[j] = buffer.readInt32() * yFactor;
      } else {
        y[j] = buffer.readFloat32();
      }
    }
  }
  return y;
}
