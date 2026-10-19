import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';

import { resolveAxes } from './axes.ts';
import { headerHints } from './headerHints.ts';
import { readMemoAndLabels, readText } from './headerText.ts';
import type { TheNewHeader } from './headerTypes.ts';
import { experimentSettings, xzwTypes, yTypes } from './types.ts';
import { decodeFdate } from './utility/headerDates.ts';
import type { FlagParameters } from './utility/headerUtilities.ts';

/**
 * New-format (`0x4B`/`0x4C`) file-header parsing. The buffer must be
 * positioned after the flag and version bytes, with its endianness set.
 * @param buffer - SPC buffer.
 * @param parameters - decoded flag byte.
 * @param fileVersion - version byte.
 * @param context - shared parse state (encoding, warnings).
 * @returns The new-format header.
 */
export function parseNewHeader(
  buffer: IOBuffer,
  parameters: FlagParameters,
  fileVersion: number,
  context: ParseContext,
): TheNewHeader {
  const textOptions = { encoding: context.encoding };
  const experimentCode = buffer.readUint8();
  const experimentType = experimentSettings(
    experimentCode,
    parameters.useExperimentExtension,
  );
  const exponentY = buffer.readInt8(); // -128 (0x80) means float32 Y values
  const numberPoints = buffer.readUint32();
  const startingX = buffer.readFloat64();
  const endingX = buffer.readFloat64();
  const spectra = buffer.readUint32();
  const xCode = buffer.readUint8();
  const yCode = buffer.readUint8();
  const zCode = buffer.readUint8();
  const postingDisposition = buffer.readUint8();
  const rawDate = buffer.readUint32();
  const { date, layout: dateLayout } = decodeFdate(rawDate, context.timeZone);
  if (dateLayout === 'unix') {
    context.warn(`fdate ${hex(rawDate)} decoded as a Unix timestamp`);
  } else if (rawDate !== 0 && dateLayout === undefined) {
    context.warn(`fdate ${hex(rawDate)} is not a valid date; date ignored`);
  }
  const resolutionDescription = readText(buffer, 9, textOptions);
  const sourceInstrumentDescription = readText(buffer, 9, textOptions);
  const peakPointNumber = buffer.readUint16(); // ZPD index of interferograms
  const spare: number[] = [];
  for (let i = 0; i < 8; i++) {
    spare.push(buffer.readFloat32());
  }
  const text = readMemoAndLabels(
    buffer,
    parameters.customAxisLabels || zCode === 15,
    textOptions,
  );
  const logOffset = buffer.readUint32();
  const modifiedFlag = buffer.readUint32();
  const processingCode = buffer.readUint8();
  const calibrationLevel = buffer.readUint8(); // calibration level + 1
  const subMethodSampleInjectionNumber = buffer.readUint16();
  const concentrationFactor = buffer.readFloat32();
  const methodFile = readText(buffer, 48, textOptions);
  const zSubIncrement = buffer.readFloat32();
  const wPlanes = buffer.readUint32();
  const wPlaneIncrement = buffer.readFloat32();
  const wCode = buffer.readUint8();
  const reserved = readText(buffer, 187, textOptions);
  const codes = {
    experiment: experimentCode,
    x: xCode,
    y: yCode,
    z: zCode,
    w: wCode,
    post: postingDisposition,
    processing: processingCode,
  };
  const axes = resolveAxes(
    codes,
    text.customLabels,
    parameters.customAxisLabels,
  );

  return {
    kind: 'new',
    fileVersion,
    parameters,
    experimentType,
    exponentY,
    numberPoints,
    startingX,
    endingX,
    spectra,
    xUnitsType: xzwTypes(xCode),
    yUnitsType: yTypes(yCode),
    zUnitsType: xzwTypes(zCode),
    postingDisposition,
    rawDate,
    ...(date !== undefined && { date, dateLayout }),
    resolutionDescription,
    sourceInstrumentDescription,
    peakPointNumber,
    spare,
    ...text,
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
    wAxisUnits: xzwTypes(wCode),
    reserved,
    codes,
    axes,
    customLabelsApplied: axes.x.custom || axes.y.custom || axes.z.custom,
    xDirection: undefined,
    ...headerHints(codes, parameters, modifiedFlag, peakPointNumber),
  };
}

/**
 * Formats a DWORD as 8 hexadecimal digits.
 * @param value - the value.
 * @returns The formatted value, e.g. `0x00005000`.
 */
function hex(value: number): string {
  return `0x${value.toString(16).padStart(8, '0')}`;
}
