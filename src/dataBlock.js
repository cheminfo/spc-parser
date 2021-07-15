import { evenArray, getSubFlagParameters } from './utility';

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
  subHeader.reserved = buffer.readChars(4);
  return subHeader;
}

export function readDataBlock(buffer, mainHeader) {
  let x;
  let y;
  let subFiles = [];

  if (!mainHeader.parameters.xyxy && mainHeader.xy) {
    x = new Float32Array(mainHeader.numberPoints);
    for (let i = 0; i < mainHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (!mainHeader.parameters.xy) {
    x = evenArray(
      mainHeader.startingX,
      mainHeader.endingX,
      mainHeader.numberPoints,
    );
  }
  let spectrum;
  const subNum = mainHeader.subFiles ? mainHeader.subFiles : 1;
  for (let i = 0; i < subNum; i++) {
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
        y[j] = buffer.readInt32() * yFactor;
      }
    }

    spectrum.x = x;
    spectrum.y = y;
    subFiles.push(spectrum);
  }
  return subFiles;
}
