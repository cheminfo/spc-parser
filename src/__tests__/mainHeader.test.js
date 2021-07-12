import { mainHeader } from '../mainHeader';

const fs = require('fs');

const { IOBuffer } = require('iobuffer');

const pathFiles = `${__dirname}/files/`;

test('mainHeader parsing test', () => {
  const mxyxy = mainHeader(
    new IOBuffer(fs.readFileSync(`${pathFiles}m_xyxy.spc`)),
  );
  const raman = mainHeader(
    new IOBuffer(fs.readFileSync(`${pathFiles}RAMAN.SPC`)),
  );
  expect(mxyxy.typeParameters.xyxy).toStrictEqual(true);
  expect(mxyxy.typeParameters.multiFile).toStrictEqual(true);
  expect(mxyxy.date).toStrictEqual('1986-01-09T08-47');
  expect(raman.date).toStrictEqual('1994-08-26T16-45');
  expect(raman.xyzLabels).toMatch(/Rmn Intensity/);
});
