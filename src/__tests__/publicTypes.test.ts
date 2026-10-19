import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import type {
  DateLayout,
  GalacticSpectrumMeta,
  Header,
  SpectraType,
  XDirection,
} from '../index.ts';
import { guessSpectraType, parse } from '../index.ts';

test('the per-spectrum Galactic metadata is typed by the public types', () => {
  const bytes = readFileSync(
    join(import.meta.dirname, '../galactic/__tests__/data/m_evenz.spc'),
  );
  const result = parse(bytes);
  const header = result.meta as Header;
  const meta = result.spectra[1]?.meta as GalacticSpectrumMeta;
  const xDirection: XDirection | undefined = header.xDirection;
  const dateLayout: DateLayout | undefined = header.dateLayout;
  const type: SpectraType = guessSpectraType(header);

  expect([meta.index, meta.isFloat, meta.numberPoints]).toStrictEqual([
    1,
    false,
    0,
  ]);
  expect([xDirection, dateLayout, type]).toStrictEqual([
    'increasing',
    undefined,
    'uv',
  ]);
});
