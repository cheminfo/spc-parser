import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { xSum } from 'ml-spectra-processing';
import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import { createParseContext } from '../../utility/ParseContext.ts';
import { NAIVE_DATE_WARNING } from '../../utility/naiveDate.ts';
import { newDataBlock } from '../dataBlock/newDataBlock.ts';
import type { TheNewHeader } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';
import { readLogBlock } from '../logBlock.ts';

import { append, patch, patchBytes, truncate } from './mutate.ts';

const dataDirectory = join(import.meta.dirname, 'data');
const corpusDirectory = join(dataDirectory, 'corpus');

function readData(name: string): Uint8Array {
  return readFileSync(join(dataDirectory, name));
}

function readCorpus(name: string): Uint8Array {
  return readFileSync(join(corpusDirectory, name));
}

function getLogOffset(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(248, true);
}

test('Log block parsing', () => {
  const nmrBuffer = new IOBuffer(readData('NMR_SPC.SPC'));
  const nmrMain = fileHeader(nmrBuffer) as TheNewHeader;
  newDataBlock(nmrBuffer, nmrMain);
  const nmrLog = readLogBlock(
    nmrBuffer,
    nmrMain.logOffset,
    createParseContext(),
  );
  assert(nmrLog);

  expect(nmrLog.binary).toHaveLength(nmrLog.meta.binarySize);
  expect(nmrLog.binary).toHaveLength(131072);
  expect(nmrLog.disk).toHaveLength(0);
  expect(nmrLog.text).toMatch(/^INSTRUM=drx400[^]*NMREND=NMREND$/);
});

test('DRUG_SAMPLE_PEAKS: the log is read at flogoff, after the directory', () => {
  const result = parse(readCorpus('DRUG_SAMPLE_PEAKS.SPC'));

  expect(result.spectra).toHaveLength(6);

  let points = 0;
  let sumY = 0;
  for (const spectrum of result.spectra) {
    points += spectrum.variables.x.data.length;
    sumY += xSum(spectrum.variables.y.data);
  }

  expect(points).toBe(1072);
  expect(sumY).toBe(54426260);
  expect(result.logs?.meta).toStrictEqual({
    size: 1095,
    memorySize: 4096,
    textOffset: 64,
    binarySize: 0,
    diskArea: 0,
    reserved: '',
  });
  expect(result.logs?.text.startsWith('[FILEINFO]')).toBe(true);
  expect(result.logs?.text.endsWith('[END FILEINFO]')).toBe(true);
  expect(result.warnings).toStrictEqual([NAIVE_DATE_WARNING]);
});

test('IG_BKGND: a gap between the data and flogoff is skipped', () => {
  const result = parse(readCorpus('IG_BKGND.SPC'));
  const spectrum = result.spectra[0];
  assert(spectrum);
  const { x, y } = spectrum.variables;

  expect(x.data).toHaveLength(4096);
  expect(x.data[0]).toBe(0);
  expect(x.data.at(-1)).toBeCloseTo(7900.41175, 5);
  expect(xSum(y.data)).toBeCloseTo(4716.72161, 4);
  expect(result.logs?.meta.size).toBe(561);
  expect(
    result.logs?.text.startsWith(
      String.raw`Original_Sample_Name= D:\GRAMS\DATA\BACKIG.SPC`,
    ),
  ).toBe(true);
  expect(result.logs?.text.endsWith('Ending_Wavenumber= 400')).toBe(true);
});

test('test_input: a log that ends past the end of the file is clamped', () => {
  const result = parse(readCorpus('test_input.spc'));
  const spectrum = result.spectra[0];
  assert(spectrum);
  const { x, y } = spectrum.variables;

  expect(x.data).toHaveLength(3839);
  expect(x.data[0]).toBeCloseTo(399.644208, 5);
  expect(x.data.at(-1)).toBeCloseTo(6367.871716, 5);
  expect(xSum(y.data)).toBeCloseTo(12212874.1, 0);
  expect(result.logs?.meta.size).toBe(977);
  expect(result.logs?.text).toHaveLength(738);
  expect(result.logs?.text.endsWith('[END FILE SAVE]')).toBe(true);
  expect(result.warnings).toStrictEqual([
    'fdate 0x7b1cfc80 is not a valid date; date ignored',
    'Log block ends 172 bytes beyond the end of the file; truncated',
  ]);
  expect(() => parse(readCorpus('test_input.spc'), { strict: true })).toThrow(
    expect.objectContaining({ code: 'STRICT' }),
  );
});

test('KRY3: the garbage after the terminating NUL is dropped', () => {
  const text = parse(readCorpus('KRY3.SPC')).logs?.text;

  expect(text?.endsWith('Multigroups=0')).toBe(true);
});

test('windows-1252 characters in the log are decoded', () => {
  expect(parse(readData('raman-caco3.spc')).logs?.text).toContain(
    'Slit_opening=65µm',
  );
  expect(parse(readCorpus('LabRam-2.spc')).logs?.text).toContain(
    'RANGE (CM-¹)',
  );
});

test('wplanes: a log with only a disk area', () => {
  const logs = parse(readCorpus('wplanes.spc')).logs;
  assert(logs);

  expect(logs.meta.textOffset).toBe(5948);
  expect(logs.meta.size).toBe(5948);
  expect(logs.text).toBe('');
  expect(logs.disk).toHaveLength(5884);
  expect(logs.binary).toHaveLength(0);
  expect(logs.meta.reserved).toBe('*'.repeat(44));
});

test('old-format files have logs: null', () => {
  expect(parse(readCorpus('DEMO_3D.SPC')).logs).toBeNull();
});

test('a log header cut by the end of the file is ignored', () => {
  // nir.spc cut 10 bytes after flogoff: the 64-byte LOGSTC does not fit.
  const nir = readData('nir.spc');
  const bytes = truncate(nir, getLogOffset(nir) + 10);
  const result = parse(bytes);

  expect(result.logs).toBeNull();
  expect(result.warnings).toStrictEqual([
    `Log block header at offset ${getLogOffset(nir)} is cut by the end of the file (${bytes.length} bytes); log ignored`,
  ]);
});

test('a text offset inside the log header is moved after it', () => {
  // nir.spc with logtxto patched from 64 to 10.
  const nir = readData('nir.spc');
  const logOffset = getLogOffset(nir);
  const bytes = patch(nir, [
    { offset: logOffset + 8, type: 'uint32', value: 10 },
  ]);
  const result = parse(bytes);

  expect(result.logs?.text).toBe(parse(nir).logs?.text);
  expect(result.warnings).toStrictEqual([
    'Log text offset 10 points inside the log header; text read from offset 64',
    NAIVE_DATE_WARNING,
  ]);
});

test('a text offset past logsizd reads the text up to the end of the file', () => {
  // nir.spc with logsizd patched from 1053 to 20: the text still ends at its NUL.
  const nir = readData('nir.spc');
  const logOffset = getLogOffset(nir);
  const bytes = patch(nir, [{ offset: logOffset, type: 'uint32', value: 20 }]);
  const result = parse(bytes);

  expect(result.logs?.text).toBe(parse(nir).logs?.text);
  expect(result.warnings).toStrictEqual([
    'Log text offset 64 is beyond the log block size 20; text read up to the end of the file',
    NAIVE_DATE_WARNING,
  ]);
});

test('key=value segments after the terminating NUL are appended', () => {
  // nir.spc with its text NUL followed by a key=value segment, then two garbage segments.
  const nir = readData('nir.spc');
  const original = parse(nir).logs;
  assert(original);
  const logOffset = getLogOffset(nir);
  const nulPosition = nir.indexOf(0, logOffset + 64);
  const tail = new TextEncoder().encode(
    '\0EXTRA = 1\r\n \r\nOTHER=2\0garbage 92\0A=\u{1}\0',
  );
  const extended = append(truncate(nir, nulPosition), tail);
  const bytes = patch(extended, [
    { offset: logOffset, type: 'uint32', value: extended.length - logOffset },
  ]);
  const result = parse(bytes);

  expect(result.logs?.text).toBe(
    `${original.text}\r\nEXTRA = 1\r\n \r\nOTHER=2`,
  );
  expect(result.warnings).toStrictEqual([
    'Log text holds 1 key=value segment(s) after its terminating NUL; appended',
    NAIVE_DATE_WARNING,
  ]);
});

test('an empty text followed by a key=value segment', () => {
  // nir.spc with the first text byte replaced by a NUL.
  const nir = readData('nir.spc');
  const logOffset = getLogOffset(nir);
  const bytes = patchBytes(nir, logOffset + 64, new Uint8Array([0]));
  const text = parse(bytes).logs?.text;

  expect(text?.startsWith('ODEL = NIRSYSTEMS 5000')).toBe(true);
});

test('an unreadable log becomes a warning, and throws in strict mode', () => {
  // raman-caco3's log is not valid UTF-8, so the unknown fallback encoding
  // throws. createParseContext rejects it, so it is set afterwards.
  const buffer = new IOBuffer(readData('raman-caco3.spc'));
  const header = fileHeader(buffer) as TheNewHeader;
  const context = { ...createParseContext(), encoding: 'not-an-encoding' };

  expect(readLogBlock(buffer, header.logOffset, context)).toBeNull();
  expect(context.warnings).toHaveLength(1);
  expect(context.warnings[0]).toMatch(/^Log block could not be read \(/);

  const strict = {
    ...createParseContext({ strict: true }),
    encoding: 'not-an-encoding',
  };

  expect(() => readLogBlock(buffer, header.logOffset, strict)).toThrow(
    RangeError,
  );
});
