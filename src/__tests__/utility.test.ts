import { getDataShape, FlagParameters, longToDate } from '../utility';

test('Flag parameters', () => {
  const instance = new FlagParameters(255);
  expect({ ...instance }).toStrictEqual({
    y16BitPrecision: true,
    useExperimentExtension: true,
    multiFile: true,
    zValuesRandom: true,
    zValuesUneven: true,
    customAxisLabels: true,
    xy: true,
    xyxy: true,
  });
});
test('Long to date', () => {
  expect(longToDate(2102092692)).toMatch(/2004-11-12T14:20/);
  expect(longToDate(2091439149)).toMatch(/1994-08-26T16:45/);
  expect(longToDate(0)).toMatch(/0000-00-00T00:00:00.00Z/);
});

test('Data shape', () => {
  const y = new FlagParameters(0b00000000)
  expect(getDataShape(y)).toBe('Y');
  const exception = new FlagParameters(0b11000000)
  expect(getDataShape(exception)).toBe('exception');
  const yy = new FlagParameters(0b00000100)
  expect(getDataShape(yy)).toBe('YY');
  const xy = new FlagParameters(0b10000000)
  expect(getDataShape(xy)).toBe('XY');
  const xyy = new FlagParameters(0b10000100)
  expect(getDataShape(xyy)).toBe('XYY');
  const xyxy = new FlagParameters(0b11000100)
  expect(getDataShape(xyxy)).toBe('XYXY');
});
