import { expect, test } from 'vitest';

import { createEvenX } from '../createEvenX.ts';

test('evenly spaced values from the first to the last', () => {
  expect(createEvenX(1, 3, 3)).toStrictEqual(Float64Array.of(1, 2, 3));
});

test('a single point is placed at the first value', () => {
  expect(createEvenX(5, 9, 1)).toStrictEqual(Float64Array.of(5));
});
