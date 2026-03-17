import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../parse.ts';

test('Resolution pro', () => {
  const buffer = readFileSync(
    join(import.meta.dirname, 'data', 'resolutionPro.spc'),
  );

  const result = parse(buffer);

  expect(result.spectra).toHaveLength(1);

  const variables = result.spectra[0].variables;
  const min = Math.min(...variables.y.data);
  const max = Math.max(...variables.y.data);

  expect(min).toBe(3);
  expect(max).toBe(205);
});
