import { FlagParameters } from "../../utility/headerUtils";
import { getDataShape } from "../../getDataShape";

test('Data shape', () => {
  const y = new FlagParameters(0b00000000);
  expect(getDataShape(y)).toBe('Y');
  const exception = new FlagParameters(0b11000000);
  expect(getDataShape(exception)).toBe('exception');
  const yy = new FlagParameters(0b00000100);
  expect(getDataShape(yy)).toBe('YY');
  const xy = new FlagParameters(0b10000000);
  expect(getDataShape(xy)).toBe('XY');
  const xyy = new FlagParameters(0b10000100);
  expect(getDataShape(xyy)).toBe('XYY');
  const xyxy = new FlagParameters(0b11000100);
  expect(getDataShape(xyxy)).toBe('XYXY');
});

