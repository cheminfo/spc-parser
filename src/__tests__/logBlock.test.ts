import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IOBuffer } from 'iobuffer';
import { beforeAll, expect, test } from 'vitest';

import { newDataBlock } from '../dataBlock/newDataBlock.ts';
import type { TheNewHeader } from '../fileHeader.ts';
import { fileHeader } from '../fileHeader.ts';
import type { LogBlock } from '../logBlock.ts';
import { readLogBlock } from '../logBlock.ts';

let nmrLog: LogBlock;

beforeAll(() => {
  const pathFiles = join(import.meta.dirname, 'data');
  const nmrBuffer = new IOBuffer(readFileSync(join(pathFiles, 'NMR_SPC.SPC')));
  const nmrMain = fileHeader(nmrBuffer) as TheNewHeader;
  newDataBlock(nmrBuffer, nmrMain);
  nmrLog = readLogBlock(nmrBuffer, nmrMain.logOffset);
});

test('Log block parsing', () => {
  expect(nmrLog.data).toHaveLength(nmrLog.meta.binarySize);
  expect(nmrLog.text).toMatch(/^INSTRUM=drx400[^]*NMREND=NMREND[^]\n$/);
});
