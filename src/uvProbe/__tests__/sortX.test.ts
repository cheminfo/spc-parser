import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';

test.each(['uvprobe-flat.spc', 'uvprobe-ole.spc'])(
  '%s keeps its decreasing wavelengths with sortX false',
  (name) => {
    const bytes = readFileSync(join(import.meta.dirname, 'data', name));
    const sorted = parse(bytes).spectra[0]?.variables;
    const fileOrder = parse(bytes, { sortX: false }).spectra[0]?.variables;
    assert(sorted && fileOrder);

    expect(fileOrder.x.data[0]).toBe(600);
    expect(fileOrder.x.data.at(-1)).toBe(300);
    expect(Float64Array.from(fileOrder.x.data).toReversed()).toStrictEqual(
      sorted.x.data,
    );
    expect(Float64Array.from(fileOrder.y.data).toReversed()).toStrictEqual(
      sorted.y.data,
    );
  },
);
