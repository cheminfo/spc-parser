import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { LightLogger } from 'cheminfo-types';
import { expect, test, vi } from 'vitest';

import { parse } from '../parse.ts';
import { NAIVE_DATE_WARNING } from '../utility/naiveDate.ts';

const galacticDirectory = join(
  import.meta.dirname,
  '..',
  'galactic',
  '__tests__',
  'data',
);

/**
 * Loads a Galactic fixture.
 * @param name - file name.
 * @returns The bytes.
 */
function load(name: string): Buffer {
  return readFileSync(join(galacticDirectory, name));
}

/**
 * A `LightLogger` that records what it was called with.
 * @returns The logger and its captured calls.
 */
function spyLogger(): { logger: LightLogger; warn: ReturnType<typeof vi.fn> } {
  const warn = vi.fn();
  const logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn,
    error: vi.fn(),
    fatal: vi.fn(),
  } as unknown as LightLogger;
  return { logger, warn };
}

test('without timeZone a wall-clock date carries no offset', () => {
  const { meta } = parse(load('4d_map.spc'));

  expect(meta.date).toBe('1995-10-28T08:54:00.000');
  expect(meta.kind === 'new' && meta.dateLayout).toBe('spec');
});

test('timeZone turns a wall-clock date into a real instant', () => {
  const zurich = parse(load('4d_map.spc'), { timeZone: 'Europe/Zurich' });
  const tokyo = parse(load('4d_map.spc'), { timeZone: 'Asia/Tokyo' });

  expect(zurich.meta.date).toBe('1995-10-28T08:54:00.000+01:00');
  expect(tokyo.meta.date).toBe('1995-10-28T08:54:00.000+09:00');
  expect(new Date(zurich.meta.date as string).toISOString()).toBe(
    '1995-10-28T07:54:00.000Z',
  );
  expect(new Date(tokyo.meta.date as string).toISOString()).toBe(
    '1995-10-27T23:54:00.000Z',
  );
});

test('timeZone UTC reproduces the 2.x string exactly', () => {
  const { meta } = parse(load('4d_map.spc'), { timeZone: 'UTC' });

  expect(meta.date).toBe('1995-10-28T08:54:00.000Z');
});

test('timeZone reaches the per-spectrum dates of the log', () => {
  const plain = parse(load('nir.spc'));
  const zoned = parse(load('nir.spc'), { timeZone: 'Europe/Zurich' });

  expect(plain.spectra[0]?.meta?.date).toBe('1995-05-03T09:29:44.000');
  expect(zoned.spectra[0]?.meta?.date).toBe('1995-05-03T09:29:44.000+02:00');
});

test('an unsupported timeZone throws a TypeError before the file is read', () => {
  expect(() => parse(load('4d_map.spc'), { timeZone: 'Not/AZone' })).toThrow(
    TypeError,
  );
  expect(() => parse(new Uint8Array(0), { timeZone: 'Not/AZone' })).toThrow(
    'Unsupported timeZone option: "Not/AZone"',
  );
});

test('the logger receives every warning, and warnings stays populated', () => {
  const { logger, warn } = spyLogger();
  const { warnings } = parse(load('corpus/test_input.spc'), { logger });

  expect(warnings).toHaveLength(2);
  expect(warn).toHaveBeenCalledTimes(warnings.length);
  expect(warn.mock.calls.map(([message]) => message)).toStrictEqual(warnings);
});

test('a file whose date is already an instant gives no warning at all', () => {
  const { logger, warn } = spyLogger();
  // WiRE writes its date in UTC, so nothing is ambiguous and nothing is said.
  const { warnings } = parse(load('raman-caco3.spc'), { logger });

  expect(warnings).toStrictEqual([]);
  expect(warn).not.toHaveBeenCalled();
});

test('the naive-date warning explains how to resolve the ambiguity', () => {
  const { warnings } = parse(load('4d_map.spc'));

  expect(warnings).toStrictEqual([NAIVE_DATE_WARNING]);
  expect(NAIVE_DATE_WARNING).toContain('timeZone');
  expect(NAIVE_DATE_WARNING).toContain("{ timeZone: 'UTC' }");
  expect(parse(load('4d_map.spc'), { timeZone: 'UTC' }).warnings).toStrictEqual(
    [],
  );
});

test('console satisfies the logger option', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    const { warnings } = parse(load('corpus/test_input.spc'), {
      logger: console,
    });

    expect(spy).toHaveBeenCalledTimes(warnings.length);
  } finally {
    spy.mockRestore();
  }
});

test('strict still throws, and the logger sees the anomaly first', () => {
  const { logger, warn } = spyLogger();

  expect(() => parse(load('m_evenz.spc'), { logger, strict: true })).toThrow(
    'fdate 0x00005000 is not a valid date; date ignored',
  );
  expect(warn).toHaveBeenCalledOnce();
});
