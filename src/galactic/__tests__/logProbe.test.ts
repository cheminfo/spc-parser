import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../utility/naiveDate.ts';

import { append, patch, truncate } from './mutate.ts';
import { toBigEndian } from './toBigEndian.ts';

const dataDirectory = join(import.meta.dirname, 'data');

function readData(name: string): Uint8Array {
  return readFileSync(join(dataDirectory, name));
}

function getLogOffset(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(248, true);
}

test('nir.spc with flogoff zeroed: the log is recovered after the data', () => {
  // nir.spc with bytes 248..251 (flogoff) set to 0.
  const nir = readData('nir.spc');
  const original = parse(nir).logs;
  assert(original);
  const logOffset = getLogOffset(nir);
  const result = parse(patch(nir, [{ offset: 248, type: 'uint32', value: 0 }]));

  expect(result.logs?.text).toBe(original.text);
  expect(result.logs?.entries).toStrictEqual(original.entries);
  expect(result.spectra[3]?.meta?.title).toBe('4');
  expect(result.warnings).toStrictEqual([
    `Log block found at offset ${logOffset} although flogoff is 0; recovered`,
    NAIVE_DATE_WARNING,
  ]);
});

test('the recovery honours big-endian files', () => {
  // nir.spc converted to 0x4C, then flogoff set to 0.
  const nir = readData('nir.spc');
  const bytes = patch(toBigEndian(nir), [
    { offset: 248, type: 'uint32', value: 0 },
  ]);

  expect(parse(bytes).logs?.text).toBe(parse(nir).logs?.text);
});

test('the Wasatch SPyC_Writer layout with 8-byte fields is recovered', () => {
  // nir.spc without its log, then a Linux SPyC_Writer log block: four 8-byte
  // fields (size, memory size, text offset, binary size), a 4-byte disk size,
  // 44 reserved bytes, then text with no terminating NUL; flogoff stays 0.
  const nir = readData('nir.spc');
  const logOffset = getLogOffset(nir);
  const text = new TextEncoder().encode('Laser Power = 50 mW\r\nµ = UTF-8');
  const header = new Uint8Array(80);
  const view = new DataView(header.buffer);
  view.setUint32(0, 64 + text.length, true);
  view.setUint32(8, 4096, true);
  view.setUint32(16, 64, true);
  const withoutLog = patch(truncate(nir, logOffset), [
    { offset: 248, type: 'uint32', value: 0 },
  ]);
  const result = parse(append(append(withoutLog, header), text));

  expect(result.logs?.text).toBe('Laser Power = 50 mW\r\nµ = UTF-8');
  expect(result.logs?.meta).toStrictEqual({
    size: 64 + text.length,
    memorySize: 4096,
    textOffset: 64,
    binarySize: 0,
    diskArea: 0,
    reserved: '',
  });
  expect(result.warnings).toStrictEqual([
    `Log block with 8-byte fields found at offset ${logOffset} although flogoff is 0; recovered`,
  ]);
});

test('no log is invented for files without one', () => {
  for (const name of ['ms.spc', 's_evenx.spc', 'm_xyxy.spc', 'm_ordz.spc']) {
    // The zone is named so that only log warnings reach the list: these files
    // disagree on whether they carry a date at all.
    const result = parse(readData(name), { timeZone: 'UTC' });

    expect(result.logs).toBeNull();
    expect(result.warnings).toStrictEqual([]);
  }
});

test('trailing bytes that are not a log are ignored', () => {
  // s_evenx.spc followed by 100 bytes: a plausible 4-byte header whose text
  // holds a control character, and nothing that fits as the 8-byte layout.
  const tail = new Uint8Array(100);
  const view = new DataView(tail.buffer);
  view.setUint32(0, 70, true);
  view.setUint32(8, 64, true);
  tail[64] = 0x41;
  tail[65] = 0x01;
  const sEvenX = readData('s_evenx.spc');
  const result = parse(append(sEvenX, tail));

  expect(result.logs).toBeNull();
  expect(result.warnings).toStrictEqual([]);

  // Only blanks as text.
  tail[64] = 0x20;
  tail[65] = 0x0d;

  const blanks = append(sEvenX, tail);

  expect(parse(blanks).logs).toBeNull();

  // A non-zero high word rules out the 8-byte layout.
  const wide = new Uint8Array(100);
  new DataView(wide.buffer).setUint32(4, 1, true);

  const highWord = append(sEvenX, wide);

  expect(parse(highWord).logs).toBeNull();
});
