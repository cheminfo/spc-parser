import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { xMinMaxValues } from 'ml-spectra-processing';
import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';

test('Resolution pro', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, 'data', 'resolutionPro.spc'),
  );

  const result = parse(buffer);

  expect(result.spectra).toHaveLength(1);

  const spectrum = result.spectra[0];
  assert(spectrum);
  const variables = spectrum.variables;
  const { min, max } = xMinMaxValues(variables.y.data);

  expect(min).toBe(3);
  expect(max).toBe(205);
});
