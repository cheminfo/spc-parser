import { expect, test } from 'vitest';

import { createParseContext } from '../ParseContext.ts';
import { SpcParserError } from '../SpcParserError.ts';

test('warnings are collected by default', () => {
  const context = createParseContext();
  context.warn('log block clamped');

  expect(context.warnings).toStrictEqual(['log block clamped']);
  expect(context.encoding).toBe('windows-1252');
  expect(context.strict).toBe(false);
});

test('a warning throws a STRICT SpcParserError in strict mode', () => {
  const context = createParseContext({ strict: true, encoding: 'gbk' });

  expect(context.encoding).toBe('gbk');

  let error: unknown;
  try {
    context.warn('log block clamped');
  } catch (error_) {
    error = error_;
  }

  expect(error).toBeInstanceOf(SpcParserError);
  expect((error as SpcParserError).code).toBe('STRICT');
  expect((error as SpcParserError).message).toBe('log block clamped');
  expect(context.warnings).toStrictEqual([]);
});

test('an unsupported encoding option throws a TypeError', () => {
  expect(() => createParseContext({ encoding: 'nope' })).toThrow(
    new TypeError('Unsupported encoding option: "nope"'),
  );
});
