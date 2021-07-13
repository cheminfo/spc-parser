import { readDataBlock } from '../dataBlock';

import { mainHeader } from '../mainHeader';

const fs = require('fs');

const { IOBuffer } = require('iobuffer');

const pathFiles = `${__dirname}/files/`;

const mXyxyBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}m_xyxy.spc`));
const mXyxy = readDataBlock(mXyxyBuffer, mainHeader(mXyxyBuffer));
const ramanBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}RAMAN.SPC`));
const raman = readDataBlock(ramanBuffer, mainHeader(ramanBuffer));
test('data block parsing test', () => {
  expect(mXyxy).toHaveLength(512);
  expect(raman).toHaveLength(1);
});
