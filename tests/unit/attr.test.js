import Attr from '../../src/attr'

describe('Attr', () => {
  const attr = new Attr()

  test.each([
    [attr.someattr.eq('testval'), { someattr: 'testval' }],
    [attr.someattr.ne('testval'), { someattr: '!testval' }],
    [attr.someattr.gt(500), { someattr: '>500' }],
    [attr.someattr.lt(500), { someattr: '<500' }],
    [attr.someattr.ge(500), { someattr: '>=500' }],
    [attr.someattr.le(500), { someattr: '<=500' }],
    [attr.someattr.contains('testval'), { someattr: '?*testval*' }],
    [
      attr.someattr.somemethod().eq('testval'),
      { 'somemethod(someattr)': 'testval' },
    ],
    [
      attr.someattr.nestedattr.eq('testval'),
      { 'someattr[nestedattr]': 'testval' },
    ],
    [
      attr.someattr.nestedattr.somemethod().eq('testval'),
      { 'somemethod(someattr[nestedattr])': 'testval' },
    ],
  ])('test attr conditionals', (input, output) => {
    expect(input.toParam()).toStrictEqual(output)
  })

  test.each([
    [attr.objectattr, 'objectattr'],
    [attr.nestedobject.objectattr, 'nestedobject[objectattr]'],
    [
      attr.nestedobject.innernested.objectattr,
      'nestedobject[innernested][objectattr]',
    ],
  ])('test attr toString()', (input, output) => {
    expect(input.toString()).toStrictEqual(output)
  })
})
