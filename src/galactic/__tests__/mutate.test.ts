import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../../parse.ts';

import { append, patch, patchBytes, truncate } from './mutate.ts';

const source = new Uint8Array(
  readFileSync(join(import.meta.dirname, 'data', 's_evenx.spc')),
);

test('patch writes every field type on a copy', () => {
  const patched = patch(source, [
    { offset: 0, type: 'uint8', value: 200 },
    { offset: 1, type: 'int8', value: -2 },
    { offset: 2, type: 'uint16', value: 0x1234 },
    { offset: 4, type: 'int16', value: -3, littleEndian: false },
    { offset: 6, type: 'uint32', value: 0xdeadbeef },
    { offset: 10, type: 'int32', value: -5 },
    { offset: 14, type: 'float32', value: 1.5 },
    { offset: 18, type: 'float64', value: -2.25 },
  ]);
  const view = new DataView(patched.buffer);

  expect([
    view.getUint8(0),
    view.getInt8(1),
    view.getUint16(2, true),
    view.getInt16(4, false),
    view.getUint32(6, true),
    view.getInt32(10, true),
    view.getFloat32(14, true),
    view.getFloat64(18, true),
  ]).toStrictEqual([200, -2, 0x1234, -3, 0xdeadbeef, -5, 1.5, -2.25]);
  expect(source[0]).toBe(0);
  expect(source[1]).toBe(0x4b);
});

test('patch changes what the parser reads', () => {
  const withSubfiles = patch(source, [
    { offset: 248, type: 'uint32', value: source.length + 1 },
  ]);

  expect(parse(withSubfiles).warnings).toStrictEqual([
    `Log block offset ${source.length + 1} is beyond the end of the file (${source.length} bytes); log ignored`,
  ]);
});

test('patchBytes, truncate and append return modified copies', () => {
  const text = new TextEncoder().encode('KeV\0Counts\0');

  expect(patchBytes(source, 30, text).subarray(30, 41)).toStrictEqual(text);
  expect(truncate(source, 300)).toHaveLength(300);
  expect(append(source, 1000)).toHaveLength(source.length + 1000);
  expect(append(source, 1000).subarray(source.length)).toStrictEqual(
    new Uint8Array(1000),
  );
  expect(append(source, text).subarray(source.length)).toStrictEqual(text);
  expect(source).toHaveLength(
    readFileSync(join(import.meta.dirname, 'data', 's_evenx.spc')).length,
  );
});
