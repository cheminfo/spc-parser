import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';
import { createParseContext } from '../utility/ParseContext.ts';

import type { Header } from './headerTypes.ts';
import { parseNewHeader } from './newHeader.ts';
import { parseOldHeader } from './oldHeader.ts';
import { parseFlagParameters } from './utility/headerUtilities.ts';

export type { CustomLabels } from './headerText.ts';
export type { Header, TheNewHeader, TheOldHeader } from './headerTypes.ts';

/**
 * File-header parsing - First 512/256 bytes (new/old format).
 * @param buffer - SPC buffer.
 * @param context - shared parse state (encoding, warnings).
 * @returns File-header object.
 */
export function fileHeader(
  buffer: IOBuffer,
  context: ParseContext = createParseContext(),
): Header {
  const parameters = parseFlagParameters(buffer.readUint8());
  const fileVersion = buffer.readUint8(); // 4B/4C => new format; 4D => LabCalc

  switch (fileVersion) {
    case 0x4b:
      break;
    case 0x4c:
      buffer.setBigEndian();
      break;
    case 0x4d:
      return parseOldHeader(buffer, parameters, fileVersion, context);
    default:
      throw new Error(
        'Unrecognized file format: byte 01 must be either 4B, 4C or 4D',
      );
  }
  return parseNewHeader(buffer, parameters, fileVersion, context);
}
