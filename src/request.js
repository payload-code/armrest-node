import axios from 'axios'
import { Buffer } from 'buffer'
import Model from './model'
import Attr from './attr'
import exc, {
  InternalServerError,
  UnknownResponse,
  ArmrestError,
} from './exceptions'
import { nestedQStringKeys, clone } from './utils'

function findObjectFromSelectFields(fields) {
  for (let i = 0; i < fields.length; i += 1) {
    if (fields[i] instanceof Attr) {
      const object = findObjectFromSelectFields([fields[i].parent])
      if (object) return object
    }

    if (fields[i].prototype instanceof Model) return fields[i]
  }

  return null
}

function buildSearchParams(
  params = {},
  defaultParams,
  filters,
  qfilters,
  fields,
  groupBys,
  orderBys,
  limit = null,
  offset = null,
) {
  Object.keys(filters)
    .filter((k) => !(k in params))
    .forEach((k) => {
      params[k] = filters[k]
    })

  if (fields.length)
    Object.assign(params, nestedQStringKeys({ fields: fields.map(String) }))

  if (groupBys.length)
    Object.assign(params, nestedQStringKeys({ group_by: groupBys.map(String) }))

  if (orderBys.length)
    Object.assign(params, nestedQStringKeys({ order_by: orderBys.map(String) }))

  if (qfilters.length) {
    Object.assign(
      params,
      nestedQStringKeys({ q: qfilters.map(String).join(' && ') }),
    )
  }

  if (defaultParams) {
    defaultParams = nestedQStringKeys(defaultParams)
    Object.keys(defaultParams)
      .filter((k) => !(k in params))
      .forEach((k) => {
        params[k] = defaultParams[k]
      })
  }

  if (limit !== null)
    params.limit = limit

  if (offset !== null)
    params.offset = offset

  const searchParams = new URLSearchParams()
  if (params) {
    Object.keys(params).forEach((k) => {
      const v = params[k]
      if (Array.isArray(v)) {
        v.forEach((r) => {
          searchParams.append(k, r)
        })
      } else {
        searchParams.append(k, v)
      }
    })
  }

  return searchParams
}

function handleResponse(method, session, response) {
  const httpCode = response.status

  let { data } = response
  if (typeof data !== 'object') {
    if (httpCode === 500) throw new InternalServerError()
    else throw new UnknownResponse()
  }

  if (!data.object)
    throw new UnknownResponse('Response missing "object" attribute')

  if (httpCode === 200) {
    if (data.object === 'list') {
      data = data.values.map((o) => session.toModel(o))
      if (method === 'delete')
        data.values.forEach((o) => session.removeFromCache(o))
    } else {
      data = session.toModel(data)
      if (method === 'delete') session.removeFromCache(data)
    }

    return data
  }

  let BaseExc = ArmrestError
  data = session.toModel(data)
  Object.keys(exc).forEach((error) => {
    if (exc[error].httpCode !== httpCode) return
    if (exc[error].name && exc[error].name !== data.error_type) {
      if (Object.getPrototypeOf(exc[error]) === ArmrestError)
        BaseExc = exc[error]
      return
    }
    throw new exc[error](data.error_description, data)
  })

  throw new BaseExc(data.error_description, data)
}

export default class Request {
  #filters = {}

  #qfilters = {}

  #fields = []

  #groupBys = []

  #orderBys = []

  #limit = null

  #offset = null

  #session

  constructor(object, session) {
    this.object = object
    this.#session = session
  }

  send(method, params = {}) {
    let path

    if (params.path) path = params.path
    else if (this.object.spec.endpoint) path = this.object.spec.endpoint
    else path = `/${this.object.spec.object}${this.object.spec.object.slice(-1) !== 's' ? 's' : ''}`

    let url = this.#session.apiUrl + path
    const headers = {}

    if (params.id) url += `/${params.id}`

    if (typeof window !== 'undefined' && params.data) {
      let foundFile = false
      const formData = new FormData()

      const data = nestedQStringKeys(clone(params.data))
      Object.entries(data).forEach(([k, v]) => {
        if (!foundFile && v) foundFile = v.constructor === File
        formData.append(k, v)
      })

      if (foundFile) {
        params.data = formData
        headers['Content-Type'] = 'multipart/form-data'
      }
    }

    if (this.#session.apiKey || this.#session.authPass) {
      headers.Authorization = `Basic ${Buffer.from(
        `${this.#session.apiKey || ''}:${this.#session.authPass || ''}`,
        'binary',
      ).toString('base64')}`
    }

    const searchParams = buildSearchParams(
      params.params,
      this.object.defaultParams,
      this.#filters,
      this.#qfilters,
      this.#fields,
      this.#groupBys,
      this.#orderBys,
      this.#limit,
      this.#offset,
    )

    return new Promise((resolve, reject) => {
      axios({
        method,
        url,
        params: searchParams,
        data: params.data,
        headers: Object.assign(headers, this.constructor.defaultHeaders ?? {}),
        validateStatus: false,
      }).then((response) => {
        try {
          resolve(handleResponse(method, this.#session, response))
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  validateObjectType(obj = null) {
    if (!this.object) {
      if (!(obj instanceof Model)) throw Error('Missing object type')
      this.object = obj.constructor
    }

    if (obj instanceof Model && !(obj instanceof this.object))
      throw Error('Objects must be of the same type')
  }

  applyPolymorphic(obj) {
    return {
      ...(this.object.spec.polymorphic || {}),
      ...obj,
    }
  }

  getFilters() {
    return { ...this.#filters }
  }

  create(data) {
    if (Array.isArray(data)) {
      if (!data.length) throw Error('List must not be empty')

      data = {
        object: 'list',
        values: data.map(
          // eslint-disable-next-line no-sequences
          (o) => (this.validateObjectType(o), this.applyPolymorphic(o)),
        ),
      }
    } else {
      this.validateObjectType(data)
      data = this.applyPolymorphic(data)
    }

    return this.send('post', {
      data,
    })
  }

  update(data, updates) {
    if (Array.isArray(data)) {
      if (!data.length) throw Error('List must not be empty')

      const values = data.map(([obj, upd]) => {
        this.validateObjectType(obj)
        if (!obj.id) throw Error('id cannot be empty')
        return { id: obj.id, ...upd }
      })

      return this.send('put', { data: { object: 'list', values } })
    }

    if (updates) {
      this.validateObjectType(data)
      if (!data.id) throw Error('id cannot be empty')
      return this.send('put', {
        id: data.id,
        data: updates,
      })
    }

    this.validateObjectType()
    return this.send('put', {
      params: { mode: 'query' },
      data,
    })
  }

  delete(data) {
    if (Array.isArray(data)) {
      if (!data.length) throw Error('List must not be empty')

      const idFilter = data
        .map((obj) => {
          this.validateObjectType(obj)
          if (!obj.id) throw Error('id cannot be empty')
          return obj.id
        })
        .join('|')

      return this.send('delete', {
        params: { id: idFilter, mode: 'query' },
      })
    }

    if (data) {
      this.validateObjectType(data)
      if (!data.id) throw Error('id cannot be empty')
      return this.send('delete', { id: data.id })
    }

    if (data === undefined && this.object && Object.keys(this.#filters).length)
      return this.send('delete', { params: { mode: 'query' } })

    throw Error('Cannot perform delete')
  }

  select(...args) {
    if (!this.object) this.object = findObjectFromSelectFields(args)

    if (!this.object) throw Error('Missing object type')

    this.#fields = this.#fields.concat(args)
    return this
  }

  groupBy(...args) {
    this.#groupBys = this.#groupBys.concat(args)
    return this
  }

  orderBy(...args) {
    this.#orderBys = this.#orderBys.concat(args)
    return this
  }

  get(id) {
    if (!id) throw Error('id cannot be empty')
    this.validateObjectType()
    return this.send('get', {
      id,
    })
  }

  filterBy(...args) {
    const filters = this.#filters
    args.forEach((f) => {
      if (f instanceof Attr) f = f.toParam()

      Object.entries(f).forEach(([k, v]) => {
        if (!(k in filters)) filters[k] = []
        filters[k].push(v)
      })
    })
    return this
  }

  filter(...args) {
    this.#qfilters = this.#qfilters.concat(args)
    return this
  }

  limit(val) {
    this.#limit = val
    return this
  }

  offset(val) {
    this.#offset = val
    return this
  }

  all() {
    return this.send('get')
  }

  then(...args) {
    const request = this.send('get')
    return request.then(...args)
  }
}

export const testingExport = {}

if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID) {
  testingExport.buildSearchParams = buildSearchParams
  testingExport.handleResponse = handleResponse
  testingExport.findObjectFromSelectFields = findObjectFromSelectFields
}
