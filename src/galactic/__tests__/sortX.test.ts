import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { xySortX } from 'ml-spectra-processing';
import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import type { Header } from '../fileHeader.ts';

import { patch } from './mutate.ts';

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dirname, 'data', name)));
}

/**
 * Swaps two float32 values of a file.
 * @param bytes - the file.
 * @param first - offset of the first value.
 * @param second - offset of the second value.
 * @returns The patched copy.
 */
function swapFloat32(bytes: Uint8Array, first: number, second: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  return patch(bytes, [
    { offset: first, type: 'float32', value: view.getFloat32(second, true) },
    { offset: second, type: 'float32', value: view.getFloat32(first, true) },
  ]);
}

function firstSpectrum(bytes: Uint8Array, shouldSortX: boolean) {
  const result = parse(bytes, { sortX: shouldSortX });
  const spectrum = result.spectra[0];
  assert(spectrum);
  return {
    x: spectrum.variables.x.data as Float64Array,
    y: spectrum.variables.y.data as Float64Array,
    meta: result.meta as Header,
  };
}

test('sortX false keeps the file order', () => {
  const bytes = read('Ft-ir.spc');
  const sorted = firstSpectrum(bytes, true);
  const fileOrder = firstSpectrum(bytes, false);

  expect(fileOrder.x[0]).toBe(4000);
  expect(fileOrder.x[1]).toBe(3998);
  expect(fileOrder.meta.xDirection).toBe('decreasing');
  expect(sorted.meta.xDirection).toBe('decreasing');
  expect(fileOrder.x.toReversed()).toStrictEqual(sorted.x);
  expect(fileOrder.y.toReversed()).toStrictEqual(sorted.y);
});

test('spectra of a common-X file own their X array', () => {
  const { spectra, meta } = parse(read('m_evenz.spc'));
  const first = spectra[0]?.variables.x.data;
  const second = spectra[1]?.variables.x.data;

  expect((meta as Header).xDirection).toBe('increasing');
  expect(first).toStrictEqual(second);
  expect(first).not.toBe(second);
});

test('an unordered X is sorted with its permutation', () => {
  // s_xy (512 points): swap X[10] and X[300] of the X array at offset 512.
  const bytes = swapFloat32(read('s_xy.spc'), 512 + 40, 512 + 1200);
  const fileOrder = firstSpectrum(bytes, false);
  const sorted = firstSpectrum(bytes, true);

  expect(sorted.meta.xDirection).toBe('unordered');
  expect({ x: sorted.x, y: sorted.y }).toStrictEqual(
    xySortX({ x: fileOrder.x, y: fileOrder.y }),
  );
});

test('a short unordered X is sorted', () => {
  // ms.spc (one XYXY subfile): swap X[0] and X[1], right after the subheader.
  const bytes = swapFloat32(read('ms.spc'), 544, 548);
  const fileOrder = firstSpectrum(bytes, false);
  const sorted = firstSpectrum(bytes, true);

  expect(fileOrder.x).toHaveLength(128);
  expect(sorted.meta.xDirection).toBe('unordered');
  expect({ x: sorted.x, y: sorted.y }).toStrictEqual(
    xySortX({ x: fileOrder.x, y: fileOrder.y }),
  );
});
