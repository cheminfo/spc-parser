import { readFileSync } from 'fs';
import { join } from 'path';

import { IOBuffer } from 'iobuffer';

import { TheNewHeader, TheOldHeader } from '../fileHeader';
import { guessType } from '../utility';

describe('mainHeader parsing test', () => {
  it('m_xyxy.spc', () => {
    const mxyxy = new TheNewHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/m_xyxy.spc'))),
    );
    expect(mxyxy.parameters.multiFile).toBe(true);
    expect(mxyxy.xUnitsType).toBe('Mass (M/z)');
    expect(mxyxy.zUnitsType).toBe('Minutes');
    expect(mxyxy.date).toMatch(/1986-01-09T08:47/);
    expect(mxyxy.memo).toMatch(/^Multiple [^]*X & Y arrays/);
    expect(guessType(mxyxy)).toBe('mass');
  });
  it('RAMAN.SPC', () => {
    const raman = new TheNewHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/RAMAN.SPC'))),
    );
    expect(raman.date).toMatch(/1994-08-26T16:45/);
    expect(raman.xyzLabels).toMatch(/Rmn Intensity/);
    expect(guessType(raman)).toBe('raman');
  });
  it('m_ordz', () => {
    const mOrdZ = new TheOldHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/m_ordz.spc'))),
    );
    expect(mOrdZ.fileVersion).toBe(0x4d);
    expect(mOrdZ.memo).toMatch(/^Multiple [^]*ordered Z spacing/);
    expect(guessType(mOrdZ)).toBe('uv');
  });
});
