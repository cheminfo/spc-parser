import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../parse.ts';
import { SpcParserError } from '../utility/SpcParserError.ts';

const galacticData = join(import.meta.dirname, '../galactic/__tests__/data');

/**
 * Loads `s_evenx.spc` with `flogoff` (bytes 248-251) moved past the end of the file.
 * @returns The patched file bytes.
 */
function readWithLogOffsetPastEnd(): Uint8Array {
  const bytes = new Uint8Array(readFileSync(join(galacticData, 's_evenx.spc')));
  new DataView(bytes.buffer).setUint32(248, bytes.length + 100, true);
  return bytes;
}

test('unrecognized bytes throw the detection guard', () => {
  const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

  expect(() => parse(garbage.buffer)).toThrow('Unsupported SPC file');
});

test('unrecognized bytes throw an UNSUPPORTED_FORMAT SpcParserError', () => {
  const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

  expect(() => parse(garbage)).toThrow(SpcParserError);
  expect(() => parse(garbage)).toThrow(
    expect.objectContaining({ code: 'UNSUPPORTED_FORMAT' }),
  );
});

test('warnings is an empty array for a clean file', () => {
  const result = parse(readFileSync(join(galacticData, 's_evenx.spc')));

  expect(result.warnings).toStrictEqual([]);
});

test('a log offset past the end of the file is reported as a warning', () => {
  const bytes = readWithLogOffsetPastEnd();
  const result = parse(bytes);

  expect(result.logs).toBeNull();
  expect(result.warnings).toStrictEqual([
    `Log block offset ${bytes.length + 100} is beyond the end of the file (${bytes.length} bytes); log ignored`,
  ]);
});

test('a warning throws a STRICT SpcParserError with strict: true', () => {
  const bytes = readWithLogOffsetPastEnd();

  expect(() => parse(bytes, { strict: true })).toThrow(
    expect.objectContaining({ name: 'SpcParserError', code: 'STRICT' }),
  );
});
