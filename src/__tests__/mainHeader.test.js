import { readFileSync } from 'fs';
import { join } from 'path';

import { mainHeader } from '../mainHeader';

const { IOBuffer } = require('iobuffer');

describe('mainHeader parsing test', () => {
  it('m_xyxy.spc', () => {
    const mxyxy = mainHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/m_xyxy.spc'))),
    );
    expect(mxyxy.parameters.xyxy).toStrictEqual(true);
    expect(mxyxy.parameters.multiFile).toStrictEqual(true);
    expect(mxyxy.xUnitsType).toStrictEqual('Mass (M/z)');
    expect(mxyxy.zUnitsType).toStrictEqual('Minutes');
    expect(mxyxy.wUnitsType).toBeUndefined();
    expect(mxyxy.date).toMatch(/1986-01-09T08:47/);
    expect(mxyxy.memo).toMatch(/^Multiple [^]*X & Y arrays/);
  });
  it('RAMAN.SPC', () => {
    const raman = mainHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/RAMAN.SPC'))),
    );
    expect(raman.date).toMatch(/1994-08-26T16:45/);
    expect(raman.xyzLabels).toMatch(/Rmn Intensity/);
  });
  it('m_ordz', () => {
    const mOrdZ = mainHeader(
      new IOBuffer(readFileSync(join(__dirname, 'data/m_ordz.spc'))),
    );
    expect(mOrdZ.memo).toMatch(/^Multiple [^]*ordered Z spacing/);
  });
});
