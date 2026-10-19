import { expect, test } from 'vitest';

import { decodeText, splitNulFields } from '../decodeText.ts';

const encoder = new TextEncoder();

test('windows-1252 fallback decodes a lone 0xB5 as micro', () => {
  const bytes = new Uint8Array([0x36, 0x35, 0xb5, 0x6d]);

  expect(decodeText(bytes)).toBe('65µm');
});

test('valid UTF-8 is decoded as UTF-8', () => {
  const bytes = new Uint8Array([0x70, 0x6f, 0x72, 0x6f, 0xc5, 0xbc, 0x65]);

  expect(decodeText(bytes)).toBe('poroże');
});

test('text is cut at the first NUL', () => {
  const bytes = encoder.encode('FT-IR Spectrum Example\0torials');

  expect(decodeText(bytes)).toBe('FT-IR Spectrum Example');
});

test('a caller encoding is used when the bytes are not UTF-8', () => {
  const bytes = new Uint8Array([0xd4, 0xc2]);

  expect(decodeText(bytes, { encoding: 'gbk' })).toBe('月');
});

test('a field of NUL bytes decodes to an empty string', () => {
  expect(decodeText(new Uint8Array(30))).toBe('');
});

test('surrounding whitespace is trimmed', () => {
  expect(decodeText(encoder.encode('  Absorbance \r\n'))).toBe('Absorbance');
});

test('splitNulFields keeps inner empty fields and drops trailing ones', () => {
  const bytes = encoder.encode('KeV\0\0Counts\0\0\0');

  expect(splitNulFields(bytes)).toStrictEqual(['KeV', '', 'Counts']);
});

test('splitNulFields decodes each field with the fallback encoding', () => {
  const bytes = new Uint8Array([0xb5, 0x6d, 0, 0x41]);

  expect(splitNulFields(bytes)).toStrictEqual(['µm', 'A']);
  expect(splitNulFields(new Uint8Array(8))).toStrictEqual([]);
});

test('an encoded U+FFFD in valid UTF-8 is kept', () => {
  expect(decodeText(Uint8Array.of(0x61, 0xef, 0xbf, 0xbd))).toBe('a�');
});

test('an encoded U+FFFD next to invalid UTF-8 uses the fallback encoding', () => {
  expect(decodeText(Uint8Array.of(0xef, 0xbf, 0xbd, 0xb5))).toBe('ï¿½µ');
});
