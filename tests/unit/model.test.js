import Armrest from '../../src/armrest'
import Model, { ModelWrapper, testingExport } from '../../src/model'

const { popSessionFromArgs, data2object } = testingExport

describe('popSessionFromArgs', () => {
  const session = new Armrest()
  test.each([
    [[1, 2, 3], null, [1, 2, 3]],
    [[1, 2, 3, session], session, [1, 2, 3]],
  ])('popSessionFromArgs', (args, poppedSession, result) => {
    expect(popSessionFromArgs(args)).toBe(poppedSession)
    expect(args).toEqual(result)
  })
})

describe('data2object', () => {
  const session = new Armrest().model('Model1').model('Model2').model('Model3')

  test.each([
    [{ nested: { object: 'unknown' } }, { nested: { object: 'unknown' } }],
    [
      { nested: { object: 'model1' } },
      { nested: new session.Model1({ object: 'model1' }) },
    ],
    [
      { nested: { object: 'model1', list: [{ object: 'model2' }] } },
      {
        nested: new session.Model1({
          object: 'model1',
          list: [new session.Model2({ object: 'model2' })],
        }),
      },
    ],
  ])('data2object', (input, output) => {
    expect(data2object(input, session)).toStrictEqual(output)
  })
})

describe('Model', () => {
  const session = new Armrest()
  class PolyModel extends Model {
    static spec = { polymorphic: { poly: true } }
  }

  test('Model session cache', () => {
    const origModel = new Model({ id: 1 }, session)
    expect(new Model({ id: 1 }, session)).toBe(origModel)
  })

  test('Model apply polymorphic', () => {
    expect(new PolyModel({ id: 3 })).toStrictEqual(
      new PolyModel({ id: 3, poly: true }),
    )
  })

  test('Model json output', () => {
    expect(new Model({ id: 3 }, session).json()).toBe(
      `{
  "id": 3
}`,
    )
    expect(new PolyModel({ id: 4 }, session).json()).toBe(
      `{
  "poly": true,
  "id": 4
}`,
    )
    expect(
      new Model(
        {
          id: 5,
          create_at: new Date(2023, 5, 15, 0, 0, 0, 0),
          nested: new PolyModel({ id: 6, list: [new Model({ id: 7 })] }),
        },
        session,
      ).json(),
    ).toBe(
      `{
  "id": 5,
  "create_at": "2023-06-15T04:00:00.000Z",
  "nested": {
    "poly": true,
    "id": 6,
    "list": [
      {
        "id": 7
      }
    ]
  }
}`,
    )
  })
})

describe('ModelWrapper', () => {
  test('instanceof', () => {
    class InstanceCheck extends Model {}
    const WrappedInstanceCheck = new ModelWrapper(InstanceCheck)
    expect(new WrappedInstanceCheck() instanceof WrappedInstanceCheck).toBe(
      true,
    )
    expect(new WrappedInstanceCheck() instanceof InstanceCheck).toBe(true)
    expect(WrappedInstanceCheck() instanceof InstanceCheck).toBe(true)
  })

  test('attr', () => {
    const session = new Armrest()
    const WrappedModel = new ModelWrapper(Model, session)

    expect(WrappedModel.someattr.eq('test').toParam()).toStrictEqual({
      someattr: 'test',
    })
    expect(WrappedModel.someattr.toString()).toStrictEqual('someattr')
  })

  test('toString', () => {
    const session = new Armrest()
    const WrappedModel = new ModelWrapper(Model, session)

    expect(WrappedModel.toString()).toStrictEqual('*')
  })
})
