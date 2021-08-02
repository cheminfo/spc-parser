import { readFileSync } from 'fs';
import { join } from 'path';

import { parse } from '..';

test('parse', () => {
  const buffer = readFileSync(join(__dirname, 'data', 'Ft-ir.spc'));
  const result = parse(buffer);
  expect(result.spectra).toHaveLength(1);
  expect(Object.keys(result.meta)).toHaveLength(31);
});
