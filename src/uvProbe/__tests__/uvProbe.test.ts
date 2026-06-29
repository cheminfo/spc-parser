import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';
import { parseXY } from 'xy-parser';

import { parse } from '../../parse.ts';
import type { UvProbeMeta } from '../types.ts';

const dataDir = join(import.meta.dirname, 'data');

function readData(name: string) {
  return readFileSync(join(dataDir, name));
}

/** Reference export rounded to 2 (wavelength) / 3 (absorbance) decimals. */
const reference = parseXY(readData('uvprobe-reference.txt'));

test('flat and OLE describe the same spectrum', () => {
  const flat = parse(readData('uvprobe-flat.spc'));
  const ole = parse(readData('uvprobe-ole.spc'));

  const flatY = flat.spectra[0].variables.y.data;
  const oleY = ole.spectra[0].variables.y.data;

  expect(flatY).toStrictEqual(oleY);

  const flatX = flat.spectra[0].variables.x.data;
  const oleX = ole.spectra[0].variables.x.data;
  let maxXError = 0;
  for (let i = 0; i < flatX.length; i++) {
    maxXError = Math.max(maxXError, Math.abs(flatX[i] - oleX[i]));
  }

  expect(maxXError).toBeLessThan(1e-6);
});

test.each([
  ['flat', 'uvprobe-flat.spc'],
  ['ole', 'uvprobe-ole.spc'],
])('parses the %s variant against the reference export', (kind, file) => {
  const result = parse(readData(file));
  const { spectra } = result;
  const meta = result.meta as UvProbeMeta;

  expect(meta.kind).toBe(kind);
  expect(meta.numberPoints).toBe(1501);
  expect(spectra).toHaveLength(1);

  const { x, y } = spectra[0].variables;

  expect(x.units).toBe('nm');
  expect(y.label).toBe('Absorbance');
  expect(x.data).toHaveLength(1501);
  expect(y.data).toHaveLength(1501);
  expect(x.data[0]).toBe(300);
  expect(x.data.at(-1)).toBe(600);

  let maxXError = 0;
  let maxYError = 0;
  for (let i = 0; i < reference.x.length; i++) {
    maxXError = Math.max(maxXError, Math.abs(x.data[i] - reference.x[i]));
    maxYError = Math.max(maxYError, Math.abs(y.data[i] - reference.y[i]));
  }

  expect(maxXError).toBeLessThan(1e-2);
  expect(maxYError).toBeLessThan(1e-3);
});

test('flat metadata snapshot', () => {
  const meta = parse(readData('uvprobe-flat.spc')).meta as UvProbeMeta;

  expect(meta).toMatchSnapshot();
});

test('OLE metadata snapshot', () => {
  const meta = parse(readData('uvprobe-ole.spc')).meta as UvProbeMeta;

  expect(meta).toMatchSnapshot();
});

test('flat metadata', () => {
  const meta = parse(readData('uvprobe-flat.spc')).meta as UvProbeMeta;

  expect(meta.kind).toBe('flat');
  expect(meta.date).toBe('2026-04-22T11:36:51.000Z');
  expect(meta.title).toBeUndefined();
});

test('OLE metadata', () => {
  const { meta } = parse(readData('uvprobe-ole.spc')) as { meta: UvProbeMeta };

  expect(meta.kind).toBe('ole');
  expect(meta.title).toBe('200 uM HCHO DNPH');
  expect(meta.date).toBe('2026-04-22T11:36:51.000Z');
  expect(meta.properties['Instrument Properties']['Instrument Type']).toBe(
    'UV-2600 Series',
  );
  expect(
    meta.properties['Measurement Properties']['Wavelength Range (nm.)'],
  ).toBe('300.00 to 600.00');
});
