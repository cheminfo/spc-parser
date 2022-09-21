import fs from 'fs';
import { join } from 'path';

import { IOBuffer } from 'iobuffer';

import { readDataBlock } from '../dataBlock';
import { readLogBlock } from '../logBlock';
import { TheNewHeader, mainHeader } from '../mainHeader';

const pathFiles = join(__dirname, 'data');

const nmrBuffer = new IOBuffer(fs.readFileSync(join(pathFiles, 'NMR_SPC.SPC')));

const nmrMain = mainHeader(nmrBuffer) as TheNewHeader;
readDataBlock(nmrBuffer, nmrMain);
const nmrLog = readLogBlock(nmrBuffer, nmrMain.logOffset);
test('Log block parsing', () => {
  expect(nmrLog.data).toHaveLength(nmrLog.meta.binarySize);
  expect(nmrLog.text).toMatch(/^INSTRUM=drx400[^]*NMREND=NMREND[^]\n$/);
});
