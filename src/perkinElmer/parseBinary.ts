import type { MeasurementXY } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';
import { createParseContext } from '../utility/ParseContext.ts';
import { SpcParserError } from '../utility/SpcParserError.ts';
import { createEvenX } from '../utility/createEvenX.ts';

import { buildVariables } from './buildVariables.ts';
import {
  BLOCK_HEADER_SIZE,
  BLOCK_ID,
  DESCRIPTION_LENGTH,
  PEPE_SIGNATURE,
} from './constants.ts';
import {
  parseDatasetMembers,
  readBlockData,
  readNestedBlocks,
} from './parseBlocks.ts';
import type { PerkinElmerMeta, PerkinElmerSpectrumMeta } from './types.ts';

export interface PerkinElmerResult {
  meta: PerkinElmerMeta;
  spectra: MeasurementXY[];
}

/**
 * Parses a binary PerkinElmer `.sp` file: the `PEPE` signature and a 40-byte
 * description, then a sequence of blocks (`uint16` id, `int32` size). Every
 * dataset block (id 120) holds one spectrum; the other blocks (instrument
 * headers, history) are skipped.
 * @param bytes - the whole file as bytes.
 * @param context - shared parse state (options and warnings).
 * @returns The spectra and the file metadata.
 * @throws {SpcParserError} With code `TRUNCATED` when a block runs past the
 * end of the file.
 */
export function parsePerkinElmerBinary(
  bytes: Uint8Array,
  context: ParseContext = createParseContext(),
): PerkinElmerResult {
  const buffer = new IOBuffer(bytes);
  buffer.skip(PEPE_SIGNATURE.length);
  const description = buffer.readUtf8(DESCRIPTION_LENGTH).replace(/\0+$/, '');

  const spectra: MeasurementXY[] = [];
  const xUnits: string[] = [];
  while (buffer.available(BLOCK_HEADER_SIZE)) {
    const id = buffer.readUint16();
    const size = buffer.readInt32();
    if (!buffer.available(size)) {
      throw new SpcParserError(
        'TRUNCATED',
        `PerkinElmer block ${id} at ${buffer.offset - BLOCK_HEADER_SIZE} announces ${size} bytes but the file ends after ${buffer.length - buffer.offset}`,
      );
    }
    if (id !== BLOCK_ID.DATASET) {
      buffer.skip(size);
      continue;
    }
    const fields = parseDatasetMembers(
      readNestedBlocks(readBlockData(buffer, size)),
    );
    xUnits.push(fields.xAxisLabel);
    spectra.push(buildSpectrum(fields, context));
  }
  if (buffer.offset < buffer.length) {
    context.warn(
      `PerkinElmer file: ${buffer.length - buffer.offset} trailing bytes ignored`,
    );
  }

  return {
    meta: { kind: 'pepe', description, xUnits: xUnits[0] ?? '' },
    spectra,
  };
}

/**
 * Builds the spectrum of a dataset block.
 * @param fields - members of the dataset block.
 * @param context - shared parse state.
 * @returns The spectrum.
 */
function buildSpectrum(
  fields: ReturnType<typeof parseDatasetMembers>,
  context: ParseContext,
): MeasurementXY {
  const { yData, numberOfPoints } = fields;
  if (yData.length !== numberOfPoints) {
    context.warn(
      `PerkinElmer dataset ${fields.name}: ${yData.length} values but ${numberOfPoints} points announced`,
    );
  }
  // ABSCISSA_RANGE holds the first and the last X, which may be decreasing.
  const x = createEvenX(fields.minX, fields.maxX, yData.length);
  const meta: PerkinElmerSpectrumMeta = {
    name: fields.name,
    fileType: fields.fileType,
    alias: fields.alias,
    samplingMethod: fields.samplingMethod,
    dataType: fields.dataType,
    xUnitType: fields.xAxisUnitType,
    yUnitType: fields.yAxisUnitType,
    history: fields.history,
  };
  return {
    meta,
    variables: buildVariables(
      x,
      yData,
      fields.xAxisLabel,
      fields.yAxisLabel,
      context.sortX,
    ),
  };
}
