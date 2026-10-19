import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { expect, test } from 'vitest';

import { parse } from '../../../parse.ts';
import { createParseContext } from '../../../utility/ParseContext.ts';
import { NAIVE_DATE_WARNING } from '../../../utility/naiveDate.ts';
import { patch, truncate } from '../../__tests__/mutate.ts';
import type { TheNewHeader } from '../../fileHeader.ts';
import { fileHeader } from '../../fileHeader.ts';
import { newDataBlock } from '../newDataBlock.ts';

const dataDirectory = join(
  import.meta.dirname,
  '..',
  '..',
  '__tests__',
  'data',
);

/**
 * Loads a Galactic fixture.
 * @param name - file name, relative to the data folder.
 * @returns The file bytes.
 */
function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dataDirectory, name)));
}

/**
 * Reads the header and data block of a new-format file, without its log.
 * @param bytes - the file bytes.
 * @returns The header, the spectra and the warnings.
 */
function readData(bytes: Uint8Array) {
  const buffer = new IOBuffer(bytes);
  const header = fileHeader(buffer) as TheNewHeader;
  const context = createParseContext();
  const spectra = newDataBlock(buffer, header, context);
  return { header, spectra, warnings: context.warnings };
}

test('m_xyxy.spc: subfiles are read through the directory', () => {
  const result = parse(load('m_xyxy.spc'));
  // With fnpts 0 there is no directory and the subfiles are walked in order.
  const sequential = parse(
    patch(load('m_xyxy.spc'), [{ offset: 4, type: 'uint32', value: 0 }]),
  );
  const meta = result.meta as TheNewHeader;

  expect(meta.directoryOffset).toBe(43056);
  expect(meta.directory).toHaveLength(512);
  expect(meta.directory?.[0]).toMatchObject({ position: 42960, size: 96 });
  expect(result.spectra).toStrictEqual(sequential.spectra);
  expect(result.warnings).toStrictEqual([NAIVE_DATE_WARNING]);
  expect(sequential.meta).not.toHaveProperty('directory');
});

test('m_xyxy.spc: the stale copy of a relocated subfile is not read', () => {
  const original = parse(load('m_xyxy.spc'));
  const bytes = load('m_xyxy.spc');
  // Zero the stale Y values of subfile 0 at its sequential position.
  bytes.fill(0, 576, 592);
  const result = parse(bytes);

  expect(result.spectra).toStrictEqual(original.spectra);
});

test('DRUG_SAMPLE_PEAKS: the directory matches the sequential layout', () => {
  const bytes = load('corpus/DRUG_SAMPLE_PEAKS.SPC');
  const withDirectory = readData(bytes);
  const sequential = readData(
    patch(bytes, [{ offset: 4, type: 'uint32', value: 0 }]),
  );

  expect(withDirectory.header.directory).toHaveLength(
    withDirectory.header.spectra,
  );
  expect(withDirectory.spectra).toStrictEqual(sequential.spectra);
  expect(withDirectory.warnings).toStrictEqual([]);
});

test('ms.spc: an XYXY file without a directory is walked sequentially', () => {
  const result = parse(load('ms.spc'));

  expect(result.meta).not.toHaveProperty('directory');
  expect(result.spectra).toHaveLength(1);
  expect(result.spectra[0]?.variables.x.data).toHaveLength(128);
  expect(result.warnings).toStrictEqual([]);
});

test('a directory before the data area is ignored with a warning', () => {
  const original = parse(load('m_xyxy.spc'));
  const result = parse(
    patch(load('m_xyxy.spc'), [{ offset: 4, type: 'uint32', value: 100 }]),
  );

  expect(result.spectra).toStrictEqual(original.spectra);
  expect(result.warnings).toStrictEqual([
    'The subfile directory at offset 100 does not fit in the file; subfiles read sequentially',
    NAIVE_DATE_WARNING,
  ]);
});

test('a directory entry outside the file is ignored with a warning', () => {
  const result = parse(
    patch(load('m_xyxy.spc'), [
      { offset: 43056 + 12 * 3, type: 'uint32', value: 49190 },
    ]),
  );

  expect(result.meta).not.toHaveProperty('directory');
  expect(result.spectra).toHaveLength(512);
  expect(result.warnings).toStrictEqual([
    'Subfile directory entry 4 of 512 points outside the file (49190); subfiles read sequentially',
    NAIVE_DATE_WARNING,
  ]);
});

test('TXYXYS without TXVALS is ignored with a warning', () => {
  const original = parse(load('s_evenx.spc'));
  const bytes = load('s_evenx.spc');
  bytes[0] = (bytes[0] as number) | 0x40;
  const result = parse(bytes);

  expect(result.spectra[0]?.variables).toStrictEqual(
    original.spectra[0]?.variables,
  );
  expect(result.warnings).toStrictEqual([
    'The XYXY flag (TXYXYS) is set without TXVALS; it is ignored and the X values are shared',
  ]);
});

test('a doubled subnpts is halved when only half of it fits', () => {
  const original = parse(load('ms.spc'));
  // ms.spc holds one 128-point XYXY subfile (16-bit Y) ending at 1312; the
  // file is cut there and subnpts doubled as Wasatch ENLIGHTEN writes it.
  const bytes = patch(truncate(load('ms.spc'), 1312), [
    { offset: 512 + 16, type: 'uint32', value: 256 },
  ]);
  const result = parse(bytes);

  expect(result.spectra[0]?.variables).toStrictEqual(
    original.spectra[0]?.variables,
  );
  expect(result.spectra[0]?.meta).toMatchObject({ numberPoints: 256 });
  expect(result.warnings).toStrictEqual([
    'subnpts is twice the number of points stored in a subfile (as written by Wasatch ENLIGHTEN); half of it was used',
  ]);
});

test('a subfile cut short is truncated, not halved', () => {
  // 1244 bytes would hold half of the 128 points of ms.spc, but the halved
  // subfile would not end where the file does.
  expect(() => parse(truncate(load('ms.spc'), 1244))).toThrow(
    'Truncated SPC file: subfile 1 of 1 is incomplete',
  );
});

test('a directory entry pointing to an unreadable subfile falls back to the sequential walk', () => {
  const original = parse(load('m_xyxy.spc'));
  const result = parse(
    patch(load('m_xyxy.spc'), [
      { offset: 42960 + 16, type: 'uint32', value: 134217728 },
    ]),
  );

  expect(result.spectra).toHaveLength(512);
  expect(result.spectra[0]?.variables).toStrictEqual(
    original.spectra[0]?.variables,
  );
  expect(result.warnings).toStrictEqual([
    'Subfile directory entry 1 of 512 points to an unreadable subfile (42960); subfiles read sequentially',
    NAIVE_DATE_WARNING,
  ]);
});
