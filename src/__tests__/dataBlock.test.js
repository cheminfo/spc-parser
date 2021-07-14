import { readDataBlock } from '../dataBlock';
import { mainHeader } from '../mainHeader';

const fs = require('fs');

const { IOBuffer } = require('iobuffer');

const pathFiles = `${__dirname}/files/`;

const mXyxyBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}m_xyxy.spc`));
const mXyxy = readDataBlock(mXyxyBuffer, mainHeader(mXyxyBuffer));
const ramanBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}RAMAN.SPC`));
const raman = readDataBlock(ramanBuffer, mainHeader(ramanBuffer));
const mOrdZBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}m_ordz.spc`));
const mOrdZ = readDataBlock(mOrdZBuffer, mainHeader(mOrdZBuffer));
const ftIrBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}Ft-ir.spc`));
const ftIr = readDataBlock(ftIrBuffer, mainHeader(ftIrBuffer));
test('data block parsing test', () => {
  expect(mXyxy).toHaveLength(512);
  expect(mOrdZ[0].y).toHaveLength(857);
  expect(ftIr).toHaveLength(1);
  //expect(mOrdZ[1].y[0]).toStrictEqual(0);
  expect(ftIr[0].y[0]).toStrictEqual(95.13749694824219);
  expect(mXyxy[0].y[1]).toStrictEqual(3188);
  expect(raman[0].x[1]).toStrictEqual(3994.8946331825773);
  //expect(mXyxy[0].x[2]).toStrictEqual(16931.1999969);
  expect(raman[0].y[1]).toStrictEqual(0.0186002254486084);
});
