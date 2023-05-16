import { nestedQStringKeys, clone } from '../../src/utils'

test('test nestedQStringKeys', () => {
  expect(
    nestedQStringKeys({
      test: 1,
      test2: {
        test3: {},
        arr: [1, 2, { test: 1 }],
      },
      test3: [1, 2, 3],
    }),
  ).toEqual({
    test: 1,
    'test2[arr][0]': 1,
    'test2[arr][1]': 2,
    'test2[arr][2][test]': 1,
    'test3[0]': 1,
    'test3[1]': 2,
    'test3[2]': 3,
  })
})

test('test clone', () => {
  const model = { test: 1 }
  const copy = clone(model)
  expect(copy).toStrictEqual(model)
  expect(copy).not.toBe(model)
})
