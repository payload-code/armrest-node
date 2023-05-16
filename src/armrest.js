import Attr from './attr'
import Request from './request'
import Model, { ModelWrapper } from './model'
import { ArmrestError } from './exceptions'

function toSnakeCase(s) {
  return s
    .replace(/[a-z][A-Z][a-z]/g, (c) => `${c[0]}_${c.substr(1)}`)
    .toLowerCase()
}

function matches(obj, obj2) {
  const keys = Object.keys(obj)
  let matchFound = true
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i]
    if (obj[k] !== obj2[k]) {
      matchFound = false
      break
    }
  }
  return matchFound
}

function Op(op) {
  return (...args) => `( ${args.map(String).join(` ${op} `)} )`
}

export default class Armrest {
  #models

  #exceptions

  #objectCache

  constructor(url) {
    this.#models = {}
    this.#exceptions = {}
    this.#objectCache = {}

    this.apiUrl = url
    this.apiKey = null
    this.attr = new Attr()
    this.and = Op('&&')
    this.or = Op('||')
  }

  Session(apiKey, apiUrl) {
    const session = new this.constructor(apiUrl || this.apiUrl)
    session.apiKey = apiKey || this.apiKey

    Object.values(this.#models).forEach((model) => session.register(model))

    Object.values(this.#exceptions).forEach((exc) => session.register(exc))

    return session
  }

  model(cls, spec) {
    let name

    switch (typeof cls) {
      case 'string':
        name = cls
        cls = class extends Model {}
        break
      case 'function':
        name = cls.name
        break
      default:
        throw Error('Unknown type, must be string or class')
    }

    if (!spec) spec = { object: toSnakeCase(name) }

    Object.defineProperty(cls, 'name', { value: name })

    if (cls.spec) Object.assign(spec, cls.spec)
    Object.defineProperty(cls, 'spec', { value: spec })

    this.register(cls)
    return this
  }

  select(...args) {
    return new Request(null, this).select(...args)
  }

  request() {
    return new Request(null, this)
  }

  create(...args) {
    return this.request().create(...args)
  }

  update(...args) {
    return this.request().update(...args)
  }

  delete(...args) {
    return this.requst().delete(...args)
  }

  register(cls) {
    if (cls.prototype instanceof Model) {
      this.#models[cls.name] = cls
      this[cls.name] = new ModelWrapper(cls, this)
      return this
    }

    if (cls.prototype instanceof ArmrestError) {
      this.#exceptions[cls.name] = cls
      this[cls.name] = cls
      return this
    }

    throw Error('Unknown type')
  }

  getModelCls(obj) {
    let cls = null
    Object.keys(this.#models).forEach((clsname) => {
      const object = this.#models[clsname]

      if (obj.object !== object.spec.object) return

      if (cls == null || matches(object.spec.polymorphic || {}, obj))
        cls = object
    })
    return cls
  }

  toModel(obj) {
    const FoundModel = this.getModelCls(obj)
    if (FoundModel) return new FoundModel(obj, this)
    return obj
  }

  findInCache(obj) {
    if (obj?.id in this.#objectCache) return this.#objectCache[obj.id]

    return null
  }

  addToCache(obj) {
    this.#objectCache[obj.id] = obj
  }
}
