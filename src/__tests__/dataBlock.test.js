import { join } from 'path';

import { readDataBlock } from '../dataBlock';
import { mainHeader } from '../mainHeader';

const { readFileSync } = require('fs');

const { IOBuffer } = require('iobuffer');

describe('data block parsing test', () => {
  it('m_xyxy.spc', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/m_xyxy.spc')),
    );
    const parsed = readDataBlock(buffer, mainHeader(buffer));
    expect(parsed).toHaveLength(512);
    expect(parsed[0].variables[1].data[1]).toStrictEqual(3188);
    expect(parsed[511].variables[1].data[3]).toStrictEqual(11019);
  });
  it('RAMAN.SPC', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/RAMAN.SPC')),
    );
    const parsed = readDataBlock(buffer, mainHeader(buffer));
    expect(parsed[0].variables[0].data[1]).toBeCloseTo(3994.8946331825773);
    expect(parsed[0].variables[1].data[1]).toBeCloseTo(0.0186002254486084);
  });
  it('m_ordz.spc', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/m_ordz.spc')),
    );
    const parsed = readDataBlock(buffer, mainHeader(buffer));
    expect(parsed[0].variables[0].data[0]).toStrictEqual(698.229736328125);
    expect(parsed[0].variables[1].data[0]).toBeCloseTo(0.02219367027282715);
    expect(parsed[0].variables[1].data[4]).toBeCloseTo(0.005127236247062683);
    expect(parsed[0].variables[1].data[800]).toBeCloseTo(0.0833737701177597);
    expect(parsed[0].variables[1].data[856]).toBeCloseTo(0.15000060200691223);
    expect(parsed[9].variables[1].data[0]).toBeCloseTo(0.023877553641796112);
    expect(parsed[9].variables[1].data[856]).toBeCloseTo(0.000490216538310051);
    expect(parsed[9].variables[0].data).toHaveLength(857);
    expect(parsed[10]).toBeUndefined();
  });
  it('Ft-ir.spc', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/Ft-ir.spc')),
    );
    const parsed = readDataBlock(buffer, mainHeader(buffer));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].variables[1].data[0]).toBeCloseTo(95.13749694824219);
  });
  it('should ', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/m_evenz.spc')),
    );
    const parsed = readDataBlock(buffer, mainHeader(buffer));
    expect(parsed[0].variables[0].data).toStrictEqual(
      parsed[2].variables[0].data,
    );
    expect(parsed[6].variables[1].data[4]).toBeCloseTo(0.3032105267047882);
  });
});
