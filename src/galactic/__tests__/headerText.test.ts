import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import { createParseContext } from '../../utility/ParseContext.ts';
import type { TheNewHeader } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';

import { patch, patchBytes } from './mutate.ts';
import { toBigEndian } from './toBigEndian.ts';

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dirname, 'data', name)));
}

function header(bytes: Uint8Array, encoding?: string): TheNewHeader {
  const context = createParseContext(encoding ? { encoding } : {});
  return fileHeader(new IOBuffer(bytes), context) as TheNewHeader;
}

test('memo is cut at the first NUL', () => {
  expect(header(read('Ft-ir.spc')).memo).toBe('FT-IR Spectrum Example');
  expect(header(read('NMR_SPC.SPC')).memo).toBe('1D NMR Spectrum Example');
  expect(header(read('corpus/KRY3.SPC')).memo).toBe('Krypton Lamps');
});

test('text left after the NUL is exposed as fragments', () => {
  const ms = header(read('ms.spc'));

  expect(ms.memo).toBe('Single Mass Spectrum Example');
  expect(ms.memoFragments).toStrictEqual(['(AAFS MS Drug Library)']);
  expect(header(read('Ft-ir.spc')).memoFragments).toStrictEqual([
    'torials: polystyrene',
  ]);
  expect(header(read('corpus/KRY3.SPC')).memoFragments).toStrictEqual(['PMT']);
  expect(header(read('s_evenx.spc')).memoFragments).toStrictEqual([]);
});

test('UTF-8 memo written by Essential FTIR', () => {
  const meta = header(read('corpus/essential-ftir-utf8-memo.SPC'));

  expect(meta.memo).toBe('gatunek niezidentyfikowany poroże VIII w.');
});

test('memo with a caller-given encoding', () => {
  const bytes = read('corpus/viavi-JDSU_Phar_Rotate_S06.spc');

  expect(header(bytes).memo).toBe('JDSU_Phar_Rotate_S06_1_201710ÔÂ09_1540');
  expect(header(bytes, 'gbk').memo).toBe(
    'JDSU_Phar_Rotate_S06_1_201710月09_1540',
  );
});

test('fsource garbage after the NUL is dropped', () => {
  const meta = header(read('resolutionPro.spc'));

  expect(meta.sourceInstrumentDescription).toBe('Agilent');
});

test('Andor header full of binary data', () => {
  const meta = header(read('corpus/BC408_5mmHorizontal.spc'));

  expect(meta.memo).toBe('');
  expect(meta.memoFragments).toStrictEqual([]);
  expect(meta.sourceInstrumentDescription).toBe('DV420_OE');
  expect(meta.methodFile).toBe('Exp. time = 0.000010 secs X 10 Accums.');
});

test('custom labels keep their positions', () => {
  expect(header(read('NDR0002.SPC')).customLabels).toStrictEqual({
    x: '',
    y: 'Raman Intensity',
    z: '',
  });
  expect(header(read('corpus/KRY3.SPC')).customLabels).toStrictEqual({
    x: 'Wavenumber (cm-1)',
    y: '(arb)',
    z: '',
  });
  expect(header(read('RAMAN.SPC')).xyzLabels).toBe('Rmn Intensity');
});

test('memo without NUL continues into fcatxt when TALABS is off', () => {
  // s_evenx: fill the 130-byte fcmnt with 'a' and put 'bcd' in fcatxt.
  const memo = new Uint8Array(133).fill(0x61);
  memo.set([0x62, 0x63, 0x64], 130);
  const meta = header(patchBytes(read('s_evenx.spc'), 88, memo));

  expect(meta.memo).toBe(`${'a'.repeat(130)}bcd`);
  expect(meta.customLabels).toStrictEqual({ x: '', y: '', z: '' });
});

test('fspare keeps its order in big-endian files', () => {
  // s_evenx with fspare[i] = i + 1, then converted to 0x4C.
  const patches = [];
  for (let i = 0; i < 8; i++) {
    patches.push({
      offset: 56 + 4 * i,
      type: 'float32' as const,
      value: i + 1,
    });
  }
  const littleEndian = patch(read('s_evenx.spc'), patches);
  const expected = [1, 2, 3, 4, 5, 6, 7, 8];

  expect(header(littleEndian).spare).toStrictEqual(expected);
  expect(header(toBigEndian(littleEndian)).spare).toStrictEqual(expected);
});
