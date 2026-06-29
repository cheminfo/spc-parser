import { expect, test } from 'vitest';

import { parse } from '../parse.ts';

test('unrecognized bytes throw the detection guard', () => {
  const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

  expect(() => parse(garbage.buffer)).toThrow('Unsupported SPC file');
});
