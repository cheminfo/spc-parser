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
  expect(longToDate(2102092692)).toMatch(/2004-11-12T14:20/);
  expect(longToDate(2091439149)).toMatch(/1994-08-26T16:45/);
  expect(longToDate(0)).toMatch(/0000-00-00T00:00:00.00Z/);
});
