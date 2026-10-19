import type { MeasurementXY } from 'cheminfo-types';
import type { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../../utility/ParseContext.ts';
import { createParseContext } from '../../utility/ParseContext.ts';
import { SpcParserError } from '../../utility/SpcParserError.ts';
import { createEvenX } from '../../utility/createEvenX.ts';
import type { TheNewHeader } from '../fileHeader.ts';
import { getDataShape } from '../utility/getDataShape.ts';

import type { DirectoryEntry } from './directory.ts';
import { readDirectory } from './directory.ts';
import type { SubfileLocation } from './readSubfile.ts';
import { readSubfile, subHeaderLength } from './readSubfile.ts';
import { readFloat32Array } from './readValues.ts';
import type { SpectrumMeta } from './shared.ts';
import { getNewSubfileCount, reportEncodingNotes } from './subfileLayout.ts';
import { applyZwAxes } from './zwAxes.ts';

const headerLength = 512;

/**
 * Reads the data block of the SPC file.
 * @param buffer - spc buffer.
 * @param fileHeader - main header.
 * @param context - shared parse state (options and warnings).
 * @returns Array containing the spectra.
 */
export function newDataBlock(
  buffer: IOBuffer,
  fileHeader: TheNewHeader,
  context: ParseContext = createParseContext(),
): MeasurementXY[] {
  const { parameters, numberPoints } = fileHeader;
  const dataShape = getDataShape(parameters);
  const hasOwnX = dataShape === 'XYXY' || dataShape === 'exception';
  if (parameters.xyxy && !parameters.xy) {
    context.warn(
      'The XYXY flag (TXYXYS) is set without TXVALS; it is ignored and the X values are shared',
    );
  }
  const fileLength = buffer.length;
  let position = headerLength;

  let commonX: Float64Array | undefined;
  if (!hasOwnX) {
    const xBytes = dataShape === 'XY' || dataShape === 'XYY' ? 4 : 0;
    const minimalYBytes = parameters.y16BitPrecision ? 2 : 4;
    const minimalEnd =
      position +
      xBytes * numberPoints +
      subHeaderLength +
      minimalYBytes * numberPoints;
    if (minimalEnd > fileLength) {
      throw new SpcParserError(
        'TRUNCATED',
        `Truncated SPC file: ${fileLength} bytes cannot hold the X values and one subfile of ${numberPoints} points`,
      );
    }
    buffer.seek(position);
    commonX = xBytes
      ? readFloat32Array(buffer, numberPoints)
      : createEvenX(fileHeader.startingX, fileHeader.endingX, numberPoints);
    position += xBytes * numberPoints;
  }

  const announced = getNewSubfileCount(
    fileHeader.spectra,
    parameters.multiFile,
    context,
  );
  const isInferred = announced === undefined;
  const count = announced ?? Infinity;
  const { logOffset } = fileHeader;
  const limit =
    isInferred && logOffset > position && logOffset <= fileLength
      ? logOffset
      : fileLength;
  const directory =
    hasOwnX && announced !== undefined
      ? readDirectory(buffer, numberPoints, announced, logOffset, context)
      : undefined;
  if (directory) {
    fileHeader.directoryOffset = numberPoints;
    fileHeader.directory = directory;
  }
  const walk: SubfileWalk = {
    start: position,
    count,
    isInferred,
    location: {
      limit,
      fileHeader,
      hasOwnX,
      commonX,
      sortX: context.sortX,
      textEncoding: context.encoding,
    },
  };
  let result = walkSubfiles(buffer, walk, directory);
  if (directory && result.failedAt !== undefined) {
    const sequential = walkSubfiles(buffer, walk, undefined);
    if (sequential.spectra.length > result.spectra.length) {
      context.warn(
        `Subfile directory entry ${result.failedAt + 1} of ${directory.length} points to an unreadable subfile (${directory[result.failedAt]?.position}); subfiles read sequentially`,
      );
      result = sequential;
    }
  }
  const reported = new Set<string>();
  for (const notes of result.notes) {
    reportEncodingNotes(notes, reported, context);
  }
  if (result.failedAt !== undefined) {
    reportTruncation(result.failedAt, fileHeader.spectra, context);
  }
  const { spectra } = result;
  const metas = spectra.map((spectrum) => spectrum.meta as SpectrumMeta);
  const layout = applyZwAxes(metas, fileHeader, context);
  if (layout.zSpacing) fileHeader.zSpacing = layout.zSpacing;
  if (layout.planeSize) fileHeader.planeSize = layout.planeSize;
  return spectra;
}

/**
 * How to walk the subfiles of a new-format file.
 */
interface SubfileWalk {
  /**
   * Offset of the first subfile.
   */
  start: number;
  /**
   * Number of subfiles, `Infinity` when inferred from the file size.
   */
  count: number;
  /**
   * The count is inferred: stop quietly at the first subfile that does not fit.
   */
  isInferred: boolean;
  /**
   * Layout shared by every subfile.
   */
  location: Omit<SubfileLocation, 'position'>;
}

/**
 * Subfiles read by {@link walkSubfiles}.
 */
interface WalkResult {
  spectra: MeasurementXY[];
  /**
   * Encoding notes of each subfile.
   */
  notes: string[][];
  /**
   * Index of the first announced subfile that does not fit.
   */
  failedAt: number | undefined;
}

/**
 * Reads the subfiles one after the other, or where a directory puts them.
 * @param buffer - SPC buffer.
 * @param walk - where the subfiles start and how many there are.
 * @param directory - validated subfile directory, if any.
 * @returns The subfiles read and the first one that does not fit.
 */
function walkSubfiles(
  buffer: IOBuffer,
  walk: SubfileWalk,
  directory: DirectoryEntry[] | undefined,
): WalkResult {
  const { count, isInferred, location } = walk;
  const spectra: MeasurementXY[] = [];
  const notes: string[][] = [];
  let position = walk.start;
  for (let index = 0; index < count; index++) {
    if (isInferred && position + subHeaderLength > location.limit) break;
    const subfile = readSubfile(buffer, {
      ...location,
      position: directory?.[index]?.position ?? position,
      nextPosition: directory?.[index + 1]?.position,
    });
    if (subfile === undefined) {
      if (isInferred && index > 0) break;
      return { spectra, notes, failedAt: index };
    }
    subfile.meta.index = index;
    notes.push(subfile.notes);
    spectra.push({ meta: subfile.meta, variables: subfile.variables });
    position = subfile.end;
  }
  return { spectra, notes, failedAt: undefined };
}

/**
 * Reports a subfile that does not fit in the file.
 * @param index - 0-based index of the incomplete subfile.
 * @param announced - `fnsub` from the header.
 * @param context - receives the warning.
 */
function reportTruncation(
  index: number,
  announced: number,
  context: ParseContext,
): void {
  const total = Math.max(announced, 1);
  if (index === 0) {
    throw new SpcParserError(
      'TRUNCATED',
      `Truncated SPC file: subfile 1 of ${total} is incomplete`,
    );
  }
  context.warn(
    `Subfile ${index + 1} of ${total} is truncated; ${index} complete subfiles returned`,
  );
}
