import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { xMinMaxValues, xSum } from 'ml-spectra-processing';

import type { ParseResult } from '../parse.ts';
import { SpcParserError } from '../utility/SpcParserError.ts';

/**
 * Compact, deterministic description of a parse outcome, used to pin the
 * output of every fixture in one snapshot.
 */
export type ParseSummary =
  | {
      kind: string;
      spectra: number;
      points: number;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      ySum: number;
      xLabel: string;
      yLabel: string;
      date?: string;
      logEntries?: number;
      warnings: string[];
    }
  | { error: string; code: string; message: string };

/**
 * Extensions of the files the regression suite parses.
 */
export const parsedExtensions = /\.(?:spc|sp|asc|cgm|kin|par|cfl)$/i;

/**
 * Lists recursively the files of every `__tests__/data` folder below a root.
 * @param root - folder to scan.
 * @returns Absolute paths of the parseable fixtures, sorted.
 */
export function listFixtures(root: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(root, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile() || !parsedExtensions.test(entry.name)) continue;
    const parent = entry.parentPath;
    if (!/__tests__[/\\]data(?:[/\\]|$)/.test(`${parent}/`)) continue;
    files.push(join(parent, entry.name));
  }
  return files.toSorted((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Parses a file and summarizes the result or the error.
 * @param parse - the parser.
 * @param bytes - file content.
 * @returns The summary; unexpected (non-SpcParserError) errors are rethrown.
 */
export function summarize(
  parse: (bytes: Uint8Array) => ParseResult,
  bytes: Uint8Array,
): ParseSummary {
  let result: ParseResult;
  try {
    result = parse(bytes);
  } catch (error) {
    if (!(error instanceof SpcParserError)) throw error;
    return { error: error.name, code: error.code, message: error.message };
  }
  return summarizeResult(result);
}

/**
 * Summarizes a successful parse.
 * @param result - the parse result.
 * @returns The summary.
 */
function summarizeResult(result: ParseResult): ParseSummary {
  let points = 0;
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let ySum = 0;
  for (const { variables } of result.spectra) {
    const x = variables.x.data;
    const y = variables.y.data;
    if (x.length !== y.length) {
      throw new Error(`x and y lengths differ: ${x.length} and ${y.length}`);
    }
    if (x.length === 0) continue;
    points += x.length;
    const xRange = xMinMaxValues(x);
    const yRange = xMinMaxValues(y);
    xMin = Math.min(xMin, xRange.min);
    xMax = Math.max(xMax, xRange.max);
    yMin = Math.min(yMin, yRange.min);
    yMax = Math.max(yMax, yRange.max);
    ySum += xSum(y);
  }
  const first = result.spectra[0]?.variables;
  const { meta } = result;
  const logs = result.logs;
  return {
    kind: meta.kind,
    spectra: result.spectra.length,
    points,
    xMin,
    xMax,
    yMin,
    yMax,
    ySum,
    xLabel: `${first?.x.label ?? ''} [${first?.x.units ?? ''}]`,
    yLabel: `${first?.y.label ?? ''} [${first?.y.units ?? ''}]`,
    ...(meta.date !== undefined && { date: meta.date }),
    ...(logs && { logEntries: logs.entries.length }),
    warnings: result.warnings,
  };
}
