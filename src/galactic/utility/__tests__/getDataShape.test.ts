import { expect, test } from 'vitest';

import { getDataShape } from '../getDataShape.ts';
import { parseFlagParameters } from '../headerUtils.ts';

test('Data shape', () => {
  const y = parseFlagParameters(0b00000000);

  expect(getDataShape(y)).toBe('Y');

  const exception = parseFlagParameters(0b11000000);

  expect(getDataShape(exception)).toBe('exception');

  const yy = parseFlagParameters(0b00000100);

  expect(getDataShape(yy)).toBe('YY');

  const xy = parseFlagParameters(0b10000000);

  expect(getDataShape(xy)).toBe('XY');

  const xyy = parseFlagParameters(0b10000100);

  expect(getDataShape(xyy)).toBe('XYY');

  const xyxy = parseFlagParameters(0b11000100);

  expect(getDataShape(xyxy)).toBe('XYXY');
});
