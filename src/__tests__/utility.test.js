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
  expect(longToDate(2920769489)).toStrictEqual('2001-06-23T16-43');
});
