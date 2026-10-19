import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import { resolveAxes, splitLabel } from '../axes.ts';
import type { Header } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';

import { patch, patchBytes } from './mutate.ts';

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(import.meta.dirname, 'data', name)));
}

function header(bytes: Uint8Array): Header {
  return fileHeader(new IOBuffer(bytes));
}

function variables(bytes: Uint8Array) {
  const spectrum = parse(bytes).spectra[0];
  return {
    x: {
      label: spectrum?.variables.x.label,
      units: spectrum?.variables.x.units,
    },
    y: {
      label: spectrum?.variables.y.label,
      units: spectrum?.variables.y.units,
    },
  };
}

test('TALABS labels override the Y code', () => {
  expect(variables(read('RAMAN.SPC')).y).toStrictEqual({
    label: 'Rmn Intensity',
    units: '',
  });
  expect(variables(read('NDR0002.SPC'))).toStrictEqual({
    x: { label: 'Raman Shift', units: 'cm-1' },
    y: { label: 'Raman Intensity', units: '' },
  });
  expect(variables(read('m_xyxy.spc')).y.label).toBe('Abundance');
  expect(variables(read('ms.spc')).y.label).toBe('Abundance');
});

test('TALABS labels with units on an arbitrary X code', () => {
  const meta = header(read('corpus/KRY3.SPC'));

  expect(meta.axes.x).toStrictEqual({
    label: 'Wavenumber',
    units: 'cm-1',
    code: 0,
    custom: true,
  });
  expect(meta.axes.y).toStrictEqual({
    label: 'Arbitrary Intensity',
    units: 'arb',
    code: 0,
    custom: true,
  });
  expect(meta.customLabelsApplied).toBe(true);
});

test('a TALABS label that is the unit of its code', () => {
  const meta = header(read('corpus/csiro-example.spc'));

  expect(meta.axes.x).toStrictEqual({
    label: 'Wavenumber',
    units: 'cm-1',
    code: 1,
    custom: true,
  });
  expect(meta.axes.y.label).toBe('A');
});

test('TALABS with empty labels uses the codes', () => {
  const meta = header(read('corpus/DRUG_SAMPLE_PEAKS.SPC'));

  expect(meta.parameters.customAxisLabels).toBe(true);
  expect(meta.axes.x).toMatchObject({ label: 'Mass', units: 'm/z' });
  expect(meta.axes.y).toMatchObject({ label: 'Arbitrary Intensity' });
  expect(meta.customLabelsApplied).toBe(false);
});

test('a clean label is used for an arbitrary code without TALABS', () => {
  const meta = header(read('s_xy.spc'));

  expect(meta.parameters.customAxisLabels).toBe(false);
  expect(meta.customLabels.y).toBe('Abundance');
  expect(meta.axes.y).toMatchObject({ label: 'Abundance', custom: true });
  expect(meta.customLabelsApplied).toBe(true);

  // BC408 has binary garbage in fcatxt and non-zero codes.
  const andor = header(read('corpus/BC408_5mmHorizontal.spc'));

  expect(andor.customLabelsApplied).toBe(false);
  expect(andor.axes.y.label).toBe('Counts');
});

test('label and units of the codes', () => {
  expect(variables(read('4d_map.spc')).y).toStrictEqual({
    label: 'Log(1/R)',
    units: '',
  });
  expect(variables(read('m_xyxy.spc')).x).toStrictEqual({
    label: 'Mass',
    units: 'm/z',
  });
  expect(variables(read('Ft-ir.spc'))).toStrictEqual({
    x: { label: 'Wavenumber', units: 'cm-1' },
    y: { label: 'Transmission', units: '' },
  });
});

test('raw codes and experiment code 6', () => {
  const meta = header(read('corpus/viavi-JDSU_Phar_Rotate_S06.spc'));

  expect(meta.codes).toStrictEqual({
    experiment: 6,
    x: 3,
    y: 2,
    z: 0,
    w: 0,
    post: 0,
    processing: 0,
  });
  expect(meta.kind === 'new' && meta.experimentType).toBe('Unknown (code 6)');
});

test('ZTEXTL in a new-format file', () => {
  // s_evenx with fztype (offset 30) = 15 and fcatxt (offset 218) KeV\0Counts\0.
  const labels = new TextEncoder().encode('KeV\0Counts\0');
  const bytes = patchBytes(
    patch(read('s_evenx.spc'), [{ offset: 30, type: 'uint8', value: 15 }]),
    218,
    labels,
  );
  const meta = header(bytes);

  expect(meta.axes.x).toMatchObject({ label: 'KeV', units: '' });
  expect(meta.axes.y).toMatchObject({ label: 'Counts', units: '' });
  expect(meta.axes.z).toStrictEqual({
    label: 'Arbitrary Z',
    units: '',
    code: 15,
    custom: false,
  });
  expect(variables(bytes).x.label).toBe('KeV');
});

test('ZTEXTL in the Z nibble of an old-format file', () => {
  // DEMO_3D with the oyear (offset 18) Z nibble set to 15 and ocatxt
  // (offset 194) Wavelength\0Abs\0Time (min).
  const labels = new TextEncoder().encode('Wavelength\0Abs\0Time (min)');
  const bytes = patchBytes(
    patch(read('corpus/DEMO_3D.SPC'), [
      { offset: 18, type: 'uint16', value: 0xf7cd },
    ]),
    194,
    labels,
  );
  const meta = header(bytes);

  expect(meta.axes.x).toMatchObject({ label: 'Wavelength', units: '' });
  expect(meta.axes.y).toMatchObject({ label: 'Abs', units: '' });
  expect(meta.axes.z).toMatchObject({ label: 'Time', units: 'min' });
  expect(meta.date).toBe('1997-03-09T09:14:00.000');
});

test('splitLabel', () => {
  expect(splitLabel('Wavenumber (cm-1)')).toStrictEqual({
    label: 'Wavenumber',
    units: 'cm-1',
  });
  expect(splitLabel('Temperature [K]')).toStrictEqual({
    label: 'Temperature',
    units: 'K',
  });
  expect(splitLabel('(arb)')).toStrictEqual({ label: '(arb)', units: '' });
  expect(splitLabel('Abundance')).toStrictEqual({
    label: 'Abundance',
    units: '',
  });
});

test('a custom label that is only units keeps the label of the code', () => {
  const codes = {
    experiment: 0,
    x: 3,
    y: 0,
    z: 0,
    w: 0,
    post: 0,
    processing: 0,
  };
  const axes = resolveAxes(codes, { x: '[nm]', y: '(cps)', z: '' }, true);

  expect(axes.x).toStrictEqual({
    label: 'Nanometers',
    units: 'nm',
    code: 3,
    custom: true,
  });
  expect(axes.y).toStrictEqual({
    label: 'Arbitrary Intensity',
    units: 'cps',
    code: 0,
    custom: true,
  });
});
