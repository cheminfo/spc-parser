import { expect, test } from 'vitest';

import { hasSignature, readLatin1 } from '../bytes.ts';

const bytes = new Uint8Array([0x41, 0x42, 0xe9, 0x00, 0x43]);

test('readLatin1 maps every byte to one character', () => {
  expect(readLatin1(bytes, 0, 4)).toBe('ABé\0');
});

test('readLatin1 stops at the end of the bytes', () => {
  expect(readLatin1(bytes, 3, 10)).toBe('\0C');
});

test('hasSignature compares the first bytes', () => {
  expect(hasSignature(bytes, [0x41, 0x42])).toBe(true);
  expect(hasSignature(bytes, [0x41, 0x43])).toBe(false);
  expect(hasSignature(bytes.subarray(0, 1), [0x41, 0x42])).toBe(false);
});
