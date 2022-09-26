import { MeasurementXYVariables, MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';
import { createFromToArray } from 'ml-spectra-processing';

import { Header, TheOldHeader } from './../fileHeader';
import { SubHeader, setXYAxis, Spectrum } from './shared';


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

