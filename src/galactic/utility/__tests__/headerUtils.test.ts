import { expect, test } from 'vitest';

import { longToDate, parseFlagParameters } from '../headerUtils.ts';

test('Flag parameters', () => {
  const instance = parseFlagParameters(255);

  expect(instance.y16BitPrecision).toBe(true);
  expect(instance.useExperimentExtension).toBe(true);
  expect(instance.multiFile).toBe(true);
  expect(instance.zValuesRandom).toBe(true);
  expect(instance.zValuesUneven).toBe(true);
  expect(instance.customAxisLabels).toBe(true);
  expect(instance.xy).toBe(true);
  expect(instance.xyxy).toBe(true);
});

test('Long to date', () => {
  expect(longToDate(2102092692)).toMatch(/2004-11-12T14:20/);
  expect(longToDate(2091439149)).toMatch(/1994-08-26T16:45/);
  expect(longToDate(0)).toMatch(/0000-00-00T00:00:00.00Z/);
});

test('Long to date, MS-DOS layout written by Renishaw WiRE', () => {
  expect(longToDate(0x5cf16b0a)).toBe('2026-08-17T13:24:20.000Z');
  expect(longToDate(0x53215a98)).toBe('2021-10-01T11:20:48.000Z');
});

test('Long to date falls back to the specification layout', () => {
  // 0x5000 is neither layout: month 0 by the specification, day 0 as MS-DOS.
  expect(longToDate(0x5000)).toBe('-000001-12-10T00:00:00.000Z');
});
