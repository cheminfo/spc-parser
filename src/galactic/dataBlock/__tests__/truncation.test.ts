import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../../../parse.ts';
import { SpcParserError } from '../../../utility/SpcParserError.ts';
import { NAIVE_DATE_WARNING } from '../../../utility/naiveDate.ts';
import { append, patch, truncate } from '../../__tests__/mutate.ts';
import type { TheOldHeader } from '../../fileHeader.ts';

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
 * Runs `parse` and returns the error it throws.
 * @param bytes - the file bytes.
 * @returns The thrown error.
 */
function parseError(bytes: Uint8Array): unknown {
  try {
    parse(bytes);
  } catch (error) {
    return error;
  }
  throw new Error('parse did not throw');
}

test('a file shorter than the header throws TRUNCATED', () => {
  const error = parseError(truncate(load('Ft-ir.spc'), 300));

  expect(error).toBeInstanceOf(SpcParserError);
  expect((error as SpcParserError).code).toBe('TRUNCATED');
  expect((error as SpcParserError).message).toBe(
    'Truncated SPC file: 300 bytes, the header needs 512',
  );
});

test('a file without one complete subfile throws TRUNCATED', () => {
  const error = parseError(truncate(load('Ft-ir.spc'), 3000));

  expect((error as SpcParserError).code).toBe('TRUNCATED');
});

test('an old-format file shorter than its header throws TRUNCATED', () => {
  const error = parseError(truncate(load('m_ordz.spc'), 200));

  expect((error as SpcParserError).message).toBe(
    'Truncated SPC file: 200 bytes, the header needs 256',
  );
});

test('a truncated multifile returns its complete subfiles', () => {
  const full = parse(load('raman-sion.spc'));
  const truncated = truncate(load('raman-sion.spc'), 100000);
  const result = parse(truncated);

  expect(result.spectra).toHaveLength(24);
  expect(result.spectra).toStrictEqual(full.spectra.slice(0, 24));
  expect(result.logs).toBeNull();
  expect(result.warnings).toStrictEqual([
    'Subfile 25 of 36 is truncated; 24 complete subfiles returned',
    'Log block offset 147824 is beyond the end of the file (100000 bytes); log ignored',
  ]);
  expect(() => parse(truncated, { strict: true })).toThrow(
    'Subfile 25 of 36 is truncated',
  );
});

test('a truncated old-format multifile returns its complete subfiles', () => {
  const result = parse(truncate(load('m_ordz.spc'), 34000));

  expect(result.spectra).toHaveLength(9);
  expect((result.meta as TheOldHeader).spectra).toBe(9);
  expect(result.warnings).toStrictEqual([
    '2636 bytes after the 9 complete subfiles of 3460 bytes were ignored',
    NAIVE_DATE_WARNING,
  ]);
});

test('bytes appended to an old-format multifile are ignored', () => {
  const original = parse(load('m_ordz.spc'));
  const result = parse(append(load('m_ordz.spc'), 1000));

  expect(result.spectra).toStrictEqual(original.spectra);
  expect((result.meta as TheOldHeader).trailingText).toStrictEqual([]);
  expect(result.warnings).toStrictEqual([
    '1000 bytes after the 10 complete subfiles of 3460 bytes were ignored',
    NAIVE_DATE_WARNING,
  ]);
});

test('readable text after an old-format file is exposed', () => {
  // EPA-library files append NUL-separated text blocks after the data.
  const trailer = new TextEncoder().encode(
    '\0chloromethyl methyl ether 498.9 ppm\0\0ab\0U.S. EPA\0\u{1}\u{2}binary\0xyz\0',
  );
  const tail = new Uint8Array(900);
  tail.set(trailer);
  const result = parse(append(load('corpus/DOERNER.spc'), tail));

  expect(result.spectra).toHaveLength(1);
  expect((result.meta as TheOldHeader).trailingText).toStrictEqual([
    'chloromethyl methyl ether 498.9 ppm',
    'U.S. EPA',
  ]);
  expect(result.warnings).toStrictEqual([
    '900 bytes after the 1 complete subfiles of 6440 bytes were ignored',
    NAIVE_DATE_WARNING,
  ]);
});

test('an old-format file with an invalid point count is rejected', () => {
  const bytes = patch(load('m_ordz.spc'), [
    { offset: 4, type: 'float32', value: NaN },
  ]);

  expect((parseError(bytes) as SpcParserError).code).toBe('UNSUPPORTED_FORMAT');
});

test('the old-format subfile count is exposed', () => {
  const result = parse(load('corpus/LC_DIODE_ARRAY.SPC'));

  expect((result.meta as TheOldHeader).spectra).toBe(350);
  expect(result.spectra).toHaveLength(350);
  expect(result.warnings).toStrictEqual([NAIVE_DATE_WARNING]);
});

test('a single file with fnsub 0 still has one spectrum', () => {
  const original = parse(load('s_evenx.spc'));
  const result = parse(
    patch(load('s_evenx.spc'), [{ offset: 24, type: 'uint32', value: 0 }]),
  );

  expect(result.spectra).toStrictEqual(original.spectra);
  expect(result.warnings).toStrictEqual([]);
});

test('fnsub above 1 without TMULTI reads one subfile and warns', () => {
  const original = parse(load('s_evenx.spc'));
  const result = parse(
    patch(load('s_evenx.spc'), [{ offset: 24, type: 'uint32', value: 5 }]),
  );

  expect(result.spectra).toStrictEqual(original.spectra);
  expect(result.warnings).toStrictEqual([
    'fnsub is 5 but the multifile flag (TMULTI) is not set; only one subfile read',
  ]);
});

test('a multifile with fnsub 0 infers the count from the size', () => {
  const original = parse(load('m_evenz.spc'));
  const result = parse(
    patch(load('m_evenz.spc'), [{ offset: 24, type: 'uint32', value: 0 }]),
  );

  expect(result.spectra).toHaveLength(original.spectra.length);
  expect(result.spectra).toStrictEqual(original.spectra);
  expect(result.warnings).toStrictEqual([
    'fdate 0x00005000 is not a valid date; date ignored',
    'fnsub is 0 in a multifile; the number of subfiles is inferred from the file size',
  ]);
});

test('a TXVALS file whose X array does not fit throws TRUNCATED', () => {
  // s_xy.spc stores its X values before the subfile.
  const error = parseError(truncate(load('s_xy.spc'), 600));

  expect((error as SpcParserError).code).toBe('TRUNCATED');
});
