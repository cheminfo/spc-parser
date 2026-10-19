import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../../utility/naiveDate.ts';
import type { TheOldHeader } from '../../fileHeader.ts';

const corpusDirectory = join(
  import.meta.dirname,
  '..',
  '..',
  '__tests__',
  'data',
  'corpus',
);

/**
 * Loads an old-format corpus fixture.
 * @param name - file name in the corpus folder.
 * @returns The file bytes.
 */
function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(corpusDirectory, name)));
}

const floatNotes = [
  'The 16-bit flag (TSPREC) is set for float32 values; it is ignored',
  'Old-format subfile with exponent -128 read as float32 (undocumented in SPC.H)',
];

test('old-format float subfiles are 4 bytes per point even with TSPREC', () => {
  // CONTOUR is an old multifile of 19 subfiles of 179 points (32-bit).
  const bytes = load('CONTOUR.SPC');
  const view = new DataView(bytes.buffer);
  const numberPoints = 179;
  const size = 32 + 4 * numberPoints;
  view.setInt16(2, -128, true);
  for (let i = 0; i < 19; i++) {
    const position = 224 + i * size;
    view.setInt8(position + 1, -128);
    for (let k = 0; k < numberPoints; k++) {
      view.setFloat32(position + 32 + 4 * k, i * 1000 + k, true);
    }
  }
  bytes[0] = (bytes[0] as number) | 1;
  const result = parse(bytes, { sortX: false });

  expect(result.spectra).toHaveLength(19);
  expect((result.meta as TheOldHeader).spectra).toBe(19);
  expect(result.spectra[18]?.variables.y.data[0]).toBe(18000);
  expect(result.spectra[18]?.variables.y.data[178]).toBe(18178);
  expect(result.warnings).toStrictEqual([...floatNotes, NAIVE_DATE_WARNING]);
});

test('an old single file of float values with TSPREC has no trailing bytes', () => {
  const bytes = load('DOERNER.spc');
  const view = new DataView(bytes.buffer);
  view.setInt16(2, -128, true);
  for (let k = 0; k < 1602; k++) view.setFloat32(256 + 4 * k, k, true);
  bytes[0] = (bytes[0] as number) | 1;
  const result = parse(bytes, { sortX: false });
  const y = result.spectra[0]?.variables.y.data as Float64Array;

  expect(y).toHaveLength(1602);
  expect(y[1601]).toBe(1601);
  expect((result.meta as TheOldHeader).trailingText).toBeUndefined();
  expect(result.warnings).toStrictEqual([...floatNotes, NAIVE_DATE_WARNING]);
});

test('old-format subfiles of mixed widths are each sized from their exponent', () => {
  const header = load('CONTOUR.SPC').subarray(0, 224);
  const numberPoints = 179;
  const widths = [4, 2, 4];
  const bytes = new Uint8Array(224 + 3 * 32 + 10 * numberPoints + 10);
  bytes.set(header);
  bytes[0] = (bytes[0] as number) | 1;
  const view = new DataView(bytes.buffer);
  let position = 224;
  for (let i = 0; i < 3; i++) {
    const isFloat = widths[i] === 4;
    view.setInt8(position + 1, isFloat ? -128 : 16);
    for (let k = 0; k < numberPoints; k++) {
      const offset = position + 32 + (widths[i] as number) * k;
      if (isFloat) view.setFloat32(offset, i * 1000 + k, true);
      else view.setInt16(offset, i * 1000 + k, true);
    }
    position += 32 + (widths[i] as number) * numberPoints;
  }
  const result = parse(bytes, { sortX: false });

  expect(result.spectra).toHaveLength(3);
  expect(result.spectra[1]?.variables.y.data[178]).toBe(1178);
  expect(result.spectra[2]?.variables.y.data[178]).toBe(2178);
  expect(result.warnings).toStrictEqual([
    ...floatNotes,
    '10 bytes after the 3 complete subfiles were ignored',
    NAIVE_DATE_WARNING,
  ]);
});
