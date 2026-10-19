import { expect, test } from 'vitest';

import { decodeFdate } from '../headerDates.ts';
import { parseFlagParameters } from '../headerUtilities.ts';

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
  expect(decodeFdate(2102092692).date).toMatch(/2004-11-12T14:20/);
  expect(decodeFdate(2091439149).date).toMatch(/1994-08-26T16:45/);
  expect(decodeFdate(0)).toStrictEqual({});
});

test('Long to date, MS-DOS layout written by Renishaw WiRE', () => {
  expect(decodeFdate(0x5cf16b0a)).toStrictEqual({
    date: '2026-08-17T13:24:20.000Z',
    layout: 'msdos',
  });
  expect(decodeFdate(0x53215a98).date).toBe('2021-10-01T11:20:48.000Z');
});

test('Long to date gives no date when no layout fits', () => {
  // 0x5000 is neither layout: month 0 by the specification, day 0 as MS-DOS.
  expect(decodeFdate(0x5000)).toStrictEqual({});
});
