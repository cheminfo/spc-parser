import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as CFB from 'cfb';
import { expect, test } from 'vitest';

import { parse } from '../../parse.ts';

import { addUvProbeDataSets, buildOle } from './buildOle.ts';

const source = new Uint8Array(
  readFileSync(join(import.meta.dirname, 'data', 'uvprobe-ole.spc')),
);

test('buildOle writes the given streams', () => {
  const bytes = buildOle({
    '/Storage/First': new Uint8Array([1, 2, 3]),
    '/Second': new Uint8Array([4]),
  });
  const container = CFB.read(bytes, { type: 'buffer' });

  expect(Array.from(CFB.find(container, 'First')?.content ?? [])).toStrictEqual(
    [1, 2, 3],
  );
  expect(
    Array.from(CFB.find(container, 'Second')?.content ?? []),
  ).toStrictEqual([4]);
});

test('addUvProbeDataSets duplicates DataSet1 with shifted Y', () => {
  const bytes = addUvProbeDataSets(source, [
    { name: 'DataSet2', yOffset: 1 },
    { name: 'DataSet3', yOffset: 10 },
  ]);
  const container = CFB.read(bytes, { type: 'buffer' });
  const yPaths = container.FullPaths.filter((path) =>
    path.endsWith('Y Data.1'),
  );

  expect(yPaths).toStrictEqual([
    'Root Entry/DataStorage1/DataSetGroup/DataSet1/DataSpectrumStorage/Data/Y Data.1',
    'Root Entry/DataStorage1/DataSetGroup/DataSet2/DataSpectrumStorage/Data/Y Data.1',
    'Root Entry/DataStorage1/DataSetGroup/DataSet3/DataSpectrumStorage/Data/Y Data.1',
  ]);

  const original = parse(source).spectra[0]?.variables.y.data;
  const firstDataSet = parse(bytes).spectra[0]?.variables.y.data;

  expect(firstDataSet).toStrictEqual(original);
});
