import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { xMinMaxValues } from 'ml-spectra-processing';
import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';

test('that all are same length arrays of data', () => {
  const files = readdirSync(join(import.meta.dirname, 'data')).filter((file) =>
    file.toLowerCase().endsWith('.spc'),
  );
  for (const f of files) {
    const r = parse(readFileSync(join(import.meta.dirname, 'data', f)));
    for (const spectrum of r.spectra) {
      const {
        variables: { x, y },
      } = spectrum;

      expect(x.data).toHaveLength(y.data.length);
    }
  }
});

test('snapshot for comparison', () => {
  const result = parse(
    readFileSync(join(import.meta.dirname, 'data', 'nir.spc')),
  );

  expect(result).toMatchSnapshot();
});

test('random format throws error', () => {
  const file = readFileSync(join(import.meta.dirname, 'data', 'nir.cfl'));

  // Not OLE2, not a Galactic version byte, and no locatable UVProbe flat
  // data block, so detection rejects it as an unsupported format.
  expect(() => parse(file)).toThrow('Unsupported SPC file');
});

test('ft-ir.spc', () => {
  const buffer = readFileSync(join(import.meta.dirname, 'data', 'Ft-ir.spc'));
  const result = parse(buffer);

  expect(result.spectra[0]?.variables.x).toMatchObject({
    symbol: 'x',
    label: 'Wavenumber',
    units: 'cm-1',
    isDependent: false,
  });
  expect(result.spectra).toHaveLength(1);
  expect(Object.keys(result.meta)).toHaveLength(46);
});

test('raman-sion.spc', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, 'data', 'raman-sion.spc'),
  );
  const result = parse(buffer);

  expect(result.spectra[0]?.variables.x).toMatchObject({
    symbol: 'x',
    label: 'Raman Shift',
    units: 'cm-1',
    isDependent: false,
  });
  expect(result.spectra).toHaveLength(36);
  expect(Object.keys(result.meta)).toHaveLength(47);

  const spectrum = result.spectra[0];
  assert(spectrum);
  const dataY = spectrum.variables.y.data;
  const { min, max } = xMinMaxValues(dataY);

  expect(min).toBeCloseTo(1870.6690673828125);
  expect(max).toBe(7594.40869140625);
});

test('NDR0002.SPC', () => {
  const buffer = readFileSync(join(import.meta.dirname, 'data', 'NDR0002.SPC'));
  const result = parse(buffer);
  const spectrum = result.spectra[0];
  assert(spectrum);
  const variables = spectrum.variables;
  const { min: minX, max: maxX } = xMinMaxValues(variables.x.data);
  const { min: minY, max: maxY } = xMinMaxValues(variables.y.data);

  expect(minX).toBeCloseTo(88.63693237304688);
  expect(minY).toBe(0);
  expect(maxX).toBeCloseTo(4011.202392578125);
  expect(maxY).toBe(1);
});
