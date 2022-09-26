import { readFileSync } from 'fs';
import { join } from 'path';

import { fileHeader } from '../fileHeader';
import { guessSpectraType: guessType } from '../guessSpectraType'; //needs the whole file

const dataDir = "../../__tests__/data";
describe('parse', () => {

  it('nir', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'nir.spc'));
    const result = fileHeader(buffer);
    const guessedType = guessType(result);
    expect(guessedType).toBe('ir');
  });


  it('ft-ir.spc', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'Ft-ir.spc'));
    const result = fileHeader(buffer);
    const guessedType = guessType(result);
    expect(guessedType).toBe('ir'); //MIR I think (middle range IR.)
  });

  it('raman-sion.spc', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'raman-sion.spc'));
    const result = fileHeader(buffer);
    const guessedType = guessType(result);
    expect(guessedType).toBe('raman');
  });

  it('NDR0002.SPC', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'NDR0002.SPC'));
    const result = fileHeader(buffer);
    const guessedType = guessType(result);
    expect(guessedType).toBe('raman');
  });
  it('m_xyxy', () => {
    const buffer = readFileSync(join(__dirname, dataDir, 'm_xyxy.spc'));
    const result = fileHeader(buffer);
    const guessedType = guessType(result);
    expect(guessedType).toBe('mass');
  });
});
