import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { patch, truncate } from '../../galactic/__tests__/mutate.ts';
import { toBigEndian } from '../../galactic/__tests__/toBigEndian.ts';
import { parse } from '../../parse.ts';
import { buildOle } from '../../uvProbe/__tests__/buildOle.ts';
import { isGalactic } from '../isGalactic.ts';

const source = join(import.meta.dirname, '../..');

function read(path: string): Uint8Array {
  return new Uint8Array(readFileSync(join(source, path)));
}

function galactic(name: string): Uint8Array {
  return read(join('galactic/__tests__/data', name));
}

function unsupported(message: string) {
  return expect.objectContaining({
    name: 'SpcParserError',
    code: 'UNSUPPORTED_FORMAT',
    message: expect.stringContaining(message),
  });
}

const encoder = new TextEncoder();

test('a 25-byte text file is rejected as text', () => {
  const text = encoder.encode('100 0.1\n200 0.2\n300 0.3\n\n');

  expect(text).toHaveLength(25);
  expect(() => parse(text)).toThrow(
    unsupported('Unsupported SPC file: detected plain text'),
  );
});

test('a Bruker EPR .par parameter file is identified', () => {
  const lines = [
    'JSS  2',
    'ADEV  1',
    'VERS  769',
    'ANZ  1024',
    'MIN  -181238.000000',
    'MAX  172672.000000',
    'JON  xyz',
    'JRE  0.0',
    'HCF  3480.000000',
    'HSW  200.000000',
    'MF  9.780000',
    'MP  2.000e+01',
    'RRG  2.00e+04',
    'RES  1024',
    'JUN  G',
  ];
  const text = encoder.encode(`${lines.join('\r')}\r`);

  expect(() => parse(text)).toThrow(
    unsupported('detected Bruker EPR .par parameter file'),
  );
});

test('a Bruker EPR file whose byte 1 is 0x4C gets the generic error', () => {
  const bytes = read('__tests__/data/not-spc-bruker-epr-0x4c.spc');

  expect(bytes[1]).toBe(0x4c);
  expect(isGalactic(bytes)).toBe(false);
  expect(() => parse(bytes)).toThrow(
    unsupported(
      'Unsupported SPC file: not an OLE2 compound document, a Thermo Galactic SPC',
    ),
  );
});

test('EDAX and ORTEC files are named in the error', () => {
  expect(() => parse(read('__tests__/data/not-spc-edax-eds.spc'))).toThrow(
    unsupported('detected EDAX/AMETEK EDS or XRF spectrum'),
  );
  expect(() => parse(read('__tests__/data/not-spc-ortec-gamma.Spc'))).toThrow(
    unsupported('detected ORTEC/EG&G gamma-spectroscopy spectrum'),
  );
});

test('a Shimadzu RF-5300 file is no longer read as a flat file', () => {
  const bytes = new Uint8Array(1439);
  bytes.set([0x01, 0xe0], 0);
  bytes.set(encoder.encode('RF-5300'), 2);
  new DataView(bytes.buffer).setUint16(0xe9, 301, true);

  expect(() => parse(bytes)).toThrow(
    unsupported('detected Shimadzu RF-5300 fluorescence spectrum'),
  );
});

test('gzip, ASD, encrypted and Becker & Hickl signatures', () => {
  const gzip = new Uint8Array([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 6]);
  const asd = new Uint8Array(64);
  asd.set(encoder.encode('as7'));
  const encrypted = new Uint8Array(312);
  encrypted.set([0x0b, 0xf4, 0x2d, 0x4b, 0x0f, 0xc3, 0x7f, 0xce]);
  const photons = new Uint8Array(4096);
  new DataView(photons.buffer).setUint32(0, 0x8000005f, true);

  expect(() => parse(gzip)).toThrow(unsupported('detected gzip-compressed'));
  expect(() => parse(asd)).toThrow(unsupported('detected ASD FieldSpec'));
  expect(() => parse(encrypted)).toThrow(unsupported('detected encrypted'));
  expect(() => parse(photons)).toThrow(unsupported('detected Becker & Hickl'));
});

test('nir.cfl and 8 garbage bytes keep the generic error', () => {
  expect(() => parse(galactic('nir.cfl'))).toThrow(
    unsupported('Unsupported SPC file'),
  );
  expect(() => parse(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(
    unsupported('Unsupported SPC file: not an OLE2'),
  );
});

test('the empty buffer is unsupported', () => {
  expect(() => parse(new Uint8Array(0))).toThrow(
    unsupported('Unsupported SPC file: not an OLE2'),
  );
});

test('a UVProbe Kinetics .kin document is named in the error', () => {
  expect(() =>
    parse(read('__tests__/data/not-spc-uvprobe-kinetics.kin')),
  ).toThrow(unsupported('detected a Shimadzu UVProbe Kinetics (.kin)'));
});

test('an OLE2 document without UVProbe streams is rejected explicitly', () => {
  const bytes = buildOle({ '/Other/Stream': new Uint8Array([1, 2, 3]) });

  expect(() => parse(bytes)).toThrow(
    unsupported('OLE2 compound document without UVProbe spectrum streams'),
  );
});

test('an unreadable OLE2 document is unsupported', () => {
  const bytes = truncate(read('uvProbe/__tests__/data/uvprobe-ole.spc'), 600);

  expect(() => parse(bytes)).toThrow(
    unsupported('unreadable OLE2 compound document'),
  );
});

test('a Galactic file shorter than its header is TRUNCATED', () => {
  expect(() => parse(truncate(galactic('Ft-ir.spc'), 300))).toThrow(
    expect.objectContaining({
      code: 'TRUNCATED',
      message: 'Truncated SPC file: 300 bytes, the header needs 512',
    }),
  );
  expect(() => parse(truncate(galactic('m_ordz.spc'), 200))).toThrow(
    expect.objectContaining({ code: 'TRUNCATED' }),
  );
});

test('fewer than 32 bytes with a Galactic version byte are unsupported', () => {
  expect(() => parse(truncate(galactic('Ft-ir.spc'), 31))).toThrow(
    unsupported('Unsupported SPC file'),
  );
});

test('an implausible Galactic header is not taken as Galactic', () => {
  const tooManyPoints = patch(galactic('s_evenx.spc'), [
    { offset: 4, type: 'uint32', value: 1e6 },
  ]);
  const tooManySubfiles = patch(galactic('nir.spc'), [
    { offset: 24, type: 'uint32', value: 1e6 },
  ]);
  const notFinite = patch(galactic('s_evenx.spc'), [
    { offset: 8, type: 'float64', value: NaN },
  ]);
  const oldNoPoints = patch(galactic('m_ordz.spc'), [
    { offset: 4, type: 'float32', value: 0 },
  ]);

  expect(isGalactic(tooManyPoints)).toBe(false);
  expect(isGalactic(tooManySubfiles)).toBe(false);
  expect(isGalactic(notFinite)).toBe(false);
  expect(isGalactic(oldNoPoints)).toBe(false);
  expect(() => parse(tooManyPoints)).toThrow(unsupported('Unsupported SPC'));
});

test('real Galactic fixtures, including big-endian and XYXY, are detected', () => {
  for (const name of ['s_evenx.spc', 'm_xyxy.spc', 'ms.spc', 'm_ordz.spc']) {
    expect(isGalactic(galactic(name))).toBe(true);
  }

  const bigEndian = toBigEndian(galactic('nir.spc'));

  expect(isGalactic(bigEndian)).toBe(true);
});

test('flat files are detected from the fixed header', () => {
  const flat = parse(read('uvProbe/__tests__/data/uvprobe-flat.spc'));
  const shimadzu = parse(
    read('uvProbe/__tests__/data/corpus/shimadzu-flat-F80A20-1.SPC'),
  );
  const { x, y } = shimadzu.spectra[0]?.variables ?? {};

  expect(flat.meta.kind).toBe('flat');
  expect(flat.spectra[0]?.variables.x.data).toHaveLength(1501);
  expect(shimadzu.meta.kind).toBe('flat');
  expect(x?.data).toHaveLength(401);
  expect([x?.data[0], x?.data.at(-1)]).toStrictEqual([200, 600]);
  expect(y?.data[0]).toBeCloseTo(1.5437191724777222, 12);
  expect(y?.data.at(-1)).toBeCloseTo(0.007964478805661201, 12);
});

test('a flat file with one extra byte is not flat', () => {
  const flat = read('uvProbe/__tests__/data/uvprobe-flat.spc');
  const longer = new Uint8Array(flat.length + 1);
  longer.set(flat);

  expect(() => parse(longer)).toThrow(unsupported('Unsupported SPC file'));
});
