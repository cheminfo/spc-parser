import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../../parse.ts';

import { toBigEndian } from './toBigEndian.ts';

const dataDirectory = join(import.meta.dirname, 'data');

/**
 * Parses a file and drops `meta.fileVersion`, the only field that differs
 * between a `0x4B` file and its `0x4C` conversion.
 * @param bytes - the file bytes.
 * @returns The parse result without the file version.
 */
function parseWithoutVersion(bytes: Uint8Array) {
  const { meta, ...rest } = parse(bytes);
  const { fileVersion, ...metaWithoutVersion } = meta as {
    fileVersion: number;
  };
  return { fileVersion, result: { meta: metaWithoutVersion, ...rest } };
}

test.each([
  's_evenx.spc',
  's_xy.spc',
  'Ft-ir.spc',
  'nir.spc',
  'm_evenz.spc',
  '4d_map.spc',
  'm_xyxy.spc',
  'ms.spc',
  'raman-sion.spc',
])('%s parses identically after conversion to big-endian', (name) => {
  const littleEndian = new Uint8Array(readFileSync(join(dataDirectory, name)));
  const bigEndian = toBigEndian(littleEndian);

  expect(bigEndian[1]).toBe(0x4c);

  const expected = parseWithoutVersion(littleEndian);
  const actual = parseWithoutVersion(bigEndian);

  expect(expected.fileVersion).toBe(0x4b);
  expect(actual.fileVersion).toBe(0x4c);
  expect(actual.result).toStrictEqual(expected.result);
});
