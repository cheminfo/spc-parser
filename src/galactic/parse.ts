import type { MeasurementXY } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

import { galacticHeaderLength } from '../detect/isGalactic.ts';
import type { ParseContext } from '../utility/ParseContext.ts';
import { SpcParserError } from '../utility/SpcParserError.ts';

import { newDataBlock } from './dataBlock/newDataBlock.ts';
import { oldDataBlock } from './dataBlock/oldDataBlock.ts';
import type { Header } from './fileHeader.ts';
import { fileHeader } from './fileHeader.ts';
import type { LogBlock } from './logBlock.ts';
import { readLogBlock } from './logBlock.ts';
import { applyLogMetadata } from './logMetadata.ts';
import { probeLogBlock } from './logProbe.ts';

export interface GalacticParseResult {
  meta: Header;
  spectra: MeasurementXY[];
  logs: LogBlock | null;
}

/**
 * Parses a Thermo Galactic GRAMS SPC file (`0x4B`/`0x4C`/`0x4D`).
 * @param ioBuffer - SPC buffer positioned at the start of the file.
 * @param context - shared parse state (options and warnings).
 * @returns JSON-like object with information contained in the SPC file.
 */
export function parseGalactic(
  ioBuffer: IOBuffer,
  context: ParseContext,
): GalacticParseResult {
  checkHeaderLength(ioBuffer);
  const meta = fileHeader(ioBuffer, context);

  if (meta.kind === 'new') {
    const spectra = newDataBlock(ioBuffer, meta, context);
    const logs =
      meta.logOffset === 0
        ? probeLogBlock(ioBuffer, meta, context)
        : readLogBlock(ioBuffer, meta.logOffset, context);
    applyLogMetadata(logs, meta, spectra, context.sortX, context.timeZone);
    return { meta, spectra, logs };
  }
  return {
    meta,
    spectra: oldDataBlock(ioBuffer, meta, context),
    logs: null,
  };
}

/**
 * Throws when the file is shorter than its main header (512 bytes for the new
 * format, 256 for the old one, which includes the first subfile header).
 * @param ioBuffer - SPC buffer positioned at the start of the file.
 */
function checkHeaderLength(ioBuffer: IOBuffer): void {
  const minimum = galacticHeaderLength(
    new Uint8Array(ioBuffer.buffer, ioBuffer.byteOffset, ioBuffer.length),
  );
  if (ioBuffer.length < minimum) {
    throw new SpcParserError(
      'TRUNCATED',
      `Truncated SPC file: ${ioBuffer.length} bytes, the header needs ${minimum}`,
    );
  }
}
