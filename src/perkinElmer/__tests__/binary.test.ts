import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { guessSpectraType } from '../../galactic/utility/guessSpectraType.ts';
import { parse } from '../../parse.ts';
import type { PerkinElmerMeta, PerkinElmerSpectrumMeta } from '../types.ts';

const dataDirectory = join(import.meta.dirname, 'data');

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dataDirectory, name)));
}

test('illuminant-a.sp: binary UV file', () => {
  const result = parse(read('illuminant-a.sp'));

  expect(result.meta).toStrictEqual({
    kind: 'pepe',
    description: '2D constant interval DataSet file',
    xUnits: 'nm',
  });
  expect(result.warnings).toStrictEqual([]);
  expect(result.spectra).toHaveLength(1);

  const spectrum = result.spectra[0];
  const meta = spectrum?.meta as PerkinElmerSpectrumMeta;

  expect(meta.fileType).toBe('SPECTRUM');
  expect(meta.alias).toBe('Illuminant_A_cs.sp');
  expect(meta.dataType).toBe(1);
  expect(meta.xUnitType).toBe(11);
  expect(meta.yUnitType).toBe(0);

  const { x, y } = spectrum?.variables ?? {};

  expect(x?.label).toBe('Wavelength');
  expect(x?.units).toBe('nm');
  expect(y?.label).toBe('nm');
  expect(x?.data).toHaveLength(81);
  expect(y?.data).toHaveLength(81);
  expect(x?.data[0]).toBe(380);
  expect(x?.data[80]).toBe(780);
  expect(y?.data[0]).toBeCloseTo(9.8, 6);
  expect(y?.data[80]).toBeCloseTo(241.68, 6);
  expect(guessSpectraType(result.meta)).toBe('uv');
});

test('ir.sp: binary FTIR file', () => {
  const result = parse(read('ir.sp'));

  expect((result.meta as PerkinElmerMeta).xUnits).toBe('cm-1');
  expect(guessSpectraType(result.meta)).toBe('ir');

  const spectrum = result.spectra[0];
  const meta = spectrum?.meta as PerkinElmerSpectrumMeta;

  expect(meta.fileType).toBe('Spectrum');
  expect(meta.alias).toBe('strip01');
  expect(meta.dataType).toBe(16);
  expect(meta.xUnitType).toBe(10);
  expect(meta.yUnitType).toBe(1);
  expect(meta.history).toHaveLength(1);
  expect(meta.history[0]?.entries).toHaveLength(86);

  const { x, y } = spectrum?.variables ?? {};

  expect(x?.label).toBe('Wavenumber');
  expect(x?.units).toBe('cm-1');
  expect(y?.label).toBe('Absorbance');
  expect(y?.units).toBe('');
  expect(x?.data).toHaveLength(3301);
  expect(x?.data[0]).toBe(700);
  expect(x?.data[1]).toBe(701);
  expect(x?.data[3300]).toBe(4000);
  expect(y?.data[0]).toBeCloseTo(0.004176, 6);
  expect(y?.data[3300]).toBeCloseTo(0.037239, 6);
});

test('the binary reader accepts an ArrayBuffer and a Buffer', () => {
  const buffer = readFileSync(join(dataDirectory, 'illuminant-a.sp'));
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );

  expect(parse(buffer).spectra[0]?.variables.x.data).toHaveLength(81);
  expect(parse(arrayBuffer).spectra[0]?.variables.x.data).toHaveLength(81);
});

test('a block running past the end of the file is TRUNCATED', () => {
  const bytes = read('ir.sp').subarray(0, 10000);

  expect(() => parse(bytes)).toThrow(
    expect.objectContaining({
      name: 'SpcParserError',
      code: 'TRUNCATED',
      message: expect.stringContaining('PerkinElmer block 120 at 44'),
    }),
  );
});

test('trailing bytes after the last block are reported', () => {
  const source = read('illuminant-a.sp');
  const bytes = new Uint8Array(source.length + 3);
  bytes.set(source);

  expect(parse(bytes).warnings).toStrictEqual([
    'PerkinElmer file: 3 trailing bytes ignored',
  ]);
});
