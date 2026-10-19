import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import type { TheNewHeader, TheOldHeader } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';

function readHeader(name: string) {
  const bytes = readFileSync(join(import.meta.dirname, 'data', name));
  return fileHeader(new IOBuffer(bytes));
}

test('m_xyxy.spc', () => {
  const mxyxy = readHeader('m_xyxy.spc') as TheNewHeader;

  expect(mxyxy.parameters.multiFile).toBe(true);
  expect(mxyxy.xUnitsType).toBe('Mass (M/z)');
  expect(mxyxy.zUnitsType).toBe('Minutes');
  expect(mxyxy.date).toMatch(/1986-01-09T08:47/);
  expect(mxyxy.memo).toMatch(/^Multiple [^]*X & Y arrays/);
});

test('RAMAN.SPC', () => {
  const raman = readHeader('RAMAN.SPC') as TheNewHeader;

  expect(raman.date).toMatch(/1994-08-26T16:45/);
  expect(raman.xyzLabels).toMatch(/Rmn Intensity/);
});

test('m_ordz', () => {
  const mOrdZ = readHeader('m_ordz.spc') as TheOldHeader;

  expect(mOrdZ.fileVersion).toBe(0x4d);
  expect(mOrdZ.memo).toMatch(/^Multiple [^]*ordered Z spacing/);
});
