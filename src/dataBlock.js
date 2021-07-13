import { subHeader } from './subHeader';
import { xPoints } from './utility';

export function readDataBlock(buffer, mainHeader) {
  let x;
  let y;
  let specter;
  let subFiles = [];
  const flags = { ...mainHeader };
  const yFactor = Math.pow(
    2,
    flags.exponentY -
      (flags.parameters.y16BitPrecision && flags.exponentY !== 0x80)
      ? 16
      : 32,
  );

  if (!flags.parameters.xyxy && flags.zValuesUneven) {
    x = new Float32Array(flags.numberPoints); //new Float32Array();
    for (let i = 0; i < flags.numberPoints; i++) {
      x[i] = buffer.readFloat32();
    }
  } else if (!flags.parameters.zValuesUneven) {
    x = xPoints(flags.startingX, flags.endingX, flags.numberPoints);
  }
  for (let i = 0; i < flags.subFiles; i++) {
    specter = {};
    specter.meta = subHeader(buffer);
    if (flags.parameters.xyxy) {
      x = new Float32Array(specter.meta.numberPoints); // new Float32Array();
      for (let j = 0; j < specter.meta.numberPoints; j++) {
        x[j] = buffer.readFloat32();
      }
    }
    if (flags.parameters.y16BitPrecision) {
      y = new Int16Array(specter.meta.numberPoints);
      for (let j = 0; j < specter.meta.numberPoints; j++) {
        y[j] = buffer.readInt16();
      }
    } else {
      y = new Float32Array(specter.meta.numberPoints);
      for (let j = 0; j < specter.meta.numberPoints; j++) {
        y[j] = buffer.readFloat32() * yFactor;
      }
    }
    specter.x = x;
    specter.y = y;
    subFiles.push(specter);
  }
  return subFiles;
}
