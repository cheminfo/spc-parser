import { IOBuffer } from 'iobuffer';

import { xzwTypes, yTypes, experimentSettings } from './types';
import {
  guessType,
  getFlagParameters,
  longToDate,
  FlagParameters,
} from './utility';

export type Header = TheNewHeader | TheOldHeader;
/**
 * Main header parsing - First 512/256 bytes (new/old format).
 * @param buffer SPC buffer.
 * @return Main header.
 */
export function mainHeader(buffer: IOBuffer): Header {
  const parameters = getFlagParameters(buffer.readUint8()); //Each bit contains a parameter
  const fileVersion = buffer.readUint8(); //4B => New format; 4D => LabCalc format

  switch (fileVersion) {
    case 0x4b: // new format
      break;
    case 0x4c:
      buffer.setBigEndian();
      break;
    case 0x4d: // old LabCalc format
      return new TheOldHeader(buffer, { parameters, fileVersion });
    default:
      throw new Error(
        'Unrecognized file format: byte 01 must be either 4B, 4C or 4D',
      );
  }

  return new TheNewHeader(buffer, { parameters, fileVersion });
}

/**
 * Old version files header parsing.
 * @param buffer SPC buffer.
 * @param  prev `{parameters,fileVersion}`
 * @return  Object containing the metadata of the old file.
 */
export class TheOldHeader {
  public fileVersion: number;
  public parameters: FlagParameters;
  public exponentY: number;
  public numberPoints: number;
  public startingX: number;
  public endingX: number;
  public xUnitsType: string | number;
  public yUnitsType: string;
  public date: string;
  public resolutionDescription: string;
  public peakPointNumber: number;
  public scans: number;
  public spare: number[];
  public memo: string;
  public xyzLabels: string;
  public guessedType: string;
  constructor(
    buffer: IOBuffer,
    prev: { parameters: FlagParameters; fileVersion: number },
  ) {
    this.fileVersion = prev.fileVersion;
    this.parameters = prev.parameters;
    this.exponentY = buffer.readInt16(); //Word (16 bits) instead of byte
    this.numberPoints = buffer.readFloat32();
    this.startingX = buffer.readFloat32();
    this.endingX = buffer.readFloat32();
    this.xUnitsType = xzwTypes(buffer.readUint8());
    this.yUnitsType = yTypes(buffer.readUint8());
    const date = new Date();
    const zTypeYear = buffer.readUint16(); //Unrelated to Z axis
    date.setUTCFullYear(zTypeYear % 4096); // TODO: might be wrong
    date.setUTCMonth(Math.max(buffer.readUint8() - 1, 0));
    date.setUTCDate(buffer.readUint8());
    date.setUTCHours(buffer.readUint8());
    date.setUTCMinutes(buffer.readUint8());
    this.date = date.toISOString();
    this.resolutionDescription = buffer
      .readChars(8)
      .trim()
      .replace(/\x00/g, '');
    this.peakPointNumber = buffer.readUint16();
    this.scans = buffer.readUint16();
    this.spare = [];
    for (let i = 0; i < 7; i++) {
      this.spare.push(buffer.readFloat32());
    }
    this.memo = buffer.readChars(130).trim().replace(/\x00/g, '');
    this.xyzLabels = buffer.readChars(30).trim().replace(/\x00/g, '');
    this.guessedType = guessType(this);
  }
}

export class TheNewHeader {
  public fileVersion: number;
  public parameters: FlagParameters;
  public experimentType: string;
  public exponentY: number;
  public numberPoints: number;
  public startingX: number;
  public endingX: number;
  public spectra: number;
  public xUnitsType: string | number;
  public yUnitsType: string;
  public zUnitsType: string | number;
  public postingDisposition: number;
  public date: string;
  public resolutionDescription: string;
  public sourceInstrumentDescription: string;
  public peakPointNumber: number;
  public spare: number[];
  public memo: string;
  public xyzLabels: string;
  public logOffset: number;
  public modifiedFlag: number;
  public processingCode: number;
  public calibrationLevel: number;
  public subMethodSampleInjectionNumber: number;
  public concentrationFactor: number;
  public methodFile: string;
  public zSubIncrement: number;
  public wPlanes: number;
  public wPlaneIncrement: number;
  public wAxisUnits: string | number;
  public reserved: string;
  public guessedType: string;

  constructor(
    buffer: IOBuffer,
    prev: { parameters: FlagParameters; fileVersion: number },
  ) {
    this.fileVersion = prev.fileVersion;
    this.parameters = prev.parameters;
    this.experimentType = experimentSettings(buffer.readUint8()); //Experiment type code (See SPC.h)
    this.exponentY = buffer.readInt8(); //Exponent for Y values (80h = floating point): FloatY = (2^Exp)*IntY/(2^32) 32-bit; FloatY = (2^Exp)*IntY/(2^16) 32-bit
    this.numberPoints = buffer.readUint32(); //Number of points (if not XYXY)
    this.startingX = buffer.readFloat64(); //First X coordinate
    this.endingX = buffer.readFloat64(); //Last X coordinate
    this.spectra = buffer.readUint32(); //Number of spectrums
    this.xUnitsType = xzwTypes(buffer.readUint8()); //X Units type code (See types.js)
    this.yUnitsType = yTypes(buffer.readUint8()); //Y ""
    this.zUnitsType = xzwTypes(buffer.readUint8()); //Z ""
    this.postingDisposition = buffer.readUint8(); //Posting disposition (See GRAMSDDE.H)
    this.date = longToDate(buffer.readUint32()); //Date: minutes = first 6 bits, hours = 5 next bits, days = 5 next, months = 4 next, years = 12 last
    this.resolutionDescription = buffer
      .readChars(9)
      .trim()
      .replace(/\x00/g, ''); //Resolution description text
    this.sourceInstrumentDescription = buffer
      .readChars(9)
      .trim()
      .replace(/\x00/g, ''); // Source Instrument description text
    this.peakPointNumber = buffer.readUint16(); //Peak point number for interferograms
    this.spare = [];
    for (let i = 0; i < 8; i++) {
      this.spare.push(buffer.readFloat32());
    }
    if (this.fileVersion === 0x4c) {
      //Untested case because no test files
      this.spare.reverse();
    }
    this.memo = buffer.readChars(130).replace(/\x00/g, '').trim();
    this.xyzLabels = buffer.readChars(30).replace(/\x00/g, '').trim();
    this.logOffset = buffer.readUint32(); //Byte offset to Log Block
    this.modifiedFlag = buffer.readUint32(); //File modification flag (See values in SPC.H)
    this.processingCode = buffer.readUint8(); //Processing code (See GRAMSDDE.H)
    this.calibrationLevel = buffer.readUint8(); //Calibration level + 1
    this.subMethodSampleInjectionNumber = buffer.readUint16(); //Sub-method sample injection number
    this.concentrationFactor = buffer.readFloat32(); //Floating data multiplier concentration factor
    this.methodFile = buffer.readChars(48).replace(/\x00/g, '').trim(); //Method file
    this.zSubIncrement = buffer.readFloat32(); //Z subfile increment for even Z Multifiles
    this.wPlanes = buffer.readUint32();
    this.wPlaneIncrement = buffer.readFloat32();
    this.wAxisUnits = xzwTypes(buffer.readUint8()); //W axis units code
    this.reserved = buffer.readChars(187).replace(/\x00/g, '').trim(); //Reserved space (Must be zero)
    if (this.xUnitsType === 0) {
      this.xUnitsType = this.xyzLabels.substring(0, 10);
    }
    if (this.zUnitsType === 0) {
      this.zUnitsType = this.xyzLabels.substring(20, 30);
    }
    this.guessedType = guessType(this);
  }
}
