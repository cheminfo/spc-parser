import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import type { ParseContext } from '../../utility/ParseContext.ts';
import { createParseContext } from '../../utility/ParseContext.ts';
import type { Header } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';
import { decodeFdate } from '../utility/headerDates.ts';

import { patch } from './mutate.ts';

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dirname, 'data', name)));
}

function header(bytes: Uint8Array, context?: ParseContext): Header {
  return fileHeader(new IOBuffer(bytes), context);
}

test('LabSpec: years since 1900 and a zero-based month', () => {
  // The log of CAthickyellow_try4_18 says DATE = 02/19/16 16:46:45.
  const meta = header(read('corpus/CAthickyellow_try4_18.spc'));

  expect(meta.date).toBe('2016-02-19T16:46:00.000');
  expect(meta.dateLayout).toBe('labspec');
  expect(header(read('corpus/LabRam-2.spc')).date).toBe(
    '2015-02-25T13:48:00.000',
  );
});

test('specification layout is local time', () => {
  expect(header(read('RAMAN.SPC')).date).toBe('1994-08-26T16:45:00.000');
  expect(header(read('m_xyxy.spc'))).toMatchObject({
    date: '1986-01-09T08:47:00.000',
    dateLayout: 'spec',
    rawDate: 0x7c214a2f,
  });
});

test('MS-DOS layout written by Renishaw WiRE is UTC', () => {
  expect(header(read('raman-caco3.spc'))).toMatchObject({
    date: '2026-08-17T13:24:20.000Z',
    dateLayout: 'msdos',
  });
});

test('Unix timestamp, reported with a warning', () => {
  const context = createParseContext();
  const meta = header(read('corpus/Lasc6rt.spc'), context);

  expect(meta.date).toBe('2011-09-07T22:35:01.000Z');
  expect(meta.dateLayout).toBe('unix');
  expect(context.warnings).toStrictEqual([
    'fdate 0x4e67f195 decoded as a Unix timestamp',
  ]);
});

test('absent and invalid dates are undefined', () => {
  const result = parse(read('m_evenz.spc'));
  const meta = result.meta as Header;

  expect(meta.date).toBeUndefined();
  expect(meta.dateLayout).toBeUndefined();
  expect(meta.rawDate).toBe(0x5000);
  expect(result.warnings).toStrictEqual([
    'fdate 0x00005000 is not a valid date; date ignored',
  ]);
  expect(parse(read('nir.spc')).meta.date).toBeUndefined();
  // Essential FTIR writes 1969-12-31 18:00 (the Unix epoch in UTC-6).
  expect(header(read('corpus/test_input.spc')).date).toBeUndefined();
});

test('old format: 2-digit years, years since 1900 and the Z unit nibble', () => {
  expect(header(read('m_ordz.spc'))).toMatchObject({
    date: '1992-05-14T20:19:00.000',
    dateLayout: 'old',
    zUnitsType: 'Minutes',
  });
  expect(header(read('corpus/DOERNER.spc')).date).toBe(
    '2013-05-24T10:32:00.000',
  );
  expect(header(read('corpus/DEMO_3D.SPC'))).toMatchObject({
    date: '1997-03-09T09:14:00.000',
    rawDate: [0x57cd, 3, 9, 9, 14],
    zUnitsType: 'Minutes',
  });
});

test('old format without a date', () => {
  // DOERNER with oyear (offset 18) set to 0.
  const bytes = patch(read('corpus/DOERNER.spc'), [
    { offset: 18, type: 'uint16', value: 0 },
  ]);
  const context = createParseContext();
  const meta = header(bytes, context);

  expect(meta.date).toBeUndefined();
  expect(meta.dateLayout).toBeUndefined();
  expect(context.warnings).toStrictEqual([]);
});

test('old format with an invalid month', () => {
  // DOERNER with omonth (offset 20) set to 13.
  const bytes = patch(read('corpus/DOERNER.spc'), [
    { offset: 20, type: 'uint8', value: 13 },
  ]);
  const context = createParseContext();

  expect(header(bytes, context).date).toBeUndefined();
  expect(context.warnings).toStrictEqual([
    'Old-format date 113,13,24,10,32 is invalid; ignored',
  ]);
});

test('a day that does not exist in its month is rejected', () => {
  // Specification layout: 2001-02-30 12:00, and no other layout fits.
  const value = (2001 << 20) | (2 << 16) | (30 << 11) | (12 << 6);

  expect(decodeFdate(value >>> 0)).toStrictEqual({});
});
