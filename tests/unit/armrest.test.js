import Armrest from '../../src/armrest'
import Model from '../../src/model'

describe('Armrest.model', () => {
  const session = new Armrest().model('Example')

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
    [[session.Example], 'Example', { object: 'example' }],
    [[class Test extends session.Example {}], 'Test', { object: 'example' }],
    [
      [
        class Test extends session.Example {
          static spec = { polymorphic: { poly: true } }
        },
      ],
      'Test',
      { polymorphic: { poly: true }, object: 'example' },
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

describe('Armrest.Session', () => {
  const baseUrl = 'https://api.example.com'
  let armrest

  beforeEach(() => {
    armrest = new Armrest(baseUrl)
  })

  test('sets defaultHeaders when provided', () => {
    const customHeaders = { 'X-Custom-Header': 'value' }
    const session = armrest.Session('test-key', undefined, { defaultHeaders: customHeaders })
    expect(session.defaultHeaders).toEqual(customHeaders)
  })

  test('merges defaultHeaders with parent defaultHeaders', () => {
    armrest.defaultHeaders = { 'X-Parent-Header': 'parent-value' }
    const customHeaders = { 'X-Custom-Header': 'value' }
    const session = armrest.Session('test-key', undefined, { defaultHeaders: customHeaders })
    expect(session.defaultHeaders).toEqual({
      'X-Parent-Header': 'parent-value',
      'X-Custom-Header': 'value',
    })
  })

  test('sets both apiUrl and defaultHeaders', () => {
    const customUrl = 'https://custom.example.com'
    const customHeaders = { 'X-Custom-Header': 'value' }
    const session = armrest.Session('test-key', customUrl, { defaultHeaders: customHeaders })
    expect(session.apiUrl).toBe(customUrl)
    expect(session.defaultHeaders).toEqual(customHeaders)
  })

  test('uses base apiUrl when apiUrl not provided', () => {
    const session = armrest.Session('test-key')
    expect(session.apiUrl).toBe(baseUrl)
  })

  test('sets apiKey on session', () => {
    const apiKey = 'test-key-123'
    const session = armrest.Session(apiKey)
    expect(session.apiKey).toBe(apiKey)
  })

  test('inherits models and exceptions from parent', () => {
    armrest.model('TestModel')
    const session = armrest.Session('test-key')
    expect(session.TestModel).toBeDefined()
  })

  test('defaultHeaders defaults to empty object when parent has none', () => {
    const session = armrest.Session('test-key')
    expect(session.defaultHeaders).toEqual({})
  })
})
