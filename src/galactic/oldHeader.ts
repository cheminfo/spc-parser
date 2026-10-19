import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';

import { resolveAxes } from './axes.ts';
import { headerHints } from './headerHints.ts';
import { readMemoAndLabels, readText } from './headerText.ts';
import type { TheOldHeader } from './headerTypes.ts';
import { xzwTypes, yTypes } from './types.ts';
import { decodeOldDate } from './utility/headerDates.ts';
import type { FlagParameters } from './utility/headerUtilities.ts';

/**
 * Old-format (`0x4D`) file-header parsing. The buffer must be positioned after
 * the flag and version bytes.
 * @param buffer - SPC buffer.
 * @param parameters - decoded flag byte.
 * @param fileVersion - version byte.
 * @param context - shared parse state (encoding, warnings).
 * @returns The old-format header.
 */
export function parseOldHeader(
  buffer: IOBuffer,
  parameters: FlagParameters,
  fileVersion: number,
  context: ParseContext,
): TheOldHeader {
  const textOptions = { encoding: context.encoding };
  const exponentY = buffer.readInt16(); //Word (16 bits) instead of byte
  const numberPoints = buffer.readFloat32();
  const startingX = buffer.readFloat32();
  const endingX = buffer.readFloat32();
  const xCode = buffer.readUint8();
  const yCode = buffer.readUint8();
  const rawDate = [
    buffer.readUint16(),
    buffer.readUint8(),
    buffer.readUint8(),
    buffer.readUint8(),
    buffer.readUint8(),
  ] as const;
  const zCode = rawDate[0] >>> 12;
  const { date, layout: dateLayout } = decodeOldDate(
    ...rawDate,
    context.timeZone,
  );
  if ((rawDate[0] & 0x0fff) !== 0 && dateLayout === undefined) {
    context.warn(`Old-format date ${rawDate.join(',')} is invalid; ignored`);
  }
  const resolutionDescription = readText(buffer, 8, textOptions);
  const peakPointNumber = buffer.readUint16();
  const scans = buffer.readUint16();
  const spare: number[] = [];
  for (let i = 0; i < 7; i++) {
    spare.push(buffer.readFloat32());
  }
  const text = readMemoAndLabels(
    buffer,
    parameters.customAxisLabels || zCode === 15,
    textOptions,
  );
  const codes = {
    experiment: 0,
    x: xCode,
    y: yCode,
    z: zCode,
    w: 0,
    post: 0,
    processing: 0,
  };
  const axes = resolveAxes(
    codes,
    text.customLabels,
    parameters.customAxisLabels,
  );

  return {
    kind: 'old',
    fileVersion,
    parameters,
    exponentY,
    numberPoints,
    startingX,
    endingX,
    xUnitsType: xzwTypes(xCode),
    yUnitsType: yTypes(yCode),
    zUnitsType: xzwTypes(zCode),
    rawDate: [...rawDate],
    ...(date !== undefined && { date, dateLayout }),
    resolutionDescription,
    peakPointNumber,
    scans,
    spare,
    ...text,
    codes,
    axes,
    customLabelsApplied: axes.x.custom || axes.y.custom || axes.z.custom,
    xDirection: undefined,
    ...headerHints(codes, parameters, 0, peakPointNumber),
  };
}
