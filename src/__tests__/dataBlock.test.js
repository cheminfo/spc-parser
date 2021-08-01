import { join } from 'path';

import { readDataBlock } from '../dataBlock';
import { mainHeader } from '../mainHeader';

const { readFileSync } = require('fs');

const { IOBuffer } = require('iobuffer');

const pathFiles = join(__dirname, 'files');

const mXyxyBuffer = new IOBuffer(readFileSync(join(pathFiles, 'm_xyxy.spc')));
const mXyxy = readDataBlock(mXyxyBuffer, mainHeader(mXyxyBuffer));
const ramanBuffer = new IOBuffer(readFileSync(join(pathFiles, 'RAMAN.SPC')));
const raman = readDataBlock(ramanBuffer, mainHeader(ramanBuffer));
const mOrdZBuffer = new IOBuffer(readFileSync(join(pathFiles, 'm_ordz.spc')));
const mOrdZ = readDataBlock(mOrdZBuffer, mainHeader(mOrdZBuffer));
const ftIrBuffer = new IOBuffer(readFileSync(join(pathFiles, 'Ft-ir.spc')));
const ftIr = readDataBlock(ftIrBuffer, mainHeader(ftIrBuffer));
const mEvenZBuffer = new IOBuffer(readFileSync(join(pathFiles, 'm_evenz.spc')));
const mEvenZ = readDataBlock(mEvenZBuffer, mainHeader(mEvenZBuffer));
test('data block parsing test', () => {
  expect(mXyxy).toHaveLength(512);
  expect(mXyxy[0].y[1]).toStrictEqual(3188);
  expect(mXyxy[511].y[3]).toStrictEqual(11019);
  expect(raman[0].x[1]).toBeCloseTo(3994.8946331825773);
  expect(raman[0].y[1]).toBeCloseTo(0.0186002254486084);
  expect(mOrdZ[0].x[0]).toStrictEqual(698.229736328125);
  expect(mOrdZ[0].y[0]).toBeCloseTo(0.02219367027282715);
  expect(mOrdZ[0].y[4]).toBeCloseTo(0.005127236247062683);
  expect(mOrdZ[0].y[800]).toBeCloseTo(0.0833737701177597);
  expect(mOrdZ[0].y[856]).toBeCloseTo(0.15000060200691223);
  expect(mOrdZ[9].y[0]).toBeCloseTo(0.023877553641796112);
  expect(mOrdZ[9].y[856]).toBeCloseTo(0.000490216538310051);
  expect(mOrdZ[9].y).toHaveLength(857);
  expect(mOrdZ[10]).toBeUndefined();
  expect(ftIr).toHaveLength(1);
  expect(ftIr[0].y[0]).toBeCloseTo(95.13749694824219);
  expect(mEvenZ[0].x).toStrictEqual(mEvenZ[2].x);
  expect(mEvenZ[6].y[4]).toBeCloseTo(0.3032105267047882);
});
