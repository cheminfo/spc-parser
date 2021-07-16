import { equidistantArray, getSubFlagParameters } from './utility';

/**
 * Parses the subheader of the current subfile
 *
 * @export
 * @param {object} buffer SPC buffer
 * @return {object} Current subfile's subheader
 */
export function subHeader(buffer) {
  const subHeader = {};
  subHeader.parameters = getSubFlagParameters(buffer.readUint8());
  subHeader.exponentY = buffer.readInt8();
  subHeader.indexNumber = buffer.readUint16();
  subHeader.startingZ = buffer.readFloat32();
  subHeader.endingZ = buffer.readFloat32();
  subHeader.noiseValue = buffer.readFloat32();
  subHeader.numberPoints = buffer.readUint32();
  subHeader.numberCoAddedScans = buffer.readUint32();
  subHeader.wAxisValue = buffer.readFloat32();
  subHeader.reserved = buffer.readChars(4).trim();
  return subHeader;
}

/**
 * Reads the data block of the SPC file
 *
 * @export
 * @param {object} buffer spc buffer
 * @param {object} mainHeader main header
 * @return {array} Array containing the spectra
 */
export function readDataBlock(buffer, mainHeader) {
  let x;
  let y;
  let spectra = [];

  if (!mainHeader.parameters.xyxy && mainHeader.xy) {
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
  let spectrum;
  for (
    let i = 0;
    i < mainHeader.spectra ||
    (mainHeader.fileVersion === 0x4d &&
      buffer.offset + mainHeader.numberPoints < buffer.length);
    i++
  ) {
    spectrum = {};
    spectrum.meta = subHeader(buffer);
    if (mainHeader.parameters.xyxy) {
      x = new Float32Array(spectrum.meta.numberPoints);
      for (let j = 0; j < spectrum.meta.numberPoints; j++) {
        x[j] = buffer.readFloat32();
      }
    }
    const yFactor = Math.pow(
      2,
      spectrum.meta.exponentY -
        (mainHeader.parameters.y16BitPrecision &&
        spectrum.meta.exponentY !== 0x80
          ? 16
          : 32),
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
        } else {
          y[j] = buffer.readInt32() * yFactor;
        }
      }
    }

    spectrum.x = x;
    spectrum.y = y;
    spectra.push(spectrum);
  }
  return spectra;
}
