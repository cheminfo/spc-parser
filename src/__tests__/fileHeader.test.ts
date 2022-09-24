import { readFileSync } from 'fs';
import { join } from 'path';

import { IOBuffer } from 'iobuffer';

import { fileHeader, TheNewHeader, TheOldHeader } from '../fileHeader';

describe('mainHeader parsing test', () => {
  it('m_xyxy.spc', () => {
    const mxyxy = fileHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/m_xyxy.spc'))),
    ) as TheNewFileHeader
    expect(mxyxy.parameters.multiFile).toBe(true);
    expect(mxyxy.xUnitsType).toBe('Mass (M/z)');
    expect(mxyxy.zUnitsType).toBe('Minutes');
    expect(mxyxy.date).toMatch(/1986-01-09T08:47/);
    expect(mxyxy.memo).toMatch(/^Multiple [^]*X & Y arrays/);
  });
  it('RAMAN.SPC', () => {
    const raman = fileHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/RAMAN.SPC'))),
    ) as TheNewFileHeader
    expect(raman.date).toMatch(/1994-08-26T16:45/);
    expect(raman.xyzLabels).toMatch(/Rmn Intensity/);
  });
  it('m_ordz', () => {
    const mOrdZ = fileHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/m_ordz.spc'))),
    ) as TheOldFileHeader
    expect(mOrdZ.fileVersion).toBe(0x4d);
    expect(mOrdZ.memo).toMatch(/^Multiple [^]*ordered Z spacing/);
  });
});
