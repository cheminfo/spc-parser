import fs from 'fs';
import { join } from 'path';

import { IOBuffer } from 'iobuffer';

import { readNewDataBlock } from '../dataBlock';
import { TheNewHeader, fileHeader } from '../fileHeader';
import { readLogBlock } from '../logBlock';

const pathFiles = join(__dirname, 'data');

const nmrBuffer = new IOBuffer(fs.readFileSync(join(pathFiles, 'NMR_SPC.SPC')));

const nmrMain = fileHeader(nmrBuffer) as TheNewHeader;
readNewDataBlock(nmrBuffer, nmrMain);
const nmrLog = readLogBlock(nmrBuffer, nmrMain.logOffset);
test('Log block parsing', () => {
  expect(nmrLog.data).toHaveLength(nmrLog.meta.binarySize);
  expect(nmrLog.text).toMatch(/^INSTRUM=drx400[^]*NMREND=NMREND[^]\n$/);
});
