import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  xMinMaxValues,
  xSum,
  xyInterpolateLinear,
  xySortX,
} from 'ml-spectra-processing';
import { expect, test } from 'vitest';
import { parseXY } from 'xy-parser';

import { parse } from '../../parse.ts';
import type { TheNewHeader } from '../fileHeader.ts';
import { guessSpectraType } from '../utility/guessSpectraType.ts';

const dataDir = join(import.meta.dirname, 'data');

const result = parse(readFileSync(join(dataDir, 'raman-caco3.spc')));

/**
 * WiRE writes the SPC on an evenly spaced wavenumber grid, while the `.txt`
 * export keeps the native, unevenly spaced one, so the two are only comparable
 * once the reference is interpolated onto the SPC grid.
 */
const reference = xySortX(
  parseXY(readFileSync(join(dataDir, 'raman-caco3-reference.txt'))),
);

test('header of the WiRE Raman export', () => {
  const meta = result.meta as TheNewHeader;

  expect(meta.kind).toBe('new');
  expect(meta.fileVersion).toBe(0x4b);
  expect(meta.experimentType).toBe(
    'Raman Spectrum (Usually Diode Array, CCD, etc. use SPCFTIR for FT-Raman.)',
  );
  expect(meta.xUnitsType).toBe('Raman Shift (cm-1)');
  expect(meta.yUnitsType).toBe('Counts');
  expect(meta.numberPoints).toBe(1015);
  expect(meta.spectra).toBe(1);
  expect(meta.startingX).toBe(1318.962890625);
  expect(meta.endingX).toBe(60.44921875);
  expect(meta.memo).toBe('Single scan measurement');
  expect(meta.parameters.xy).toBe(false);
  expect(meta.parameters.xyxy).toBe(false);
  expect(meta.parameters.multiFile).toBe(false);
  expect(guessSpectraType(meta)).toBe('raman');
});

test('date is decoded from the MS-DOS layout WiRE writes', () => {
  const meta = result.meta as TheNewHeader;

  // The log block reports the same instant as 17/08/2026 15:24:20 local time.
  expect(meta.date).toBe('2026-08-17T13:24:20.000Z');
});

test('acquisition parameters from the log block', () => {
  const { text } = result.logs as { text: string };

  expect(text).toContain('Measurement_type=SingleScan');
  expect(text).toContain('Laser=Laser: 532nm_Raman');
  expect(text).toContain('Grating_grooves=Grating: 2400 l/mm INSTALLED (Vis)');
  expect(text).toContain('Accumulations: 2');
  expect(text).toContain('Exposure_time=Time: 60100');
});

test('spectrum is on an evenly spaced wavenumber grid', () => {
  expect(result.spectra).toHaveLength(1);

  const { x, y } = result.spectra[0].variables;

  expect(x.label).toBe('Raman Shift');
  expect(x.units).toBe('cm-1');
  expect(x.isDependent).toBe(false);
  expect(y.label).toBe('Counts');
  expect(y.isDependent).toBe(true);
  expect(x.data).toHaveLength(1015);
  expect(y.data).toHaveLength(1015);

  expect(x.data[0]).toBe(60.44921875);
  expect(x.data.at(-1)).toBe(1318.962890625);

  const step = x.data[1] - x.data[0];
  let maxStepError = 0;
  for (let i = 1; i < x.data.length; i++) {
    maxStepError = Math.max(
      maxStepError,
      Math.abs(x.data[i] - x.data[i - 1] - step),
    );
  }

  expect(maxStepError).toBeLessThan(1e-9);
});

test('intensity statistics', () => {
  const { y } = result.spectra[0].variables;
  const { min, max } = xMinMaxValues(y.data);

  expect(min).toBe(8048.451171875);
  expect(max).toBe(168107.125);
  expect(xSum(y.data)).toBeCloseTo(22112721.4697, 3);
});

test('matches the reference text export', () => {
  const { x, y } = result.spectra[0].variables;

  expect(reference.x).toHaveLength(1015);
  expect(reference.x[0]).toBe(60.449219);
  expect(reference.x.at(-1)).toBe(1318.962891);

  const interpolated = xyInterpolateLinear(reference, x.data);
  const spc = xMinMaxValues(y.data);
  const txt = xMinMaxValues(interpolated);

  expect(spc.min / txt.min).toBeCloseTo(1, 6);
  expect(spc.max / txt.max).toBeCloseTo(1, 5);
  expect(xSum(y.data) / xSum(interpolated)).toBeCloseTo(1, 6);

  let maxError = 0;
  for (let i = 0; i < y.data.length; i++) {
    maxError = Math.max(maxError, Math.abs(y.data[i] - interpolated[i]));
  }

  expect(maxError / spc.max).toBeLessThan(1e-5);
});
