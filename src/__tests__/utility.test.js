import { getFlagParameters, longToDate } from '../utility';

test('Flag parameters', () => {
  expect(getFlagParameters(127)).toStrictEqual({
    y16BitPrecision: true,
    useExperimentExtension: true,
    multiFile: true,
    zValuesRandom: true,
    zValuesUneven: true,
    customAxisLabels: true,
    xyxy: true,
    xy: false,
  });
});
test('Long to date', () => {
  expect(longToDate(2102092692)).toStrictEqual('2004-11-12T14-20'); //4B 63 94 07 = 1001011 01100011 10010100 00000111
});
