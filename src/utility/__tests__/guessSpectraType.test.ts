import { readFileSync } from 'fs';
import { join } from 'path';

import { IOBuffer } from 'iobuffer';

import { fileHeader } from '../../fileHeader';
import { unitToNano, getRegion, guessSpectraType } from '../guessSpectraType';

describe('Test the Spectra-Type Guess', () => {
  const dataDir = '../../__tests__/data';
  it('nir', () => {
    //kubelka-monk is now in "other" as it is a
    //very different type of "ir"
    const buffer = readFileSync(join(__dirname, dataDir, 'nir.spc'));
    const result = fileHeader(new IOBuffer(buffer));
    const guessedType = guessSpectraType(result);
    expect(guessedType).toBe('other');
  });

  it('s_evenx', () => {
    //kubelka-monk is now in "other" as it is a
    //very different type of "ir"
    const buffer = readFileSync(join(__dirname, dataDir, 's_evenx.spc'));
    const result = fileHeader(new IOBuffer(buffer));
    const guessedType = guessSpectraType(result);
    expect(guessedType).toBe('ir');
  });

  it('ft-ir.spc', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'Ft-ir.spc'));
    const result = fileHeader(new IOBuffer(buffer));
    const guessedType = guessSpectraType(result);
    expect(guessedType).toBe('ir'); //MIR I think (middle range IR.)
  });

  it('raman-sion.spc', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'raman-sion.spc'));
    const result = fileHeader(new IOBuffer(buffer));
    const guessedType = guessSpectraType(result);
    expect(guessedType).toBe('raman');
  });

  it('NDR0002.SPC', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'NDR0002.SPC'));
    const result = fileHeader(new IOBuffer(buffer));
    const guessedType = guessSpectraType(result);
    expect(guessedType).toBe('raman');
  });
  it('m_xyxy', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'm_xyxy.spc'));
    const result = fileHeader(new IOBuffer(buffer));
    const guessedType = guessSpectraType(result);
    expect(guessedType).toBe('mass');
  });

  it('get region of spectra from wavelength in nm.', () => {
    expect(getRegion(100)).toBe('other');
    expect(getRegion(250)).toBe('uv');
    expect(getRegion(750)).toBe('ir');
  });

  it('convert micrometers or wavenumber to nanometers', () => {
    expect(unitToNano(12500, 'wavenumber')).toBeCloseTo(800);
    expect(unitToNano(0.8, 'micrometer')).toBeCloseTo(800);
  });
});
