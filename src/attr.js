export default class Attr extends Function {
  constructor(param, parent) {
    super('...args', 'this.boundThis.isMethod = true; return this.boundThis')

    const boundThis = this.bind(this)
    this.boundThis = boundThis

    boundThis.param = param
    boundThis.parent = parent
    boundThis.isMethod = false
    boundThis.op = ''
    boundThis.val = ''

    if (!boundThis.parent || !boundThis.parent.key)
      boundThis.key = boundThis.param
    else boundThis.key = `${boundThis.parent.key}[${boundThis.param}]`

    const proxy = new Proxy(boundThis, {
      get(target, key, receiver) {
        if (key in boundThis) return boundThis[key]
        if (typeof key === 'string') return new Attr(key, boundThis)
        return Reflect.get(target, key, receiver)
      },
      getPrototypeOf() {
        return Attr.prototype
      },
    })

    // eslint-disable-next-line no-constructor-return
    return proxy
  }

  toString() {
    let str = this.getKey()

    if (this.op) str = `${str} ${this.op} ${JSON.stringify(this.val)}`

    return str
  }

  getKey() {
    let str
    if (this.isMethod) str = `${this.param}(${this.parent.key})`
    else str = this.key
    return str
  }

  toParam() {
    const ret = {}
    let { op } = this

    if (['==', '!='].includes(this.op)) op = op.replace(/=/g, '')

    ret[this.getKey()] = `${op}${this.val}`
    return ret
  }

  eq(val) {
    this.op = '=='
    this.val = val
    return this
  }

  ne(val) {
    this.op = '!='
    this.val = val
    return this
  }

  lt(val) {
    this.op = '<'
    this.val = val
    return this
  }

  le(val) {
    this.op = '<='
    this.val = val
    return this
  }

  gt(val) {
    this.op = '>'
    this.val = val
    return this
  }

  ge(val) {
    this.op = '>='
    this.val = val
    return this
  }

  contains(val) {
    this.op = '?'
    this.val = `*${val}*`
    return this
  }
}
