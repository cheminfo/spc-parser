import { parseXY } from 'xy-parser';

import type { ParseContext } from '../utility/ParseContext.ts';
import { createParseContext } from '../utility/ParseContext.ts';
import { SpcParserError } from '../utility/SpcParserError.ts';
import { hasSignature, readLatin1 } from '../utility/bytes.ts';
import { decodeText } from '../utility/decodeText.ts';

import { buildVariables } from './buildVariables.ts';
import type { PerkinElmerResult } from './parseBinary.ts';
import type { PerkinElmerAsciiSpectrumMeta } from './types.ts';

/**
 * `PE `
 */
const asciiSignature = [0x50, 0x45, 0x20];

/**
 * Parses a PerkinElmer ASCII `.sp` / `.asc` export (`PEDS` format). The text
 * starts with one value per line (signature line, -1, name, creation date and
 * time, modification date and time, analyst, …), then a `#GR` section whose
 * first two lines are the X and Y axis codes and the number of points on the
 * seventh, and a `#DATA` section of tab-separated X/Y pairs.
 * @param bytes - the whole file as bytes.
 * @param context - shared parse state (options and warnings).
 * @returns The spectrum and the file metadata.
 * @throws {SpcParserError} With code `TRUNCATED` when the `#GR` or `#DATA`
 * section is missing.
 */
export function parsePerkinElmerAscii(
  bytes: Uint8Array,
  context: ParseContext = createParseContext(),
): PerkinElmerResult {
  const text = decodeText(bytes, { encoding: context.encoding });
  const dataStart = text.indexOf('#DATA');
  const lines = text
    .slice(0, dataStart)
    .split(/\r?\n/)
    .map((line) => line.trim());
  const graph = lines.indexOf('#GR');
  if (dataStart === -1 || graph === -1) {
    throw new SpcParserError(
      'TRUNCATED',
      'PerkinElmer ASCII file: no #GR or #DATA section',
    );
  }

  const dataLineEnd = text.indexOf('\n', dataStart);
  const data = parseXY(dataLineEnd === -1 ? '' : text.slice(dataLineEnd + 1));
  const numberPoints = Number(lines[graph + 7]);
  if (data.x.length !== numberPoints) {
    context.warn(
      `PerkinElmer ASCII file: ${data.x.length} points but ${lines[graph + 7]} announced`,
    );
  }

  const xUnits = getLine(lines, graph + 1);
  const meta: PerkinElmerAsciiSpectrumMeta = {
    name: getLine(lines, 2),
    creationDate: `${getLine(lines, 3)} ${getLine(lines, 4)}`,
    modificationDate: `${getLine(lines, 5)} ${getLine(lines, 6)}`,
    analyst: getLine(lines, 7),
  };

  return {
    meta: {
      kind: 'peds',
      description: getLine(lines, 0).replaceAll(/\s+/g, ' '),
      xUnits,
    },
    spectra: [
      {
        meta,
        variables: buildVariables(
          Float64Array.from(data.x),
          Float64Array.from(data.y),
          xUnits,
          getLine(lines, graph + 2),
          context.sortX,
        ),
      },
    ],
  };
}

/**
 * Detects a PerkinElmer ASCII export: the file starts with `PE ` and its
 * first line names the `PEDS` format.
 * @param bytes - the whole file as bytes.
 * @returns True when the bytes look like a PerkinElmer ASCII file.
 */
export function isPerkinElmerAscii(bytes: Uint8Array): boolean {
  if (!hasSignature(bytes, asciiSignature)) return false;
  const firstLine = readLatin1(bytes, 0, 128).split(/[\r\n]/, 1)[0] ?? '';
  return /\bPEDS\b/.test(firstLine);
}

/**
 * Gets a header line.
 * @param lines - trimmed header lines.
 * @param index - line index.
 * @returns The line, `''` when absent.
 */
function getLine(lines: string[], index: number): string {
  return lines[index] ?? '';
}
