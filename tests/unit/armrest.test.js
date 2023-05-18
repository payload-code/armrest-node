import Armrest from '../../src/armrest'
import Model from '../../src/model'

describe('Armrest.model', () => {
  const session = new Armrest()

  test.each([
    [['Test'], 'Test', { object: 'test' }],
    [['TestSnake'], 'TestSnake', { object: 'test_snake' }],
    [[class Test extends Model {}], 'Test', { object: 'test' }],
    [
      [
        class Test extends Model {
          static spec = { polymorphic: { poly: true } }
        },
      ],
      'Test',
      { polymorphic: { poly: true }, object: 'test' },
    ],
    [
      [
        class Test extends Model {
          static spec = { polymorphic: { poly: true }, object: 'override' }
        },
      ],
      'Test',
      { polymorphic: { poly: true }, object: 'override' },
    ],
  ])('model valid', (args, name, spec) => {
    session.model(...args)
    expect(session[name].name).toBe(name)
    expect(session[name].spec).toStrictEqual(spec)
  })
})

describe('Armrest.getModelCls', () => {
  const session = new Armrest()
    .model('Test')
    .model('PolyTest', { object: 'test', polymorphic: { poly: true } })

  test.each([
    [{ object: 'test' }, new session.Test().constructor],
    [{ object: 'test', poly: true }, new session.PolyTest().constructor],
  ])('getModelCls', (input, output) => {
    expect(session.getModelCls(input)).toBe(output)
  })
})

describe('Armrest.removeFromCache', () => {
  const session = new Armrest().model('Test').model('NestedTest')

  test('remove nested list object', () => {
    const test = new session.Test(
      {
        id: 'test1',
        nested: [
          {
            id: 'nested2',
            object: 'nested_test',
          },
        ],
      },
      session,
    )

    const nestedTest = new session.NestedTest({ id: 'nested2' })

    expect(test.nested.length).toBe(1)
    expect(test.nested[0]).toBe(nestedTest)

    session.removeFromCache(nestedTest)

    expect(test.nested.length).toBe(0)
  })

  test('remove nested object', () => {
    const test = new session.Test(
      {
        id: 'test1',
        nested: {
          id: 'nested2',
          object: 'nested_test',
        },
      },
      session,
    )

    const nestedTest = new session.NestedTest({ id: 'nested2' })

    expect(test.nested).toBe(nestedTest)

    session.removeFromCache(nestedTest)

    expect(test.nested).toBe(undefined)
  })
})
