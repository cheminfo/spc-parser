import { ensureIncreasingXValues } from "../ensureIncreasingXValues";

test("increasing X array", () => {

  let x = new Float64Array([1,2,3])
  let y = new Float64Array([5,4,6])
  ensureIncreasingXValues(x,y);
  expect(x[0]).toBe(1)
  expect(y[0]).toBe(5)

})


test("decreasing X array", () => {

  let x = new Float64Array([3,1.01,1])
  let y = new Float64Array([4,6,5])
  ensureIncreasingXValues(x,y);

  expect(x[0]).toBe(1) // (1, 5)
  expect(y[0]).toBe(5)
  expect(x[2]).toBe(3) // (3, 4)
  expect(y[2]).toBe(4)

})

test("throw", () => {

  let x = new Float64Array([1,2,3,4])
  let y = new Float64Array([1,2])
  expect(()=>res).toThrow()
})
