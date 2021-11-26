import { readFileSync } from 'fs';
import { join } from 'path';

import { parse } from '..';

describe('parse', () => {
  it('ft-ir.spc', () => {
    const buffer = readFileSync(join(__dirname, 'data', 'Ft-ir.spc'));
    const result = parse(buffer);
    expect(result.spectra[0].variables.x).toMatchObject({
      symbol: 'x',
      label: 'Wavenumber',
      units: 'cm-1',
      type: 'INDEPENDENT',
    });
    expect(result.spectra).toHaveLength(1);
    expect(Object.keys(result.meta)).toHaveLength(31);
  });
  it('raman-sion.spc', () => {
    const buffer = readFileSync(join(__dirname, 'data', 'raman-sion.spc'));
    const result = parse(buffer);
    expect(result.spectra[0].variables.x).toMatchObject({
      symbol: 'x',
      label: 'Raman Shift',
      units: 'cm-1',
      type: 'INDEPENDENT',
    });
    expect(result.spectra).toHaveLength(36);
    expect(Object.keys(result.meta)).toHaveLength(31);
    const dataY = result.spectra[0].variables.y.data;
    expect(Math.min(...dataY)).toBeCloseTo(1870.6690673828125);
    expect(Math.max(...dataY)).toBe(7594.40869140625);
  });

  it('NDR0002.SPC', () => {
    const buffer = readFileSync(join(__dirname, 'data', 'NDR0002.SPC'));
    const result = parse(buffer);
    const variables = result.spectra[0].variables;
    const minX = Math.min(...variables.x.data);
    const minY = Math.min(...variables.y.data);
    const maxX = Math.max(...variables.x.data);
    const maxY = Math.max(...variables.y.data);
    expect(minX).toBeCloseTo(88.63693237304688);
    expect(minY).toBe(0);
    expect(maxX).toBeCloseTo(4011.202392578125);
    expect(maxY).toBe(1);
  });
});
