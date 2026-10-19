import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { MeasurementXY } from 'cheminfo-types';
import { xMaxValue, xSum } from 'ml-spectra-processing';
import { expect, test } from 'vitest';

import { parse } from '../../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../../utility/naiveDate.ts';
import type { Patch } from '../../__tests__/mutate.ts';
import { patch } from '../../__tests__/mutate.ts';

const dataDirectory = join(
  import.meta.dirname,
  '..',
  '..',
  '__tests__',
  'data',
);

/**
 * Loads a Galactic fixture.
 * @param name - file name, relative to the data folder.
 * @returns The file bytes.
 */
function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dataDirectory, name)));
}

/**
 * Sums the Y values of every spectrum.
 * @param spectra - the spectra.
 * @returns The total.
 */
function sumY(spectra: MeasurementXY[]): number {
  let total = 0;
  for (const spectrum of spectra) {
    total += xSum(spectrum.variables.y.data);
  }
  return total;
}

/**
 * Maximum Y of one spectrum.
 * @param spectra - the spectra.
 * @param index - index of the spectrum.
 * @returns The maximum.
 */
function maxY(spectra: MeasurementXY[], index: number): number {
  return xMaxValue((spectra[index] as MeasurementXY).variables.y.data);
}

test('a subfile exponent of 0 is literal in a multifile', () => {
  const { spectra, warnings } = parse(load('m_evenz.spc'));

  expect(maxY(spectra, 1)).toBe(0.4757522940635681);
  expect(spectra[1]?.meta).toMatchObject({
    exponentY: 0,
    exponent: 0,
    isFloat: false,
  });
  expect(sumY(spectra)).toBeCloseTo(5752.069224, 6);
  expect(spectra[6]?.variables.y.data[4]).toBeCloseTo(0.3032105267047882);
  expect(warnings).toStrictEqual([
    'fdate 0x00005000 is not a valid date; date ignored',
  ]);
});

test('the old-format DEMO_3D decodes like its new-format twin m_evenz', () => {
  const oldFormat = parse(load('corpus/DEMO_3D.SPC')).spectra;
  const newFormat = parse(load('m_evenz.spc')).spectra;

  expect(oldFormat).toHaveLength(32);

  for (let i = 0; i < 32; i++) {
    expect(oldFormat[i]?.variables.x.data).toStrictEqual(
      newFormat[i]?.variables.x.data,
    );
    expect(oldFormat[i]?.variables.y.data).toStrictEqual(
      newFormat[i]?.variables.y.data,
    );
  }
});

test('LC_DIODE_ARRAY subfiles with exponent 0 are continuous', () => {
  const { spectra } = parse(load('corpus/LC_DIODE_ARRAY.SPC'));

  expect(maxY(spectra, 38)).toBe(0.24762725830078125);
  expect(maxY(spectra, 39)).toBe(0.250762939453125);
  expect(maxY(spectra, 40)).toBe(0.22653961181640625);
  expect(spectra[39]?.meta).toMatchObject({ exponentY: 0, exponent: 0 });
  expect(sumY(spectra)).toBeCloseTo(773.1371346, 6);
});

test('a single file uses the file exponent and keeps the raw subexp', () => {
  const { spectra } = parse(load('NDR0002.SPC'));
  const y = spectra[0]?.variables.y.data as Float64Array;

  expect(spectra[0]?.meta).toMatchObject({
    exponentY: 0,
    exponent: 2,
    isFloat: false,
  });
  expect(xMaxValue(y)).toBe(1);
});

test('the 16-bit flag is ignored for float values', () => {
  const original = parse(load('raman-caco3.spc'));
  const bytes = load('raman-caco3.spc');
  // Set TSPREC on a file whose values are float32 (fexp -128).
  bytes[0] = (bytes[0] as number) | 0x01;
  const result = parse(bytes);

  expect(result.spectra[0]?.variables.y.data).toStrictEqual(
    original.spectra[0]?.variables.y.data,
  );
  expect(result.warnings).toStrictEqual([
    'The 16-bit flag (TSPREC) is set for float32 values; it is ignored',
  ]);
});

test('a float file exponent wins over integer subfile exponents', () => {
  const original = parse(load('raman-sion.spc'));
  const bytes = load('raman-sion.spc');
  const view = new DataView(bytes.buffer);
  const numberPoints = view.getUint32(4, true);
  const subfileSize = 32 + 4 * numberPoints;
  const patches: Patch[] = [];
  // Set subexp (byte 1 of every subheader) to 0 while fexp stays -128.
  for (let i = 0; i < 36; i++) {
    patches.push({ offset: 512 + i * subfileSize + 1, type: 'int8', value: 0 });
  }
  const result = parse(patch(bytes, patches));

  expect(result.spectra).toHaveLength(36);

  for (let i = 0; i < 36; i++) {
    expect(result.spectra[i]?.variables.y.data).toStrictEqual(
      original.spectra[i]?.variables.y.data,
    );
  }

  expect(result.spectra[0]?.meta).toMatchObject({
    exponentY: 0,
    exponent: -128,
    isFloat: true,
  });
  expect(result.warnings).toStrictEqual([
    'The file exponent is -128 (float) but a subfile exponent is not; its values are read as float32',
  ]);
});

test('old-format float values are read as float32 with a warning', () => {
  const bytes = load('corpus/DOERNER.spc');
  // DOERNER is a single old file: oexp (int16 at 2) governs.
  const view = new DataView(bytes.buffer);
  view.setInt16(2, -128, true);
  const yOffset = 256;
  view.setFloat32(yOffset, 1.5, true);
  view.setFloat32(yOffset + 4, -2.25, true);
  const result = parse(bytes);
  const y = result.spectra[0]?.variables.y.data as Float64Array;

  expect(result.spectra[0]?.meta).toMatchObject({
    exponent: -128,
    isFloat: true,
  });
  expect([y[0], y[1]]).toStrictEqual([1.5, -2.25]);
  expect(result.warnings).toStrictEqual([
    'Old-format subfile with exponent -128 read as float32 (undocumented in SPC.H)',
    NAIVE_DATE_WARNING,
  ]);
});
