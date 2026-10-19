import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import type { ParseResult } from '../../../parse.ts';
import { parse } from '../../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../../utility/naiveDate.ts';
import type { Patch } from '../../__tests__/mutate.ts';
import { patch } from '../../__tests__/mutate.ts';
import type { SpectrumMeta } from '../shared.ts';

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
 * Lists one metadata field of every spectrum.
 * @param result - a parse result.
 * @param key - the field.
 * @returns The values, in file order.
 */
function field(
  result: ParseResult,
  key: keyof SpectrumMeta,
): Array<SpectrumMeta[keyof SpectrumMeta]> {
  return result.spectra.map((spectrum) => (spectrum.meta as SpectrumMeta)[key]);
}

/**
 * Metadata of one spectrum.
 * @param result - a parse result.
 * @param index - index of the spectrum.
 * @returns The metadata.
 */
function metaOf(result: ParseResult, index: number): SpectrumMeta {
  return result.spectra[index]?.meta as SpectrumMeta;
}

test('even Z is computed from fzinc, not from the stale subtimes', () => {
  const result = parse(load('m_evenz.spc'));
  const z = field(result, 'z');

  expect(z.slice(0, 4)).toStrictEqual([0, 0.5, 1, 1.5]);
  expect(z[31]).toBe(15.5);
  expect(field(result, 'startingZ').slice(0, 4)).toStrictEqual([0, 1, 1.5, 2]);
  expect(field(result, 'index').slice(0, 3)).toStrictEqual([0, 1, 2]);
  expect(result.meta).toMatchObject({ zSpacing: 'even' });
});

test('old-format DEMO_3D has the Z values of m_evenz', () => {
  const oldFormat = parse(load('corpus/DEMO_3D.SPC'));
  const newFormat = parse(load('m_evenz.spc'));

  expect(field(oldFormat, 'z')).toStrictEqual(field(newFormat, 'z'));
  expect(oldFormat.meta).toMatchObject({ zSpacing: 'even' });
});

test('old-format even Z comes from the first subfile only', () => {
  const result = parse(load('corpus/CONTOUR.SPC'));
  const expected: number[] = [];
  for (let n = 0; n < 19; n++) expected.push(2 * n);

  expect(field(result, 'z')).toStrictEqual(expected);
  expect(field(result, 'startingZ').slice(0, 4)).toStrictEqual([0, 1, 1, 1]);
});

test('4D map: Z restarts in every W plane', () => {
  const result = parse(load('4d_map.spc'));

  expect(result.meta).toMatchObject({ planeSize: 11, zSpacing: 'even' });
  expect(metaOf(result, 11)).toMatchObject({ plane: 1, w: 10, z: 0 });
  expect(metaOf(result, 24)).toMatchObject({ plane: 2, w: 20, z: 20 });
  expect(metaOf(result, 120)).toMatchObject({ plane: 10, w: 100, z: 100 });
  expect(result.warnings).toStrictEqual([NAIVE_DATE_WARNING]);
});

test('non-square map with uneven W: planes of fnsub / fwplanes', () => {
  const bytes = load('raman-sion.spc');
  const numberPoints = new DataView(bytes.buffer).getUint32(4, true);
  const subfileSize = 32 + 4 * numberPoints;
  // TORDRD, fwplanes 4 (fwinc stays 0), subtime n mod 9, subwlevel 2.5 * plane.
  const patches: Patch[] = [
    { offset: 0, type: 'uint8', value: (bytes[0] as number) | 0x10 },
    { offset: 316, type: 'uint32', value: 4 },
  ];
  for (let n = 0; n < 36; n++) {
    const position = 512 + n * subfileSize;
    patches.push(
      { offset: position + 4, type: 'float32', value: n % 9 },
      {
        offset: position + 24,
        type: 'float32',
        value: 2.5 * Math.floor(n / 9),
      },
    );
  }
  const result = parse(patch(bytes, patches));

  expect(result.meta).toMatchObject({ planeSize: 9, zSpacing: 'ordered' });
  expect(metaOf(result, 9)).toMatchObject({ plane: 1, w: 2.5, z: 0 });
  expect(metaOf(result, 35)).toMatchObject({ plane: 3, w: 7.5, z: 8 });
});

test('LabSpec map: 14 W planes of 21 subfiles', () => {
  const result = parse(load('corpus/Harribo_map.spc'));

  expect(result.meta).toMatchObject({ planeSize: 21 });
  expect(metaOf(result, 0)).toMatchObject({ plane: 0, w: -5, z: -5 });
  expect(metaOf(result, 1)).toMatchObject({ plane: 0, w: -5, z: -4.5 });
  expect(metaOf(result, 293)).toMatchObject({ plane: 13 });
});

test('fwplanes that does not divide fnsub keeps the raw W values', () => {
  const result = parse(load('corpus/wplanes.spc'));

  expect(result.meta).not.toHaveProperty('planeSize');
  expect(field(result, 'plane')).toStrictEqual(new Array(30).fill(undefined));
  expect(field(result, 'w')).toStrictEqual(field(result, 'wAxisValue'));
  expect(result.warnings).toContain(
    'fwplanes (9) does not divide the number of subfiles (30); W planes ignored and raw W values kept',
  );
});

test('a degenerate even Z falls back to the subfile position', () => {
  const result = parse(load('raman-sion.spc'));
  const expected: number[] = [];
  for (let n = 0; n < 36; n++) expected.push(n);

  expect(field(result, 'z')).toStrictEqual(expected);
});

test('ordered Z uses subtime and ignores W without planes', () => {
  const result = parse(load('corpus/Witec_timeseries3x.spc'));

  expect(field(result, 'z')).toStrictEqual([0, 1, 2]);
  expect(field(result, 'w')).toStrictEqual([undefined, undefined, undefined]);
  expect(result.meta).toMatchObject({ zSpacing: 'ordered' });
});

test('a single file has no Z', () => {
  const result = parse(load('corpus/Lasc6rt.spc'));

  expect(metaOf(result, 0).z).toBeUndefined();
  expect(metaOf(result, 0).index).toBe(0);
  expect(result.meta).not.toHaveProperty('zSpacing');
});

test('the noise level is exposed only when subnois is set', () => {
  const plain = parse(load('s_evenx.spc'));
  // s_evenx: 512-byte header, then the subheader (subnois at +12).
  const withNoise = parse(
    patch(load('s_evenx.spc'), [{ offset: 524, type: 'float32', value: 0.25 }]),
  );

  expect(metaOf(plain, 0)).not.toHaveProperty('noise');
  expect(metaOf(withNoise, 0).noise).toBe(0.25);
  expect(metaOf(withNoise, 0).noiseValue).toBe(0.25);
});
