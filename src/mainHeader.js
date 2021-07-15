import { getFlagParameters, longToDate } from './utility';

/**
 * Main header parsing - First 512/256 bytes (new/old format)
 * @param {object} buffer SPC buffer
 * @return {object} Main header
 */
export function mainHeader(buffer) {
  const header = {};
  header.parameters = getFlagParameters(buffer.readUint8()); //Each bit contains a parameter 0x00
  header.fileVer = buffer.readUint8(); //4B => New format; 4D => LabCalc format 0x01
  switch (header.fileVer) {
    case 0x4b:
      break;
    case 0x4c:
      buffer.setBigEndian();
      break;
    case 0x4d:
      return oldHeader(buffer, header);
    default:
      throw new Error(
        'Unrecognized file format: byte 01 must be either 4B, 4C or 4D',
      );
  }

  header.experimentType = buffer.readUint8(); //Experiment type code (See SPC.h)
  header.exponentY = buffer.readInt8(); //Exponent for Y values (80h = floating point): FloatY = (2^Exp)*IntY/(2^32) 32-bit; FloatY = (2^Exp)*IntY/(2^16) 32-bit
  header.numberPoints = buffer.readUint32(); //Number of points (if not XYXY)
  header.startingX = buffer.readFloat64(); //First X coordinate
  header.endingX = buffer.readFloat64(); //Last X coordinate
  header.subFiles = buffer.readUint32(); //Number of spectrums
  header.xUnitsType = buffer.readUint8(); //X Units type code (See SPC.H)
  header.yUnitsType = buffer.readUint8(); //Y ""
  header.zUnitsType = buffer.readUint8(); //Z ""
  header.postingDisposition = buffer.readUint8(); //Posting disposition (See GRAMSDDE.H)
  header.date = longToDate(buffer.readUint32()); //Date: minutes = first 6 bits, hours = 5 next bits, days = 5 next, months = 4 next, years = 12 last
  header.resolutionDescription = buffer.readChars(9); //Resolution description text
  header.sourceInstrumentDescription = buffer.readChars(9); // Source Instrument description text
  header.peakPointNumber = buffer.readUint16(); //Peak point number for interferograms
  header.spare = [];
  for (let i = 0; i < 8; i++) {
    header.spare.push(buffer.readFloat32());
  }
  if (header.fileVer === 0x4c) {
    //Untested case because no test files
    header.spare.reverse();
  }
  header.memo = buffer.readChars(130); //0x
  header.xyzLabels = buffer.readChars(30);
  header.logOffset = buffer.readUint32(); //Byte offset to Log Block
  header.modifiedFlag = buffer.readUint32(); //File modification flag (See values in SPC.H)
  header.processingCode = buffer.readUint8(); //Processing code (See GRAMSDDE.H)
  header.calibrationLevel = buffer.readUint8(); //Calibration level + 1
  header.subMethodSampleInjectionNumber = buffer.readUint16(); //Sub-method sample injection number
  header.concentrationFactor = buffer.readFloat32(); //Floating data multiplier concentration factor
  header.methodFile = buffer.readChars(48); //Method file
  header.zSubIncrement = buffer.readFloat32(); //Z subfile increment for even Z Multifiles
  header.wPlanes = buffer.readUint32();
  header.wPlaneIncrement = buffer.readFloat32();
  header.wAxisUnits = buffer.readUint8(); //W axis units code
  header.reserved = buffer.readChars(187); //Reserved space (Must be zero)
  return header;
}
export function oldHeader(buffer, header) {
  header.exponentY = buffer.readInt16(); //Word (16 bits) instead of byte
  header.numberPoints = buffer.readFloat32();
  header.startingX = buffer.readFloat32();
  header.endingX = buffer.readFloat32();
  header.xUnitsType = buffer.readUint8();
  header.yUnitsType = buffer.readUint8();
  const date = new Date();
  const zTypeYear = buffer.readUint16();
  date.setUTCFullYear(zTypeYear % 4096); // might be wrong
  date.setUTCMonth(Math.max(buffer.readUint8() - 1, 0));
  date.setUTCDate(buffer.readUint8());
  date.setUTCHours(buffer.readUint8());
  date.setUTCMinutes(buffer.readUint8());
  header.date = date.toISOString();
  header.resolutionDescription = buffer.readChars(8);
  header.peakPointNumber = buffer.readUint16();
  header.scans = buffer.readUint16();
  header.spare = [];
  for (let i = 0; i < 7; i++) {
    header.spare.push(buffer.readFloat32());
  }
  header.memo = buffer.readChars(130);
  header.xyzLabels = buffer.readChars(30);
  return header;
}
