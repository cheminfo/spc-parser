import { readFileSync } from 'fs';
import { join } from 'path';

import { parse } from '../parse';

test('Resolution pro', () => {
  const buffer = readFileSync(join(__dirname, 'data', 'resolutionPro.spc'));

  const result = parse(buffer);
  expect(result.spectra).toHaveLength(1);
  const variables = result.spectra[0].variables;
  const min = Math.min(...variables.y.data);
  const max = Math.max(...variables.y.data);
  expect(min).toBe(3);
  expect(max).toBe(205);
});
