import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import type { Header } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';
import { decodeModifications, decodeProcessing } from '../headerHints.ts';

import { patch } from './mutate.ts';

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dirname, 'data', name)));
}

function header(bytes: Uint8Array): Header {
  return fileHeader(new IOBuffer(bytes));
}

function letters(name: string): string[] {
  const { modifications } = header(read(name));
  return modifications.map((modification) => modification.letter);
}

test('modification letters: bit n is the letter A + n', () => {
  expect(header(read('m_evenz.spc')).modifications).toStrictEqual([
    {
      letter: 'O',
      description: 'Other function (add, subtract, multiply ...)',
    },
  ]);
  expect(letters('corpus/DRUG_SAMPLE_PEAKS.SPC')).toStrictEqual([
    'I',
    'T',
    'W',
  ]);
  expect(letters('corpus/IG_BKGND.SPC')).toStrictEqual(['C']);
  expect(letters('s_evenx.spc')).toStrictEqual([]);
});

test('undocumented modification letters have no description', () => {
  expect(decodeModifications(0x2000001)).toStrictEqual([
    { letter: 'A', description: 'Averaging' },
    { letter: 'Z', description: 'Zap' },
  ]);
  expect(decodeModifications(0x20)).toStrictEqual([
    { letter: 'F', description: '' },
  ]);
});

test('peaks and drawing hints', () => {
  const ftir = header(read('Ft-ir.spc'));

  expect(ftir.invertedPeaks).toBe(true);
  expect(ftir.drawAsSticks).toBe(false);
  expect(header(read('ms.spc')).drawAsSticks).toBe(true);
  expect(header(read('RAMAN.SPC')).invertedPeaks).toBe(false);
});

test('chromatograms', () => {
  // s_evenx with TCGRAM (flag 0x02), then with fexper (offset 2) = 3 (HPLC).
  const tcgram = header(
    patch(read('s_evenx.spc'), [{ offset: 0, type: 'uint8', value: 0x02 }]),
  );

  expect(tcgram.isChromatogram).toBe(true);
  expect(tcgram.kind === 'new' && tcgram.experimentType).toBe(
    'General Chromatogram',
  );

  const hplc = header(
    patch(read('s_evenx.spc'), [{ offset: 2, type: 'uint8', value: 3 }]),
  );

  expect(hplc.isChromatogram).toBe(true);
  expect(header(read('s_evenx.spc')).isChromatogram).toBe(false);
});

test('zero path difference index of an interferogram', () => {
  // s_evenx with fytype (offset 29) = 1 and fpeakpt (offset 54) = 1234.
  const bytes = patch(read('s_evenx.spc'), [
    { offset: 29, type: 'uint8', value: 1 },
    { offset: 54, type: 'uint16', value: 1234 },
  ]);

  expect(header(bytes).zpdIndex).toBe(1234);
  expect(header(read('s_evenx.spc')).zpdIndex).toBeUndefined();
});

test('posting disposition and processing codes', () => {
  expect(header(read('corpus/KRY3.SPC')).postingLabel).toBe('Save and keep');
  expect(header(read('s_evenx.spc')).postingLabel).toBe('Default');
  expect(decodeProcessing(0)).toStrictEqual([]);
  expect(decodeProcessing(1)).toStrictEqual([]);
  // GRAMSDDE.H example: compute and library search is 1 + 64 + 1.
  expect(decodeProcessing(66)).toStrictEqual(['Computed', 'Library search']);
  expect(decodeProcessing(1 + 2 + 12)).toStrictEqual([
    'Computed by a DLL',
    'Kubelka-Munk',
  ]);
});
