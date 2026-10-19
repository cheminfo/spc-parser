import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assert, expect, test } from 'vitest';

import { getLogValue, parse } from '../../index.ts';
import { parseLogText } from '../logText.ts';

import type { Patch } from './mutate.ts';
import { patch } from './mutate.ts';
import { toBigEndian } from './toBigEndian.ts';

const dataDirectory = join(import.meta.dirname, 'data');
const corpusDirectory = join(dataDirectory, 'corpus');

function readData(name: string): Uint8Array {
  return readFileSync(join(dataDirectory, name));
}

function readCorpus(name: string): Uint8Array {
  return readFileSync(join(corpusDirectory, name));
}

test('nir.spc: entries and per-subfile SUBFILEx metadata', () => {
  const result = parse(readData('nir.spc'));
  assert(result.logs);

  expect(result.logs.entries).toContainEqual({
    key: 'MODEL',
    value: 'NIRSYSTEMS 5000',
  });
  expect(result.logs.entries).toHaveLength(24);
  expect(result.logs.lines).toHaveLength(24);
  expect(result.spectra).toHaveLength(20);

  for (let k = 0; k < result.spectra.length; k++) {
    expect(result.spectra[k]?.meta?.title).toBe(String(k + 1));
    expect(result.spectra[k]?.meta?.date).toBe('1995-05-03T09:29:44.000');
  }
});

test('DRUG_SAMPLE_PEAKS: history, sections and entries', () => {
  const logs = parse(readCorpus('DRUG_SAMPLE_PEAKS.SPC')).logs;
  assert(logs);

  expect(logs.history.map((entry) => entry.letter)).toStrictEqual([
    'W',
    'I',
    'T',
    'W',
  ]);
  expect(logs.history.map((entry) => entry.program)).toStrictEqual([
    'FILEINFO.AB',
    'GCMS.AB',
    'GCMS.AB',
    'FILEINFO.AB',
  ]);
  expect(logs.history[0]).toStrictEqual({
    date: '1999-10-14T14:10:00.000',
    letter: 'W',
    description: 'Modified Date/Time',
    program: 'FILEINFO.AB',
    user: 'brigitte',
  });
  expect(logs.entries).toStrictEqual([
    { key: 'Version', value: '5.22', section: 'FILEINFO' },
    { key: 'Version', value: '1.10', section: 'GC-MS' },
    { key: 'Original File', value: 'drug sample.spc', section: 'GC-MS' },
    { key: 'Version', value: '6.00', section: 'FILEINFO' },
  ]);
});

test('kaiser-ebroAVII: duplicate keys, raw decimal commas, case-insensitive lookup', () => {
  const logs = parse(readCorpus('kaiser-ebroAVII.spc')).logs;
  assert(logs);

  expect(logs.entries.filter((entry) => entry.key === 'Comment')).toStrictEqual(
    [
      { key: 'Comment', value: '<None>' },
      { key: 'Comment', value: '' },
    ],
  );
  expect(getLogValue(logs, 'Temperature')).toBe('-85,50');
  expect(getLogValue(logs, 'stage_x_position')).toBe('360');
  expect(getLogValue(logs, 'no_such_key')).toBeUndefined();
  expect(getLogValue(null, 'Temperature')).toBeUndefined();
});

test('LabRam-2: LF CR lines and a windows-1252 key', () => {
  const logs = parse(readCorpus('LabRam-2.spc')).logs;
  assert(logs);

  expect(logs.lines).toHaveLength(34);
  expect(logs.lines[0]).toBe('ACQ. TIME (S) =');
  expect(logs.entries).toContainEqual({
    key: 'RANGE (CM-¹)',
    value: '399...3800',
  });
});

test('Essential FTIR audit lines without a letter', () => {
  const logs = parse(readCorpus('essential-ftir-utf8-memo.SPC')).logs;
  assert(logs);

  expect(logs.history).toStrictEqual([
    {
      date: '2022-08-13T14:56:00.000',
      description: 'EDIT TITLE',
      user: 'Aleksandra Lisowska-Gaczorek',
    },
    {
      date: '2022-08-13T16:42:00.000',
      description: 'FILE SAVE',
      user: 'Aleksandra Lisowska-Gaczorek',
    },
    {
      date: '2022-08-13T16:43:00.000',
      description: 'FILE SAVE',
      user: 'Aleksandra Lisowska-Gaczorek',
    },
  ]);
});

test('NMR imaginary part from the log binary area', () => {
  const fid = parse(readData('NMR_FID.SPC')).logs;
  const spectrum = parse(readData('NMR_SPC.SPC'), { sortX: false }).logs;

  expect(fid?.imaginary).toHaveLength(16384);
  expect(spectrum?.imaginary).toHaveLength(32768);
  expect(Array.from(spectrum?.imaginary?.subarray(0, 4) ?? [])).toStrictEqual([
    246034, 210400, 191979, 194429,
  ]);
  expect(parse(readData('nir.spc')).logs?.imaginary).toBeUndefined();
});

test('the imaginary part of a sorted decreasing-X spectrum follows y', () => {
  const fileOrder = parse(readData('NMR_SPC.SPC'), { sortX: false });
  const sorted = parse(readData('NMR_SPC.SPC'));
  const expected = fileOrder.logs?.imaginary?.toReversed();

  expect(sorted.meta).toHaveProperty('xDirection', 'decreasing');
  expect(sorted.logs?.imaginary).toStrictEqual(expected);
  expect(sorted.spectra[0]?.variables.y.data).toStrictEqual(
    fileOrder.spectra[0]?.variables.y.data.toReversed(),
  );
});

test('SPC_REAL=TRUE disables the imaginary part', () => {
  // NMR_SPC.SPC with its first log line INSTRUM=drx400 overwritten by SPC_REAL=TRUE.
  const bytes = readData('NMR_SPC.SPC');
  const logOffset = new DataView(bytes.buffer, bytes.byteOffset).getUint32(
    248,
    true,
  );
  const textStart = logOffset + 131136;
  const patched = bytes.slice();
  patched.set(new TextEncoder().encode('SPC_REAL=TRUE\r\n'), textStart);
  const logs = parse(patched).logs;

  expect(getLogValue(logs, 'SPC_REAL')).toBe('TRUE');
  expect(logs?.imaginary).toBeUndefined();
});

test('the imaginary part honours big-endian files', () => {
  // NMR_FID.SPC converted to 0x4C, with the float32 binary log area swapped too.
  const bytes = readData('NMR_FID.SPC');
  const little = parse(bytes).logs?.imaginary;
  assert(little);
  const logOffset = new DataView(bytes.buffer, bytes.byteOffset).getUint32(
    248,
    true,
  );
  const patches: Patch[] = [];
  for (let i = 0; i < little.length; i++) {
    patches.push({
      offset: logOffset + 64 + i * 4,
      type: 'float32',
      value: little[i] as number,
      littleEndian: false,
    });
  }
  const logs = parse(patch(toBigEndian(bytes), patches)).logs;

  expect(logs?.imaginary).toStrictEqual(little);
});

test('parseLogText: sections, two-digit year history and non-entries', () => {
  const text = [
    '[SCAN]',
    'A = 1 = 2',
    '= no key',
    'free text',
    '99/01/02 03:04  C = Cut',
    '',
    '[END SCAN]',
    'B=',
  ].join('\n\r');

  expect(parseLogText(text)).toStrictEqual({
    lines: [
      '[SCAN]',
      'A = 1 = 2',
      '= no key',
      'free text',
      '99/01/02 03:04  C = Cut',
      '',
      '[END SCAN]',
      'B=',
    ],
    entries: [
      { key: 'A', value: '1 = 2', section: 'SCAN' },
      { key: 'B', value: '' },
    ],
    history: [
      {
        date: '1999-01-02T03:04:00.000',
        letter: 'C',
        description: 'Cut',
      },
    ],
  });
  expect(parseLogText('')).toStrictEqual({
    lines: [],
    entries: [],
    history: [],
  });
  expect(parseLogText('12/01/02 03:04').history).toStrictEqual([
    { date: '2012-01-02T03:04:00.000', description: '' },
  ]);
});

test('SUBFILEx values that cannot be applied are ignored', () => {
  // nir.spc with SUBFILE1's month patched to 0 and SUBFILE2's label emptied.
  const bytes = readData('nir.spc');
  const text = new TextDecoder('latin1').decode(bytes);
  const patched = bytes.slice();
  const encoder = new TextEncoder();
  patched.set(
    encoder.encode('SUBFILE1 = 0/3/1995'),
    text.indexOf('SUBFILE1 = 5/3/1995'),
  );
  patched.set(encoder.encode('"  '), text.indexOf('"2 '));
  const result = parse(patched);

  expect(result.spectra[0]?.meta?.date).toBeUndefined();
  expect(result.spectra[0]?.meta?.title).toBe('1');
  expect(result.spectra[1]?.meta?.date).toBe('1995-05-03T09:29:44.000');
  expect(result.spectra[1]?.meta?.title).toBeUndefined();
});
