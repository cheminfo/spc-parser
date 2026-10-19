import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { NumberArray } from 'cheminfo-types';
import { xMaxAbsoluteValue, xSubtract } from 'ml-spectra-processing';
import { expect, test } from 'vitest';
import { parseXY } from 'xy-parser';

import { parse } from '../../parse.ts';

const corpusDirectory = join(import.meta.dirname, 'data', 'corpus');

/**
 * Reads a corpus file as bytes.
 * @param name - file name in the corpus folder.
 * @returns The file bytes.
 */
function load(name: string): Buffer {
  return readFileSync(join(corpusDirectory, name));
}

/**
 * Largest absolute difference between two arrays of the same length.
 * @param actual - values read from the SPC file.
 * @param expected - values of the reference export.
 * @returns The maximal absolute difference.
 */
function maxDifference(actual: NumberArray, expected: NumberArray): number {
  return xMaxAbsoluteValue(xSubtract(actual, expected));
}

/**
 * Parses a single-spectrum SPC file and its two-column reference export.
 * @param name - SPC file name; the export is `<name>.txt`.
 * @returns The spectrum variables, the reference and the spectrum count.
 */
function compareWithExport(name: string) {
  const result = parse(load(name), { sortX: false });
  const reference = parseXY(load(`${name}.txt`));
  const variables = result.spectra[0]?.variables;
  return {
    spectra: result.spectra.length,
    length: variables?.x.data.length,
    referenceLength: reference.x.length,
    xDifference: maxDifference(variables?.x.data ?? [], reference.x),
    yDifference: maxDifference(variables?.y.data ?? [], reference.y),
  };
}

test('DOERNER matches its X/Y export to the printed precision', () => {
  const comparison = compareWithExport('DOERNER.spc');

  expect(comparison).toMatchObject({
    spectra: 1,
    length: 1602,
    referenceLength: 1602,
  });
  expect(comparison.xDifference).toBeLessThan(1e-8);
  expect(comparison.yDifference).toBeLessThan(1e-7);
});

test('KRY3 matches its X/Y export exactly', () => {
  expect(compareWithExport('KRY3.SPC')).toStrictEqual({
    spectra: 1,
    length: 151,
    referenceLength: 151,
    xDifference: 0,
    yDifference: 0,
  });
});

test('CAthickyellow matches its X/Y export to the printed precision', () => {
  const comparison = compareWithExport('CAthickyellow_try4_18.spc');

  expect(comparison).toMatchObject({
    spectra: 1,
    length: 1024,
    referenceLength: 1024,
    yDifference: 0,
  });
  expect(comparison.xDifference).toBeLessThan(1e-9);
});

test('wplanes matches its 30-column export to the printed precision', () => {
  const result = parse(load('wplanes.spc'), { sortX: false });
  const text = load('wplanes.txt');

  expect(result.spectra).toHaveLength(30);

  let xDifference = 0;
  let yDifference = 0;
  for (let column = 1; column <= 30; column++) {
    const reference = parseXY(text, { xColumn: 0, yColumn: column });
    const variables = result.spectra[column - 1]?.variables;

    expect(reference.x).toHaveLength(256);

    xDifference = Math.max(
      xDifference,
      maxDifference(variables?.x.data ?? [], reference.x),
    );
    yDifference = Math.max(
      yDifference,
      maxDifference(variables?.y.data ?? [], reference.y),
    );
  }

  expect(xDifference).toBeLessThanOrEqual(0.05);
  expect(yDifference).toBeLessThanOrEqual(0.05 + 1e-12);
});
