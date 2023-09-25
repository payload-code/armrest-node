import { expe, testct, jest } from '@jest/globals'

import Armrest from '../../src/armrest'
import Request, { testingExport } from '../../src/request'
import Model from '../../src/model'
import Attr from '../../src/attr'
import {
  BadRequest,
  InvalidAttributes,
  InternalServerError,
  UnknownResponse,
  ArmrestError,
} from '../../src/exceptions'

const { buildSearchParams, handleResponse, findObjectFromSelectFields } =
  testingExport

describe('Request.create', () => {
  class PolyModel extends Model {
    static spec = { polymorphic: { poly: true } }
  }

  test.each([
    [new Model({ test: 1 }), { test: 1 }],
    [
      [new Model({ test: 1 }), new Model({ test: 2 })],
      { object: 'list', values: [{ test: 1 }, { test: 2 }] },
    ],
    [new PolyModel({ test: 1 }), { test: 1, poly: true }],
    [
      [new PolyModel({ test: 1 }), new PolyModel({ test: 2 })],
      {
        object: 'list',
        values: [
          { test: 1, poly: true },
          { test: 2, poly: true },
        ],
      },
    ],
    [{ test: 1 }, { test: 1 }],
    [
      [{ test: 1 }, { test: 2 }],
      { object: 'list', values: [{ test: 1 }, { test: 2 }] },
    ],
  ])('test create valid', (input, output) => {
    const request = new Request(Model, new Armrest())

    const mockSend = jest.spyOn(request, 'send').mockImplementation()

    request.create(input)

    expect(mockSend.mock.calls).toHaveLength(1)
    expect(mockSend.mock.calls[0]).toHaveLength(2)
    expect(mockSend.mock.calls[0][0]).toBe('post')
    expect(mockSend.mock.calls[0][1]).toStrictEqual({
      data: output,
    })
  })

  test.each([
    [{ test: 1 }, 'Missing object type'],
    [[{ test: 1 }, { test: 2 }], 'Missing object type'],
    [
      [new PolyModel({ test: 1 }), new Model({ test: 2 })],
      'Objects must be of the same type',
    ],
    [[], 'List must not be empty'],
  ])('test create invalid', (input, error) => {
    const request = new Request(null, new Armrest())

    expect(() => request.create(input)).toThrow(error)
  })
})

describe('Request.update', () => {
  class OtherModel extends Model { }

  test.each([
    [[{ test: 1 }], { data: { test: 1 }, params: { mode: 'query' } }],
    [[new Model({ id: 1 }), { test: 1 }], { id: 1, data: { test: 1 } }],
    [
      [
        [
          [new Model({ id: 1 }), { test: 1 }],
          [new Model({ id: 2 }), { test: 2 }],
        ],
      ],
      {
        data: {
          object: 'list',
          values: [
            { id: 1, test: 1 },
            { id: 2, test: 2 },
          ],
        },
      },
    ],
    [
      [
        [
          [{ id: 1 }, { test: 1 }],
          [{ id: 2 }, { test: 2 }],
        ],
      ],
      {
        data: {
          object: 'list',
          values: [
            { id: 1, test: 1 },
            { id: 2, test: 2 },
          ],
        },
      },
    ],
  ])('test update valid', (input, output) => {
    const request = new Request(Model, new Armrest())

    const mockSend = jest.spyOn(request, 'send').mockImplementation()

    request.update(...input)

    expect(mockSend.mock.calls).toHaveLength(1)
    expect(mockSend.mock.calls[0]).toHaveLength(2)
    expect(mockSend.mock.calls[0][0]).toBe('put')
    expect(mockSend.mock.calls[0][1]).toStrictEqual(output)
  })

  test.each([
    [{ test: 1 }, 'Missing object type'],
    [
      [
        [{ id: 1 }, { test: 1 }],
        [{ id: 2 }, { test: 2 }],
      ],
      'Missing object type',
    ],
    [
      [
        [new OtherModel({ id: 1 }), { test: 1 }],
        [new Model({ id: 2 }), { test: 2 }],
      ],
      'Objects must be of the same type',
    ],
    [
      [
        [new Model({}), { test: 1 }],
        [new Model({}), { test: 2 }],
      ],
      'id cannot be empty',
    ],
    [[], 'List must not be empty'],
  ])('test update invalid', (input, error) => {
    const request = new Request(null, new Armrest())

    expect(() => request.update(input)).toThrow(error)
  })
})

describe('Request.delete', () => {
  class OtherModel extends Model { }

  test.each([
    [{ id: 1 }, null, { id: 1 }],
    [new Model({ id: 1 }), null, { id: 1 }],
    [undefined, { id: 1 }, { params: { mode: 'query' } }],
    [
      [new Model({ id: 1 }), new Model({ id: 2 })],
      null,
      { params: { mode: 'query', id: '1|2' } },
    ],
    [[{ id: 1 }, { id: 2 }], null, { params: { mode: 'query', id: '1|2' } }],
  ])('test delete valid', (input, filters, output) => {
    const request = new Request(Model, new Armrest())

    const mockSend = jest.spyOn(request, 'send').mockImplementation()

    if (filters) request.filterBy(filters)

    request.delete(input)

    expect(mockSend.mock.calls).toHaveLength(1)
    expect(mockSend.mock.calls[0]).toHaveLength(2)
    expect(mockSend.mock.calls[0][0]).toBe('delete')
    expect(mockSend.mock.calls[0][1]).toStrictEqual(output)
  })

  test.each([
    [{ test: 1 }, 'Missing object type'],
    [new Model({ test: 1 }), 'id cannot be empty'],
    [[{ id: 1 }, { id: 2 }], 'Missing object type'],
    [[new Model({}), new Model({})], 'id cannot be empty'],
    [
      [new OtherModel({ id: 1 }), new Model({ id: 2 })],
      'Objects must be of the same type',
    ],
    [[], 'List must not be empty'],
    [undefined, 'Cannot perform delete'],
  ])('test update invalid', (input, error) => {
    const request = new Request(null, new Armrest())

    expect(() => request.delete(input)).toThrow(error)
  })
})

describe('Request.filterBy', () => {
  const sess = new Armrest()

  test.each([
    [[[{ id: 1 }]], { id: [1] }],
    [[[{ id: 1 }], [{ id: 2 }]], { id: [1, 2] }],
    [[[sess.attr.filter.eq('value')]], { filter: ['value'] }],
    [[[sess.attr.filter.ne('value')]], { filter: ['!value'] }],
    [[[sess.attr.filter.gt(500)]], { filter: ['>500'] }],
    [[[sess.attr.filter.lt(500)]], { filter: ['<500'] }],
    [[[sess.attr.filter.ge(500)]], { filter: ['>=500'] }],
    [[[sess.attr.filter.le(500)]], { filter: ['<=500'] }],
    [[[sess.attr.filter.contains('value')]], { filter: ['?*value*'] }],
  ])('test filterBy', (inputs, output) => {
    const request = new Request(Model, new Armrest())

    inputs.forEach((input) => {
      request.filterBy(...input)
    })

    expect(request.getFilters()).toEqual(output)
  })
})

describe('Request.get', () => {
  test.each([['id', { id: 'id' }]])('test get valid', (input, output) => {
    const request = new Request(Model, new Armrest())

    const mockSend = jest.spyOn(request, 'send').mockImplementation()

    request.get(input)

    expect(mockSend.mock.calls).toHaveLength(1)
    expect(mockSend.mock.calls[0]).toHaveLength(2)
    expect(mockSend.mock.calls[0][0]).toBe('get')
    expect(mockSend.mock.calls[0][1]).toStrictEqual(output)
  })

  test.each([
    [null, undefined, 'id cannot be empty'],
    [Model, undefined, 'id cannot be empty'],
    [null, 'id', 'Missing object type'],
  ])('test get invalid', (object, input, error) => {
    const request = new Request(object, new Armrest())
    expect(() => request.get(input)).toThrow(error)
  })
})

describe('buildSearchParams', () => {
  const attr = new Attr()
  const sess = new Armrest()

  test.each([
    [{}, undefined, {}, [], [], [], [], new URLSearchParams()],
    [
      {},
      undefined,
      { filter: ['>500'] },
      [],
      ['*', 'test'],
      [],
      [],
      new URLSearchParams({
        filter: '>500',
        'fields[0]': '*',
        'fields[1]': 'test',
      }),
    ],
    [
      {},
      undefined,
      {},
      [attr.qfilter1.eq('val1')],
      [],
      [],
      [],
      new URLSearchParams({
        q: 'qfilter1 == "val1"',
      }),
    ],
    [
      {},
      undefined,
      {},
      [attr.qfilter1.eq('val1'), attr.qfilter2.eq('val2')],
      [],
      [],
      [],
      new URLSearchParams({
        q: 'qfilter1 == "val1" && qfilter2 == "val2"',
      }),
    ],
    [
      {},
      undefined,
      {},
      [
        attr.qfilter1.eq('val1'),
        sess.or(attr.qfilter2.eq('val2'), attr.qfilter2.eq('val3')),
      ],
      [],
      [],
      [],
      new URLSearchParams({
        q: 'qfilter1 == "val1" && ( qfilter2 == "val2" || qfilter2 == "val3" )',
      }),
    ],
    [
      {},
      undefined,
      {},
      [
        attr.qfilter1.nested1.eq('val1'),
        sess.or(attr.qfilter2.nested2.gt(500), attr.qfilter2.nested2.lt(200)),
      ],
      [],
      [],
      [],
      new URLSearchParams({
        q: 'qfilter1[nested1] == "val1" && ( qfilter2[nested2] > 500 || qfilter2[nested2] < 200 )',
      }),
    ],
    [
      {},
      undefined,
      { filter: ['>500', '<1000'] },
      [],
      ['*', 'test'],
      ['month(timestamp)'],
      ['desc(timestamp)', 'id'],
      new URLSearchParams([
        ['filter', '>500'],
        ['filter', '<1000'],
        ['fields[0]', '*'],
        ['fields[1]', 'test'],
        ['group_by[0]', 'month(timestamp)'],
        ['order_by[0]', 'desc(timestamp)'],
        ['order_by[1]', 'id'],
      ]),
    ],
  ])(
    'test buildSearchParams',
    (
      params,
      defaultParams,
      filters,
      qfilters,
      fields,
      groupBys,
      orderBys,
      output,
    ) => {
      expect(
        buildSearchParams(
          params,
          defaultParams,
          filters,
          qfilters,
          fields,
          groupBys,
          orderBys,
        ),
      ).toStrictEqual(output)
    },
  )
})

describe('handleResponse', () => {
  const session = new Armrest().model('Test')

  test.each([
    [
      {
        status: 200,
        data: {
          object: 'test',
        },
      },
      new session.Test({ object: 'test' }),
    ],
    [
      {
        status: 200,
        data: {
          object: 'unknown',
        },
      },
      { object: 'unknown' },
    ],
    [
      {
        status: 200,
        data: {
          object: 'list',
          values: [{ object: 'test' }, { object: 'test' }],
        },
      },
      [
        new session.Test({ object: 'test' }),
        new session.Test({ object: 'test' }),
      ],
    ],
  ])('test handleResponse valid', (response, output) => {
    expect(handleResponse('post', session, response)).toStrictEqual(output)
  })

  test.each([
    [
      {
        status: 500,
        data: undefined,
      },
      new InternalServerError(),
    ],
    [
      {
        status: 200,
        data: undefined,
      },
      new UnknownResponse(),
    ],
    [
      {
        status: 200,
        data: {},
      },
      new UnknownResponse('Response missing "object" attribute'),
    ],
    [
      {
        status: 400,
        data: {
          object: 'error',
          error_description: 'test error',
        },
      },
      (response) => new BadRequest('test error', response.data),
    ],
    [
      {
        status: 400,
        data: {
          object: 'error',
          error_description: 'test error',
          error_type: 'InvalidAttributes',
        },
      },
      (response) => new InvalidAttributes('test error', response.data),
    ],
    [
      {
        status: 401,
        data: {
          object: 'error',
          error_description: 'test error',
          error_type: 'InvalidAttributes',
        },
      },
      (response) => new ArmrestError('test error', response.data),
    ],
  ])('test handleResponse invalid', (response, error) => {
    if (typeof error === 'function') error = error(response)

    expect(() => handleResponse('post', session, response)).toThrow(error)
  })
})

describe('findObjectFromSelectFields', () => {
  const session = new Armrest().model('TestModel')

  test.each([
    [[session.TestModel], session.TestModel],
    [[session.TestModel.attribute], session.TestModel.wrappedModel],
  ])('findObjectFromSelectFields', (input, output) => {
    expect(findObjectFromSelectFields(input)).toBe(output)
  })
})

describe('Request.delete', () => {
  const session = new Armrest();

  test.each([
    { input: undefined, expectedErrorMessage: 'Cannot perform delete' },
  ])('delete method should be called', async ({ input, expectedErrorMessage }) => {
    const spy = jest.spyOn(session, 'delete');

    try {
      await session.delete(input);
    } catch (error) {
      expect(error.message).toBe(expectedErrorMessage);
    }

    expect(spy).toHaveBeenCalled();
  });
});
