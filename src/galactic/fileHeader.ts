import type { IOBuffer } from 'iobuffer';

import { experimentSettings, xzwTypes, yTypes } from './types.ts';
import type { FlagParameters } from './utility/headerUtils.ts';
import { longToDate, parseFlagParameters } from './utility/headerUtils.ts';

interface HeaderOptions {
  parameters: FlagParameters;
  fileVersion: number;
}

/** Old-format (LabCalc) file header. */
export interface TheOldHeader {
  kind: 'old';
  fileVersion: number;
  parameters: FlagParameters;
  exponentY: number;
  numberPoints: number;
  startingX: number;
  endingX: number;
  xUnitsType: string | number;
  yUnitsType: string;
  date: string;
  resolutionDescription: string;
  peakPointNumber: number;
  scans: number;
  spare: number[];
  memo: string;
  xyzLabels: string;
}

/** New-format file header. */
export interface TheNewHeader {
  kind: 'new';
  fileVersion: number;
  parameters: FlagParameters;
  experimentType: string;
  exponentY: number;
  numberPoints: number;
  startingX: number;
  endingX: number;
  spectra: number;
  xUnitsType: string | number;
  yUnitsType: string;
  zUnitsType: string | number;
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
  wAxisUnits: string | number;
  reserved: string;
}

export type Header = TheOldHeader | TheNewHeader;

/**
 * Old-format File-header parsing.
 * @param buffer - spc buffer.
 * @param prev - `{parameters, fileVersion}`.
 * @returns file metadata.
 */
function parseOldHeader(buffer: IOBuffer, prev: HeaderOptions): TheOldHeader {
  const exponentY = buffer.readInt16(); //Word (16 bits) instead of byte
  const numberPoints = buffer.readFloat32();
  const startingX = buffer.readFloat32();
  const endingX = buffer.readFloat32();
  const xUnitsType = xzwTypes(buffer.readUint8());
  const yUnitsType = yTypes(buffer.readUint8());
  const date = new Date();
  const zTypeYear = buffer.readUint16(); //Unrelated to Z axis
  date.setUTCFullYear(zTypeYear % 4096); // TODO: might be wrong
  date.setUTCMonth(Math.max(buffer.readUint8() - 1, 0));
  date.setUTCDate(buffer.readUint8());
  date.setUTCHours(buffer.readUint8());
  date.setUTCMinutes(buffer.readUint8());
  const resolutionDescription = buffer
    .readChars(8)
    .replaceAll('\u0000', '')
    .trim();
  const peakPointNumber = buffer.readUint16();
  const scans = buffer.readUint16();
  const spare: number[] = [];
  for (let i = 0; i < 7; i++) {
    spare.push(buffer.readFloat32());
  }
  const memo = buffer.readChars(130).replaceAll('\u0000', '').trim();
  const xyzLabels = buffer.readChars(30).replaceAll('\u0000', '').trim();

  return {
    kind: 'old',
    fileVersion: prev.fileVersion, //Each bit contains a parameter
    parameters: prev.parameters, //4B => New format; 4D => LabCalc format
    exponentY,
    numberPoints,
    startingX,
    endingX,
    xUnitsType,
    yUnitsType,
    date: date.toISOString(),
    resolutionDescription,
    peakPointNumber,
    scans,
    spare,
    memo,
    xyzLabels,
  };
}

/**
 * New format file-header parsing.
 * @param buffer - spc buffer.
 * @param prev - `{parameters, fileVersion}`.
 * @returns file metadata.
 */
function parseNewHeader(buffer: IOBuffer, prev: HeaderOptions): TheNewHeader {
  const experimentType = experimentSettings(buffer.readUint8()); //Experiment type code (See SPC.h)
  const exponentY = buffer.readInt8(); //Exponent for Y values (80h = floating point): FloatY = (2^Exp)*IntY/(2^32) 32-bit; FloatY = (2^Exp)*IntY/(2^16) 32-bit
  const numberPoints = buffer.readUint32(); //Number of points (if not XYXY)
  const startingX = buffer.readFloat64(); //First X coordinate
  const endingX = buffer.readFloat64(); //Last X coordinate
  const spectra = buffer.readUint32(); //Number of spectrums
  let xUnitsType: string | number = xzwTypes(buffer.readUint8()); //X Units type code (See types.js)
  const yUnitsType = yTypes(buffer.readUint8()); //Y ""
  let zUnitsType: string | number = xzwTypes(buffer.readUint8()); //Z ""
  const postingDisposition = buffer.readUint8(); //Posting disposition (See GRAMSDDE.H)
  const date = longToDate(buffer.readUint32()); //Date: minutes = first 6 bits, hours = 5 next bits, days = 5 next, months = 4 next, years = 12 last
  const resolutionDescription = buffer
    .readChars(9)
    .replaceAll('\u0000', '')
    .trim(); //Resolution description text
  const sourceInstrumentDescription = buffer
    .readChars(9)
    .replaceAll('\u0000', '')
    .trim(); // Source Instrument description text
  const peakPointNumber = buffer.readUint16(); //Peak point number for interferograms
  let spare: number[] = [];
  for (let i = 0; i < 8; i++) {
    spare.push(buffer.readFloat32());
  }
  if (prev.fileVersion === 0x4c) {
    //Untested case because no test files
    spare = spare.toReversed();
  }
  const memo = buffer.readChars(130).replaceAll('\u0000', '').trim();
  const xyzLabels = buffer.readChars(30).replaceAll('\u0000', '').trim();
  const logOffset = buffer.readUint32(); //Byte offset to Log Block
  const modifiedFlag = buffer.readUint32(); //File modification flag (See values in SPC.H)
  const processingCode = buffer.readUint8(); //Processing code (See GRAMSDDE.H)
  const calibrationLevel = buffer.readUint8(); //Calibration level + 1
  const subMethodSampleInjectionNumber = buffer.readUint16(); //Sub-method sample injection number
  const concentrationFactor = buffer.readFloat32(); //Floating data multiplier concentration factor
  const methodFile = buffer.readChars(48).replaceAll('\u0000', '').trim(); //Method file
  const zSubIncrement = buffer.readFloat32(); //Z subfile increment for even Z Multifiles
  const wPlanes = buffer.readUint32();
  const wPlaneIncrement = buffer.readFloat32();
  const wAxisUnits = xzwTypes(buffer.readUint8()); //W axis units code
  const reserved = buffer.readChars(187).replaceAll('\u0000', '').trim(); //Reserved space (Must be zero)
  if (xUnitsType === 0) {
    xUnitsType = xyzLabels.slice(0, 10);
  }
  if (zUnitsType === 0) {
    zUnitsType = xyzLabels.slice(20, 30);
  }

  return {
    kind: 'new',
    fileVersion: prev.fileVersion, //Each bit contains a parameter
    parameters: prev.parameters, //4B => New format; 4D => LabCalc format
    experimentType,
    exponentY,
    numberPoints,
    startingX,
    endingX,
    spectra,
    xUnitsType,
    yUnitsType,
    zUnitsType,
    postingDisposition,
    date,
    resolutionDescription,
    sourceInstrumentDescription,
    peakPointNumber,
    spare,
    memo,
    xyzLabels,
    logOffset,
    modifiedFlag,
    processingCode,
    calibrationLevel,
    subMethodSampleInjectionNumber,
    concentrationFactor,
    methodFile,
    zSubIncrement,
    wPlanes,
    wPlaneIncrement,
    wAxisUnits,
    reserved,
  };
}

/**
 * File-header parsing - First 512/256 bytes (new/old format).
 * @param buffer - SPC buffer.
 * @returns File-header object.
 */
export function fileHeader(buffer: IOBuffer): Header {
  const parameters = parseFlagParameters(buffer.readUint8()); //Each bit contains a parameter
  const fileVersion = buffer.readUint8(); //4B => New format; 4D => LabCalc format
  const headerOpts = { parameters, fileVersion };

  switch (fileVersion) {
    case 0x4b: // new format
      break;
    case 0x4c:
      buffer.setBigEndian();
      break;
    case 0x4d: {
      // old LabCalc format
      return parseOldHeader(buffer, headerOpts);
    }
    default:
      throw new Error(
        'Unrecognized file format: byte 01 must be either 4B, 4C or 4D',
      );
  }
  return parseNewHeader(buffer, headerOpts);
}
