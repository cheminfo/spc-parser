/* eslint-disable no-control-regex */

import { IOBuffer } from 'iobuffer';

import { xzwTypes, yTypes, experimentSettings } from './types';
import { getFlagParameters, longToDate, FlagParameters } from './utility';

export interface Header {
  fileVersion: number;
  parameters: FlagParameters;
  experimentType: string;
  exponentY: number;
  numberPoints: number;
  startingX: number;
  endingX: number;
  spectra: number;
  xUnitsType: string;
  yUnitsType: string;
  zUnitsType: string;
  postingDisposition: number;
  date: string;
  resolutionDescription: string;
  sourceInstrumentDescription: string;
  peakPointNumber: number;
  spare: number[];
  memo: string;
  xyzLabels: string;
  logOffset: number;
  modifiedFlag: number;
  processingCode: number;
  calibrationLevel: number;
  subMethodSampleInjectionNumber: number;
  concentrationFactor: number;
  methodFile: string;
  zSubIncrement: number;
  wPlanes: number;
  wPlaneIncrement: number;
  wAxisUnits: string;
  reserved: string;
  scans?: number;
}

/**
 * Main header parsing - First 512/256 bytes (new/old format)
 * @param {IOBuffer} buffer SPC buffer
 * @return {Header} Main header
 */
export function mainHeader(buffer: IOBuffer): Header {
  let header: any = {};
  header.parameters = getFlagParameters(buffer.readUint8()); //Each bit contains a parameter
  header.fileVersion = buffer.readUint8(); //4B => New format; 4D => LabCalc format
  switch (header.fileVersion) {
    case 0x4b: // new format
      break;
    case 0x4c:
      buffer.setBigEndian();
      break;
    case 0x4d: // old LabCalc format
      return oldHeader(buffer, header);
    default:
      throw new Error(
        'Unrecognized file format: byte 01 must be either 4B, 4C or 4D',
      );
  }

  header.experimentType = experimentSettings(buffer.readUint8()); //Experiment type code (See SPC.h)
  header.exponentY = buffer.readInt8(); //Exponent for Y values (80h = floating point): FloatY = (2^Exp)*IntY/(2^32) 32-bit; FloatY = (2^Exp)*IntY/(2^16) 32-bit
  header.numberPoints = buffer.readUint32(); //Number of points (if not XYXY)
  header.startingX = buffer.readFloat64(); //First X coordinate
  header.endingX = buffer.readFloat64(); //Last X coordinate
  header.spectra = buffer.readUint32(); //Number of spectrums
  header.xUnitsType = xzwTypes(buffer.readUint8()); //X Units type code (See types.js)
  header.yUnitsType = yTypes(buffer.readUint8()); //Y ""
  header.zUnitsType = xzwTypes(buffer.readUint8()); //Z ""
  header.postingDisposition = buffer.readUint8(); //Posting disposition (See GRAMSDDE.H)
  header.date = longToDate(buffer.readUint32()); //Date: minutes = first 6 bits, hours = 5 next bits, days = 5 next, months = 4 next, years = 12 last
  header.resolutionDescription = buffer
    .readChars(9)
    .trim()
    .replace(/\x00/g, ''); //Resolution description text
  header.sourceInstrumentDescription = buffer
    .readChars(9)
    .trim()
    .replace(/\x00/g, ''); // Source Instrument description text
  header.peakPointNumber = buffer.readUint16(); //Peak point number for interferograms
  header.spare = [];
  for (let i = 0; i < 8; i++) {
    header.spare.push(buffer.readFloat32());
  }
  if (header.fileVersion === 0x4c) {
    //Untested case because no test files
    header.spare.reverse();
  }
  header.memo = buffer.readChars(130).trim().replace(/\x00/g, '');
  header.xyzLabels = buffer.readChars(30).trim().replace(/\x00/g, '');
  header.logOffset = buffer.readUint32(); //Byte offset to Log Block
  header.modifiedFlag = buffer.readUint32(); //File modification flag (See values in SPC.H)
  header.processingCode = buffer.readUint8(); //Processing code (See GRAMSDDE.H)
  header.calibrationLevel = buffer.readUint8(); //Calibration level + 1
  header.subMethodSampleInjectionNumber = buffer.readUint16(); //Sub-method sample injection number
  header.concentrationFactor = buffer.readFloat32(); //Floating data multiplier concentration factor
  header.methodFile = buffer.readChars(48).trim().replace(/\x00/g, ''); //Method file
  header.zSubIncrement = buffer.readFloat32(); //Z subfile increment for even Z Multifiles
  header.wPlanes = buffer.readUint32();
  header.wPlaneIncrement = buffer.readFloat32();
  header.wAxisUnits = xzwTypes(buffer.readUint8()); //W axis units code
  header.reserved = buffer.readChars(187).trim().replace(/\x00/g, ''); //Reserved space (Must be zero)
  if (header.xUnitsType === '0') {
    header.xUnitsType = header.xyzLabels.substr(0, 10);
  }
  if (header.zUnitsType === '0') {
    header.zUnitsType = header.xyzLabels.substr(20, 10);
  }
  return header as Header;
}

/**
 *Old version files header parsing
 *
 * @export
 * @param {IOBuffer} buffer SPC buffer
 * @param {Header} header Header from the previous function
 * @return {object} Object containing the metadata of the old file
 */
export function oldHeader(buffer: IOBuffer, header: Header): Header {
  header.exponentY = buffer.readInt16(); //Word (16 bits) instead of byte
  header.numberPoints = buffer.readFloat32();
  header.startingX = buffer.readFloat32();
  header.endingX = buffer.readFloat32();
  header.xUnitsType = xzwTypes(buffer.readUint8());
  header.yUnitsType = yTypes(buffer.readUint8());
  const date = new Date();
  const zTypeYear = buffer.readUint16(); //Unrelated to Z axis
  date.setUTCFullYear(zTypeYear % 4096); // todo might be wrong
  date.setUTCMonth(Math.max(buffer.readUint8() - 1, 0));
  date.setUTCDate(buffer.readUint8());
  date.setUTCHours(buffer.readUint8());
  date.setUTCMinutes(buffer.readUint8());
  header.date = date.toISOString();
  header.resolutionDescription = buffer
    .readChars(8)
    .trim()
    .replace(/\x00/g, '');
  header.peakPointNumber = buffer.readUint16();
  header.scans = buffer.readUint16();
  header.spare = [];
  for (let i = 0; i < 7; i++) {
    header.spare.push(buffer.readFloat32());
  }
  header.memo = buffer.readChars(130).trim().replace(/\x00/g, '');
  header.xyzLabels = buffer.readChars(30).trim().replace(/\x00/g, '');
  return header;
}
