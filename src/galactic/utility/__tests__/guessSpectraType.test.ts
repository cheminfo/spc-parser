import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import { parse } from '../../../parse.ts';
import { fileHeader } from '../../fileHeader.ts';
import {
  getRegion,
  guessSpectraType,
  unitToNano,
} from '../guessSpectraType.ts';

const dataDirectory = join('..', '..', '__tests__', 'data');

test('nir', () => {
  //kubelka-monk is now in "other" as it is a
  //very different type of "ir"
  const buffer = readFileSync(
    join(import.meta.dirname, dataDirectory, 'nir.spc'),
  );
  const result = fileHeader(new IOBuffer(buffer));
  const guessedType = guessSpectraType(result);

  expect(guessedType).toBe('other');
});

test('s_evenx', () => {
  //kubelka-monk is now in "other" as it is a
  //very different type of "ir"
  const buffer = readFileSync(
    join(import.meta.dirname, dataDirectory, 's_evenx.spc'),
  );
  const result = fileHeader(new IOBuffer(buffer));
  const guessedType = guessSpectraType(result);

  expect(guessedType).toBe('ir');
});

test('ft-ir.spc', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, dataDirectory, 'Ft-ir.spc'),
  );
  const result = fileHeader(new IOBuffer(buffer));
  const guessedType = guessSpectraType(result);

  expect(guessedType).toBe('ir'); //MIR I think (middle range IR.)
});

test('raman-sion.spc', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, dataDirectory, 'raman-sion.spc'),
  );
  const result = fileHeader(new IOBuffer(buffer));
  const guessedType = guessSpectraType(result);

  expect(guessedType).toBe('raman');
});

test('NDR0002.SPC', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, dataDirectory, 'NDR0002.SPC'),
  );
  const result = fileHeader(new IOBuffer(buffer));
  const guessedType = guessSpectraType(result);

  expect(guessedType).toBe('raman');
});

test('m_xyxy', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, dataDirectory, 'm_xyxy.spc'),
  );
  const result = fileHeader(new IOBuffer(buffer));
  const guessedType = guessSpectraType(result);

  expect(guessedType).toBe('mass');
});

test('get region of spectra from wavelength in nm.', () => {
  expect(getRegion(100)).toBe('other');
  expect(getRegion(250)).toBe('uv');
  expect(getRegion(750)).toBe('ir');
});

test('convert micrometers or wavenumber to nanometers', () => {
  expect(unitToNano(12500, 'wavenumber')).toBeCloseTo(800);
  expect(unitToNano(0.8, 'micrometer')).toBeCloseTo(800);
});

test('UVProbe OLE and flat files are uv', () => {
  const uvProbeDirectory = join(
    import.meta.dirname,
    '..',
    '..',
    '..',
    'uvProbe',
    '__tests__',
    'data',
  );
  const ole = parse(readFileSync(join(uvProbeDirectory, 'uvprobe-ole.spc')));
  const flat = parse(readFileSync(join(uvProbeDirectory, 'uvprobe-flat.spc')));

  expect([ole.meta.kind, guessSpectraType(ole.meta)]).toStrictEqual([
    'ole',
    'uv',
  ]);
  expect([flat.meta.kind, guessSpectraType(flat.meta)]).toStrictEqual([
    'flat',
    'uv',
  ]);
});
