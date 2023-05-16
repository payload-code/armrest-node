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
