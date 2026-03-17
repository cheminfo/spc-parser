import { expect, test } from 'vitest';

import { FlagParameters, longToDate } from '../headerUtils.ts';

test('Flag parameters', () => {
  const instance = new FlagParameters(255);

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
