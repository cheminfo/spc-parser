import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as CFB from 'cfb';
import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../utility/naiveDate.ts';

import { addUvProbeDataSets } from './buildOle.ts';

const source = new Uint8Array(
  readFileSync(join(import.meta.dirname, 'data', 'uvprobe-ole.spc')),
);
const dataPath =
  '/DataStorage1/DataSetGroup/DataSet2/DataSpectrumStorage/Data/';

/**
 * Builds a two-dataset document whose second scan (600 to 300 nm every
 * 0.2 nm) stopped after a number of points, as UVProbe stores it.
 * @param numberPoints - points kept in the second dataset.
 * @returns The compound document bytes.
 */
function withStoppedScan(numberPoints: number): Uint8Array {
  const container = CFB.read(
    addUvProbeDataSets(source, [{ name: 'DataSet2' }]),
    {
      type: 'buffer',
    },
  );
  for (const name of ['X Data.1', 'Y Data.1']) {
    const entry = CFB.find(container, `${dataPath}${name}`);
    assert(entry);
    entry.content = Uint8Array.from(entry.content).slice(0, numberPoints * 8);
    entry.size = numberPoints * 8;
  }
  const header = CFB.find(container, `${dataPath}Data Header.1`);
  assert(header);
  const content = Uint8Array.from(header.content);
  new DataView(content.buffer).setUint32(0, numberPoints, true);
  header.content = content;
  const output: unknown = CFB.write(container, { type: 'array' });
  return output instanceof Uint8Array
    ? output
    : Uint8Array.from(output as number[]);
}

test('a shorter scan of the same storage is reported as interrupted', () => {
  const result = parse(withStoppedScan(1001));

  expect(result.spectra[1]?.variables.x.data).toHaveLength(1001);
  expect(result.warnings).toStrictEqual([
    'UVProbe dataset DataStorage1/DataSetGroup/DataSet2 looks like an interrupted scan: it spans 400 to 600 nm, DataStorage1/DataSetGroup/DataSet1 spans 300 to 600 nm',
    NAIVE_DATE_WARNING,
  ]);
});

test('a complete repeat of the same scan gives no warning', () => {
  expect(parse(withStoppedScan(1501)).warnings).toStrictEqual([
    NAIVE_DATE_WARNING,
  ]);
});
