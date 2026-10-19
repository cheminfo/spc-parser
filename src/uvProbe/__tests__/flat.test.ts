import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { patchBytes } from '../../galactic/__tests__/mutate.ts';
import { parse } from '../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../utility/naiveDate.ts';
import type { UvProbeMeta } from '../types.ts';

const dataDirectory = join(import.meta.dirname, 'data');
const flat = new Uint8Array(
  readFileSync(join(dataDirectory, 'uvprobe-flat.spc')),
);
const encoder = new TextEncoder();

function metaOf(bytes: Uint8Array): UvProbeMeta {
  return parse(bytes).meta as UvProbeMeta;
}

test('Shimadzu flat F80A20-1: date and header codes', () => {
  const meta = metaOf(
    readFileSync(join(dataDirectory, 'corpus/shimadzu-flat-F80A20-1.SPC')),
  );

  expect(meta.date).toBe('2015-12-11T17:13:18.000');
  expect(meta.header).toStrictEqual({
    familyFlags: 0x800,
    modeCode: 3,
    speedCode: 5,
    samplingCode: 5,
    displayMax: 4,
    displayMin: 0,
  });
});

test('a time written as HH:MM NUL SS keeps its seconds', () => {
  const time = encoder.encode('11:36:51');
  time[5] = 0;
  const bytes = patchBytes(flat, 0x64, time);

  expect(bytes[0x69]).toBe(0);
  expect(metaOf(bytes).date).toBe('2026-04-22T11:36:51.000');
});

test('two-digit years from 70 on are 19xx', () => {
  const bytes = patchBytes(flat, 0x6d, encoder.encode('04/22/98'));

  expect(metaOf(bytes).date).toBe('1998-04-22T11:36:51.000');
});

test('a missing time gives midnight', () => {
  const bytes = patchBytes(flat, 0x64, new Uint8Array(9));

  expect(metaOf(bytes).date).toBe('2026-04-22T00:00:00.000');
});

test('an invalid or missing date gives no date', () => {
  const badMonth = patchBytes(flat, 0x6d, encoder.encode('13/22/26'));
  const noDate = patchBytes(flat, 0x6d, new Uint8Array(9));

  expect(metaOf(badMonth)).not.toHaveProperty('date');
  expect(metaOf(noDate)).not.toHaveProperty('date');
});

test('an invalid date is reported as a warning, or thrown in strict mode', () => {
  const badMonth = patchBytes(flat, 0x6d, encoder.encode('13/45/99'));
  const result = parse(badMonth);

  expect(result.warnings).toStrictEqual([
    'Shimadzu flat date "13/45/99 11:36:51" is invalid; ignored',
  ]);
  expect(parse(flat).warnings).toStrictEqual([NAIVE_DATE_WARNING]);
  expect(() => parse(badMonth, { strict: true })).toThrow(
    'Shimadzu flat date "13/45/99 11:36:51" is invalid; ignored',
  );
});
