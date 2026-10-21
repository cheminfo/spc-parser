import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { guessSpectraType } from '../../galactic/utility/guessSpectraType.ts';
import { parse } from '../../parse.ts';
import { isPerkinElmerAscii } from '../parseAscii.ts';

const dataDirectory = join(import.meta.dirname, 'data');
const encoder = new TextEncoder();

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dataDirectory, name)));
}

test('absorbance-ascii.sp: PEDS 1.60 absorbance spectrum', () => {
  const result = parse(read('absorbance-ascii.sp'));

  expect(result.meta).toStrictEqual({
    kind: 'peds',
    description: 'PE UV SPECTRUM ASCII PEDS 1.60',
    xUnits: 'NM',
  });
  expect(result.warnings).toStrictEqual([]);
  expect(guessSpectraType(result.meta)).toBe('uv');
  expect(result.spectra).toHaveLength(1);

  const spectrum = result.spectra[0];

  expect(spectrum?.meta).toStrictEqual({
    name: 'B.SP',
    creationDate: '25/12/05 16:36:30.00',
    modificationDate: '25/12/05 16:39:24.00',
    analyst: 'Simon',
  });

  const { x, y } = spectrum?.variables ?? {};

  expect(x?.label).toBe('Wavelength');
  expect(x?.units).toBe('nm');
  expect(y?.label).toBe('Absorbance');
  expect(y?.units).toBe('');
  expect(x?.data).toBeInstanceOf(Float64Array);
  expect(x?.data).toHaveLength(601);
  expect(y?.data).toHaveLength(601);
  expect(x?.data[0]).toBe(200);
  expect(x?.data[600]).toBe(800);
  expect(y?.data[0]).toBe(0.671629);
  expect(y?.data[600]).toBe(0.00266);
});

test('illuminant-a.asc: PEDS 4.00 holds the data of illuminant-a.sp', () => {
  const ascii = parse(read('illuminant-a.asc'));
  const binary = parse(read('illuminant-a.sp'));

  expect(ascii.meta).toStrictEqual({
    kind: 'peds',
    description: 'PE UV SUBTECH SPECTRUM ASCII PEDS 4.00',
    xUnits: 'nm',
  });
  expect(ascii.spectra[0]?.meta).toStrictEqual({
    name: 'Illuminant A.asc',
    creationDate: '06/07/2013 23:39.0',
    modificationDate: '06/07/2013 23:39.0',
    analyst: 'Analyst',
  });
  expect(ascii.spectra[0]?.variables).toStrictEqual(
    binary.spectra[0]?.variables,
  );
});

test('an ASCII export saved as .txt is detected from its content', () => {
  const result = parse(read('absorbance-ascii.txt'));
  const reference = parse(read('absorbance-ascii.sp'));

  expect(result.meta).toStrictEqual(reference.meta);
  expect(result.spectra[0]?.meta).toStrictEqual({
    name: 'B.TXT',
    creationDate: '25/12/05 16:36:30.00',
    modificationDate: '25/12/05 16:44:39.00',
    analyst: 'Simon',
  });
  expect(result.spectra[0]?.variables).toStrictEqual(
    reference.spectra[0]?.variables,
  );
});

test('sortX false keeps the decreasing wavelengths of the file', () => {
  const { x, y } =
    parse(read('absorbance-ascii.sp'), { sortX: false }).spectra[0]
      ?.variables ?? {};

  expect(x?.data[0]).toBe(800);
  expect(x?.data[600]).toBe(200);
  expect(y?.data[0]).toBe(0.00266);
});

test('a point count that differs from #GR is reported', () => {
  const text = new TextDecoder().decode(read('absorbance-ascii.sp'));
  const bytes = encoder.encode(text.replace('\r\n601\r\n', '\r\n600\r\n'));

  expect(parse(bytes).warnings).toStrictEqual([
    'PerkinElmer ASCII file: 601 points but 600 announced',
  ]);
});

test('an ASCII file without #DATA is TRUNCATED', () => {
  const text = new TextDecoder().decode(read('absorbance-ascii.sp'));
  const bytes = encoder.encode(text.slice(0, text.indexOf('#DATA')));

  expect(() => parse(bytes)).toThrow(
    expect.objectContaining({
      name: 'SpcParserError',
      code: 'TRUNCATED',
      message: 'PerkinElmer ASCII file: no #GR or #DATA section',
    }),
  );
});

test('only a first line naming PEDS is a PerkinElmer ASCII file', () => {
  expect(
    isPerkinElmerAscii(encoder.encode('PE IR  ASCII  PEDS  4.00\r\n')),
  ).toBe(true);
  expect(isPerkinElmerAscii(encoder.encode('PE IR  ASCII\r\nPEDS\r\n'))).toBe(
    false,
  );
  expect(isPerkinElmerAscii(encoder.encode('PEDS 4.00\r\n'))).toBe(false);
});
