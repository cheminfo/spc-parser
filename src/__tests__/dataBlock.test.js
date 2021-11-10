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
    const spectra = readDataBlock(buffer, mainHeader(buffer));
    expect(spectra).toHaveLength(512);
    expect(spectra[0].variables.y.data[1]).toBe(3188);
    expect(spectra[511].variables.y.data[3]).toBe(11019);
  });
  it('RAMAN.SPC', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/RAMAN.SPC')),
    );
    const spevctra = readDataBlock(buffer, mainHeader(buffer));
    expect(spevctra[0].variables.x.data[1]).toBeCloseTo(3994.8946331825773);
    expect(spevctra[0].variables.y.data[1]).toBeCloseTo(0.0186002254486084);
  });
  it('m_ordz.spc', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/m_ordz.spc')),
    );
    const spectra = readDataBlock(buffer, mainHeader(buffer));
    expect(spectra[0].variables.x.data[0]).toBe(698.229736328125);
    expect(spectra[0].variables.y.data[0]).toBeCloseTo(0.02219367027282715);
    expect(spectra[0].variables.y.data[4]).toBeCloseTo(0.005127236247062683);
    expect(spectra[0].variables.y.data[800]).toBeCloseTo(0.0833737701177597);
    expect(spectra[0].variables.y.data[856]).toBeCloseTo(0.15000060200691223);
    expect(spectra[9].variables.y.data[0]).toBeCloseTo(0.023877553641796112);
    expect(spectra[9].variables.y.data[856]).toBeCloseTo(0.000490216538310051);
    expect(spectra[9].variables.x.data).toHaveLength(857);
    expect(spectra[10]).toBeUndefined();
  });
  it('Ft-ir.spc', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/Ft-ir.spc')),
    );
    const spectra = readDataBlock(buffer, mainHeader(buffer));
    expect(spectra).toHaveLength(1);
    expect(spectra[0].variables.y.data[0]).toBeCloseTo(95.13749694824219);
  });
  it('m_evenz.spc', () => {
    const buffer = new IOBuffer(
      readFileSync(join(__dirname, 'data/m_evenz.spc')),
    );
    const header = mainHeader(buffer);
    const spectra = readDataBlock(buffer, header);
    expect(spectra[0].variables.x.data).toStrictEqual(
      spectra[2].variables.x.data,
    );
    expect(spectra[6].variables.y.data[4]).toBeCloseTo(0.3032105267047882);
    expect(spectra[0].variables.x).toMatchObject({
      symbol: 'x',
      label: 'Nanometers',
      units: 'nm',
      type: 'INDEPENDENT',
    });
    expect(spectra[0].variables.y).toMatchObject({
      symbol: 'y',
      label: 'Absorbance',
      units: '',
      type: 'DEPENDENT',
    });
  });
});
