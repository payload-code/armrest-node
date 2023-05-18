import Armrest from './armrest'
import Request from './request'
import Attr from './attr'

function data2object(item, session) {
  Object.entries(item).forEach(([key, val]) => {
    if (!val || typeof val !== 'object') return

    if (session.getModelCls(val)) item[key] = session.toModel(val, [key, item])
    data2object(item[key], session)
  })

  return item
}

function popSessionFromArgs(args) {
  if (args.slice(-1)[0] instanceof Armrest) return args.pop()

  return null
}

export class ModelWrapper extends Function {
  constructor(Model, session) {
    function wrappedCls(...args) {
      return new Model(...args, session)
    }

    Object.defineProperty(wrappedCls, 'name', { value: Model.name })
    Object.defineProperty(wrappedCls, 'spec', { value: Model.spec })
    Object.defineProperty(wrappedCls, 'prototype', { value: Model.prototype })

    const proxy = new Proxy(wrappedCls, {
      get: (target, key, receiver) => {
        if (
          ['get', 'filterBy', 'orderBy', 'create', 'select', 'all'].includes(
            key,
          )
        ) {
          return (...args) => {
            args.push(session)
            return Model[key](...args)
          }
        }

        if (key === 'toString') {
          return function toString() {
            return '*'
          }
        }

        if (key === 'wrappedModel') return Model

        if (!(key in target)) return new Attr(null, Model)[key]

        return Reflect.get(target, key, receiver)
      },
    })

    // eslint-disable-next-line no-constructor-return
    return proxy
  }
}

export default class Model {
  static spec = {}

  constructor(obj, session = null) {
    const cachedObj = session?.findInCache(obj)
    if (cachedObj) {
      cachedObj.assign(obj)
      // eslint-disable-next-line no-constructor-return
      return cachedObj
    }

    if (this.constructor.spec.polymorphic)
      Object.assign(this, this.constructor.spec.polymorphic)

    Object.defineProperty(this, 'session', {
      value: session,
      iterable: false,
    })

    this.assign(obj)

    if (this.id) session?.addToCache(this)
  }

  assign(data) {
    Object.assign(this, data)
    if (this.session) data2object(this, this.session)
  }

  data() {
    return this
  }

  json() {
    return JSON.stringify(this, null, 2)
  }

  update(updates) {
    return new Request(this.constructor, this.session).update(this, updates)
  }

  delete() {
    return new Request(this.constructor, this.session).delete(this)
  }

  static get(id, session) {
    return new Request(this, session).get(id)
  }

  static filterBy(...args) {
    const session = popSessionFromArgs(args)

    return new Request(this, session)
      .filterBy(...args)
      .filterBy(this.spec.polymorphic || {})
  }

  static create(obj, session) {
    return new Request(this, session).create(obj)
  }

  static select(...args) {
    const session = popSessionFromArgs(args)

    return new Request(this, session)
      .select(...args)
      .filterBy(this.spec.polymorphic || {})
  }

  static orderBy(...args) {
    const session = popSessionFromArgs(args)

    return new Request(this, session)
      .filterBy(this.spec.polymorphic || {})
      .orderBy(...args)
  }

  static all(session) {
    return new Request(this, session)
      .filter_by(this.spec.polymorphic || {})
      .all()
  }
}

export const testingExport = {}

if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
  testingExport.data2object = data2object
  testingExport.popSessionFromArgs = popSessionFromArgs
}
