import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../parse.ts';

import { listFixtures, summarize } from './summarize.ts';

const sourceDirectory = join(import.meta.dirname, '..');
const fixtures = listFixtures(sourceDirectory);

/**
 * Path of a fixture relative to `src`, with forward slashes.
 * @param path - absolute path.
 * @returns The stable key used in the snapshot.
 */
function fixtureKey(path: string): string {
  return relative(sourceDirectory, path).split(sep).join('/');
}

test('the regression suite finds every committed fixture', () => {
  expect(fixtures).toHaveLength(50);
});

test('every committed fixture parses or throws an SpcParserError', () => {
  const summaries: Record<string, unknown> = {};
  for (const path of fixtures) {
    summaries[fixtureKey(path)] = summarize(parse, readFileSync(path));
  }

  expect(summaries).toMatchSnapshot();
});

/**
 * Compares the number of spectra of a Galactic file with its header.
 * @param path - absolute path of the fixture.
 * @returns A description of the mismatch, or undefined.
 */
function countMismatch(path: string): string | undefined {
  let result;
  try {
    result = parse(readFileSync(path));
  } catch {
    return undefined;
  }
  const { meta, spectra, warnings } = result;
  if (meta.kind !== 'new' && meta.kind !== 'old') return undefined;
  const isReduced = warnings.some((warning) =>
    /truncated|only one subfile|inferred/i.test(warning),
  );
  const expected = meta.spectra === 0 ? 1 : meta.spectra;
  if (isReduced || spectra.length === expected) return undefined;
  return `${fixtureKey(path)}: ${spectra.length} / ${String(expected)}`;
}

test('Galactic results hold as many spectra as the header announces', () => {
  const mismatches = fixtures
    .map((path) => countMismatch(path))
    .filter((mismatch) => mismatch !== undefined);

  expect(mismatches).toStrictEqual([]);
});

/**
 * Lists the keys of the file and spectrum metadata that hold `undefined`.
 * @param path - absolute path of the fixture.
 * @returns The undefined-valued keys, prefixed with the fixture key.
 */
function undefinedMetaKeys(path: string): string[] {
  let result;
  try {
    result = parse(readFileSync(path));
  } catch {
    return [];
  }
  const keys: string[] = [];
  const objects = [result.meta, ...result.spectra.map(({ meta }) => meta)];
  for (const object of objects) {
    const entries = Object.entries(object ?? {});
    for (const [key, value] of entries) {
      if (value === undefined) keys.push(`${fixtureKey(path)}: ${key}`);
    }
  }
  return keys;
}

test('no metadata key holds undefined', () => {
  expect(fixtures.flatMap((path) => undefinedMetaKeys(path))).toStrictEqual([]);
});

test('an interferogram with fpeakpt 0 has no zpdIndex', () => {
  const bytes = new Uint8Array(
    readFileSync(join(sourceDirectory, 'galactic/__tests__/data/s_evenx.spc')),
  );
  bytes[29] = 1;

  expect(parse(bytes).meta).not.toHaveProperty('zpdIndex');

  new DataView(bytes.buffer).setUint16(54, 100, true);

  expect(parse(bytes).meta).toHaveProperty('zpdIndex', 100);
});
