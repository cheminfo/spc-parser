import { subHeader } from './subHeader';
import { xPoints } from './utility';

export function readDataBlock(buffer, mainHeader) {
  let x;
  let y;
  let subFiles = [];
  const yFactor =
    2 **
    (mainHeader.exponentY -
      (mainHeader.parameters.y16BitPrecision && mainHeader.exponentY !== 0x80
        ? 16
        : 32));

  if (!mainHeader.parameters.xyxy && mainHeader.zValuesUneven) {
    x = new Float64Array(mainHeader.numberPoints);
    for (let i = 0; i < mainHeader.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (!mainHeader.parameters.zValuesUneven) {
    x = xPoints(
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
      x = new Float64Array(spectrum.meta.numberPoints);
      for (let j = 0; j < spectrum.meta.numberPoints; j++) {
        x[j] = buffer.readFloat32();
      }
    }
    const nbPoints = spectrum.meta.numberPoints
      ? spectrum.meta.numberPoints
      : mainHeader.numberPoints;
    if (mainHeader.parameters.y16BitPrecision) {
      y = new Float64Array(nbPoints);
      for (let j = 0; j < nbPoints; j++) {
        y[j] = buffer.readInt16() * yFactor;
      }
    } else {
      y = new Float64Array(nbPoints);
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
