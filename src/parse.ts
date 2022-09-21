import { IOBuffer } from 'iobuffer';

import { readNewDataBlock, readOldDataBlock, Spectrum } from './dataBlock';
import { LogBlock, readLogBlock } from './logBlock';
import { TheOldHeader, TheNewHeader } from './fileHeader';

export type InputData = ArrayBufferLike | ArrayBufferView | IOBuffer | Buffer;
export type Header = TheOldHeader | TheNewHeader;
export interface ParseResult {
  meta: Header;
  spectra: Spectrum[];
  logs?: LogBlock;
}

/**
 * Main header parsing - First 512/256 bytes (new/old format).
 * @param buffer SPC buffer.
 * @return Main header.
 */

/**
 * Parses an SPC file.
 *
 * @param  buffer SPC file buffer.
 * @return Object containing every information contained in the SPC file.
 */
export function parse(buffer: InputData): ParseResult {
  const ioBuffer = new IOBuffer(buffer);

  const parameters = new FlagParameters(buffer.readUint8()); //Each bit contains a parameter
  const fileVersion = buffer.readUint8(); //4B => New format; 4D => LabCalc format

  switch (fileVersion) {
    case 0x4b: // new format
      break;
    case 0x4c:
      buffer.setBigEndian();
      break;
    case 0x4d: { // old LabCalc format
      const meta =  new TheOldHeader(buffer, { parameters, fileVersion });
      return  { meta, spectra: readOldDataBlock(ioBuffer,meta) };
    }
    default:
      throw new Error(
        'Unrecognized file format: byte 01 must be either 4B, 4C or 4D',
      );
  }

  const meta =  new TheNewHeader(buffer, { parameters, fileVersion });
  const spectra = readNewDataBlock(ioBuffer, meta)
  const logs = readLogBlock(ioBuffer, meta.logOffset)

  return { meta, spectra , logs  };

}
