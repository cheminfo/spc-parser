import { ensureIncreasingXValues } from '../ensureIncreasingXValues';

test('increasing X array', () => {
  const x = new Float64Array([1, 2, 3]);
  const y = new Float64Array([5, 4, 6]);
  const [oX, oY] = ensureIncreasingXValues(x, y);
  expect(oX[0]).toBe(1);
  expect(oY[0]).toBe(5);
});

test('decreasing X array', () => {
  const x = new Float64Array([3, 1.01, 1]);
  const y = new Float64Array([4, 6, 5]);
  const [oX, oY] = ensureIncreasingXValues(x, y);

  expect(oX[0]).toBe(1); // (1, 5)
  expect(oY[0]).toBe(5);
  expect(oX[2]).toBe(3); // (3, 4)
  expect(oY[2]).toBe(4);
});

test('throw', () => {
  const x = new Float64Array([1, 2, 3, 4]);
  const y = new Float64Array([1, 2]);
  expect(() => ensureIncreasingXValues(x, y)).toThrow(
    'length must be the same',
  );
});

test('empty x', () => {
  const x = new Float64Array([]);
  const y = new Float64Array([]);
  const [oX, oY] = ensureIncreasingXValues(x, y);
  expect(oX).toHaveLength(0);
  expect(oY).toHaveLength(0);
});
