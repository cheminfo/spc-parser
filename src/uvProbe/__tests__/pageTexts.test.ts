import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import { createParseContext } from '../../utility/ParseContext.ts';
import { NAIVE_DATE_WARNING } from '../../utility/naiveDate.ts';
import { readProperties } from '../datasetMeta.ts';
import { parsePageText } from '../pageTexts.ts';

const encoder = new TextEncoder();

/**
 * Encodes a .NET `BinaryWriter` string shorter than 128 bytes.
 * @param text - the text.
 * @returns The length prefix and the UTF-8 bytes.
 */
function dotNetString(text: string): number[] {
  const bytes = encoder.encode(text);
  return [bytes.length, ...bytes];
}

/**
 * Builds a `PageTextsN` stream.
 * @param title - section title.
 * @param count - announced number of properties.
 * @param rest - bytes of the properties.
 * @returns The stream bytes.
 */
function pageText(title: string, count: number, rest: number[]): Uint8Array {
  const countBytes = new Uint8Array(4);
  new DataView(countBytes.buffer).setUint32(0, count, true);
  return Uint8Array.from([
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...dotNetString(title),
    ...countBytes,
    ...rest,
  ]);
}

test('a huge property count with a negative-looking length stops at the end of the stream', () => {
  // FB FF FF FF 0F is -5 as an int32 7-bit length.
  const content = pageText(
    'Section',
    0xffffffff,
    [0, 0xfb, 0xff, 0xff, 0xff, 0x0f],
  );

  expect(() => parsePageText(content)).toThrow(
    'string runs past the end of the stream',
  );
});

test('a section titled __proto__ stays an own property', () => {
  const prefix = 'Root Entry/DataSet1/';
  const streams = new Map([
    [
      `${prefix}MethodStorage/PageTexts0`,
      pageText('[__proto__]', 1, [
        ...dotNetString('polluted:'),
        ...dotNetString('yes'),
      ]),
    ],
  ]);
  const properties = readProperties(streams, prefix, createParseContext());

  expect(Object.keys(properties)).toStrictEqual(['__proto__']);
  expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
  expect(
    Object.getOwnPropertyDescriptor(properties, '__proto__')?.value,
  ).toStrictEqual({
    polluted: 'yes',
  });
});

test('a truncated UVProbe OLE file gives warnings instead of throwing', () => {
  const bytes = readFileSync(join(import.meta.dirname, 'data/uvprobe-ole.spc'));
  const result = parse(bytes.subarray(0, 10240));

  expect(result.spectra).toHaveLength(1);
  expect(result.warnings).toStrictEqual([
    'UVProbe dataset DataStorage1/DataSetGroup/DataSet1: no measuring mode (Data Header.1 missing or short); Y labelled Absorbance',
    'UVProbe stream DataStorage1/DataSetGroup/DataSet1/MethodStorage/PageTexts0 is truncated; ignored',
    'UVProbe stream DataStorage1/DataSetGroup/DataSet1/MethodStorage/PageTexts1 is truncated; ignored',
    NAIVE_DATE_WARNING,
  ]);
});
