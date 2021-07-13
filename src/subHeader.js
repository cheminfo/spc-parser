import { getSubFlagParameters } from './utility';

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
