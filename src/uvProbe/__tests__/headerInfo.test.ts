import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import { oleDateToIso, parseHeaderInfo, readTitle } from '../headerInfo.ts';
import { readDotNetString } from '../readDotNetString.ts';

const encoder = new TextEncoder();

function dotNetString(text: string): number[] {
  const bytes = encoder.encode(text);
  return [bytes.length, ...bytes];
}

function float64Bytes(value: number): Uint8Array {
  const array = new Float64Array([value]);
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}

test('readTitle strips the history prefix and dataset suffix', () => {
  expect(readTitle('Created new data set:  wt_asc1.')).toBe('wt_asc1');
  expect(readTitle('Created new data set:  s_103243 - RawData-003.')).toBe(
    's_103243',
  );
  expect(
    readTitle(
      String.raw`Created new data set:  134620 - RawData - C:\Documents\DNA\x.spc.`,
    ),
  ).toBe('134620');
  expect(readTitle('创建新的数据集:  dPVC - RawData.')).toBe('dPVC');
  expect(readTitle('no colon here')).toBeUndefined();
  expect(readTitle('Created new data set: .')).toBeUndefined();
});

test('oleDateToIso gives a local ISO string or undefined', () => {
  expect(oleDateToIso(25569.5)).toBe('1970-01-01T12:00:00.000');
  expect(oleDateToIso(0)).toBeUndefined();
  expect(oleDateToIso(NaN)).toBeUndefined();
});

test('parseHeaderInfo stops at the end of a short stream', () => {
  const bytes = new Uint8Array([
    ...dotNetString('RawData'),
    0,
    0,
    0,
    0,
    ...float64Bytes(25569.5),
    ...dotNetString('operator'),
  ]);

  expect(parseHeaderInfo(bytes, 'windows-1252')).toStrictEqual({
    datasetName: 'RawData',
    date: '1970-01-01T12:00:00.000',
    operator: 'operator',
  });
});

test('readDotNetString throws or clamps a string past the end', () => {
  const bytes = new Uint8Array([10, 65, 66]);

  expect(() => readDotNetString(new IOBuffer(bytes), 'utf8')).toThrow(
    'string runs past the end of the stream',
  );
  expect(readDotNetString(new IOBuffer(bytes), 'utf8', true)).toBe('AB');
});

test('readDotNetString reads multi-byte 7-bit lengths', () => {
  const text = 'x'.repeat(200);
  const bytes = new Uint8Array([0xc8, 0x01, ...encoder.encode(text)]);
  const buffer = new IOBuffer(bytes);

  expect(readDotNetString(buffer, 'utf8')).toBe(text);
  expect(buffer.offset).toBe(bytes.length);
});

test('readDotNetString rejects a length prefix longer than 5 bytes', () => {
  const bytes = new Uint8Array([0xfb, 0xff, 0xff, 0xff, 0x8f, 0x01]);

  expect(() => readDotNetString(new IOBuffer(bytes), 'utf8')).toThrow(
    'invalid string length prefix',
  );
});

test('readDotNetString does not overflow a 5-byte length prefix', () => {
  // FB FF FF FF 0F is -5 as int32; it is a huge length, clamped to nothing.
  const bytes = new Uint8Array([0xfb, 0xff, 0xff, 0xff, 0x0f]);
  const buffer = new IOBuffer(bytes);

  expect(() => readDotNetString(new IOBuffer(bytes), 'utf8')).toThrow(
    'string runs past the end of the stream',
  );
  expect(readDotNetString(buffer, 'utf8', true)).toBe('');
  expect(buffer.offset).toBe(5);
});
