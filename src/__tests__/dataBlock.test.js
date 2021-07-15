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
const mEvenZBuffer = new IOBuffer(fs.readFileSync(`${pathFiles}m_evenz.spc`));
const mEvenZ = readDataBlock(mEvenZBuffer, mainHeader(mEvenZBuffer));
test('data block parsing test', () => {
  expect(mXyxy).toHaveLength(512);
  expect(mXyxy[0].y[1]).toStrictEqual(3188);
  expect(mXyxy[511].y[3]).toStrictEqual(11019);
  expect(raman[0].x[1]).toStrictEqual(3994.8946331825773);
  expect(raman[0].y[1]).toStrictEqual(0.0186002254486084);
  expect(mOrdZ[0].x[0]).toStrictEqual(698.229736328125);
  expect(mOrdZ[0].y).toHaveLength(857);
  expect(ftIr).toHaveLength(1);
  expect(ftIr[0].y[0]).toStrictEqual(95.13749694824219);
  expect(mEvenZ[0].x).toStrictEqual(mEvenZ[2].x);
  expect(mEvenZ[6].y[4]).toStrictEqual(0.3032105267047882);
});
