import Attr from './attr'
import Request from './request'
import Model, { ModelWrapper } from './model'
import exc, { ArmrestError } from './exceptions'

function toSnakeCase(s) {
  return s
    .replace(/[a-zA-Z][A-Z][a-z]/g, (c) => `${c[0]}_${c.substr(1)}`)
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

  static Model = Model

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

    this.register(exc)
  }

  Session(apiKey, apiUrl) {
    const session = new this.constructor(apiUrl || this.apiUrl)
    session.apiKey = apiKey || this.apiKey

    Object.entries(this.#models).forEach(([name, model]) => session.register({[name]: model}))

    Object.entries(this.#exceptions).forEach(([name, exc]) => session.register({[name]: exc}))

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

    if (spec)
        cls.spec = {...cls.spec, ...spec}

    this.register({[name]: cls})
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

  register(objects) {
    Object.entries(objects).sort(([_a, a], [_b, b])=>{
          const ap = Object.getPrototypeOf(a)
          const bp = Object.getPrototypeOf(b)

          if ( ap === Model && bp !== Model )
            return -1;
          if ( bp === Model && ap !== Model )
            return 1;
          return 0;
      }).forEach(([name, cls])=> {
        if (cls.prototype instanceof Model) {
          const parentCls = Object.getPrototypeOf(cls)

          Object.defineProperty(cls, 'name', { value: name })
          cls.spec = {...cls.spec}
          if (parentCls !== Model)
            cls.spec = {...parentCls.spec, ...cls.spec}

          if (!cls.spec.object)
              cls.spec.object = toSnakeCase(name)

          this.#models[name] = cls
          this[name] = new ModelWrapper(cls, this)

          return this
        }

        if (cls.prototype instanceof ArmrestError || cls == ArmrestError) {
          Object.defineProperty(cls, 'name', { value: name })
          this.#exceptions[name] = cls
          this[name] = cls
          return this
        }

        throw Error('Unknown type')
    })

    return this
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

  toModel(obj, parentRef = null) {
    const FoundModel = this.getModelCls(obj)
    if (FoundModel) {
      obj = new FoundModel(obj, this)
      if (parentRef) this.addRefToCache(obj, parentRef)
    }
    return obj
  }

  findInCache(obj) {
    if (obj?.id in this.#objectCache) return this.#objectCache[obj.id].obj

    return null
  }

  addToCache(obj) {
    this.#objectCache[obj.id] = { obj, refs: [] }
  }

  addRefToCache(obj, parentRef) {
    this.#objectCache[obj.id]?.refs.push(parentRef)
  }

  removeFromCache(obj) {
    const cache = this.#objectCache[obj.id]
    delete this.#objectCache[obj.id]
    cache.refs.forEach(([key, refObj]) => {
      if (Array.isArray(refObj)) refObj.splice(key, 1)
      else delete refObj[key]
    })
  }
}
