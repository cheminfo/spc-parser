import { mainHeader } from '../mainHeader';

const fs = require('fs');

const { IOBuffer } = require('iobuffer');

const pathFiles = `${__dirname}/files/`;

test('mainHeader parsing test', () => {
  let data = fs.readFileSync(`${pathFiles}m_xyxy.spc`);
  let buffer = new IOBuffer(data);
  buffer.setBigEndian();
  const mxyxy = mainHeader(buffer);
  expect(mxyxy.typeParameters.xyxy).toStrictEqual(true);
  expect(mxyxy.typeParameters.multiFile).toStrictEqual(true);
  expect(mxyxy.date).toStrictEqual('2001-06-23T16-43');
});
