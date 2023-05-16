export class ArmrestError extends Error {
  constructor(description, data) {
    if (data) description += `\n\n${JSON.stringify(data, null, 2)}`

    super(description)

    this.type = this.constructor.name
    this.data = data
    if (this.data && this.data.details) this.details = this.data.details

    if (typeof Error.captureStackTrace === 'function')
      Error.captureStackTrace(this, this.constructor)
    else this.stack = new Error(description).stack
  }

  get httpCode() {
    return this.constructor.httpCode
  }
}

export class UnknownResponse extends ArmrestError {}

export class BadRequest extends ArmrestError {
  static httpCode = 400
}

export class InvalidAttributes extends BadRequest {
  static httpCode = 400
}

export class Unauthorized extends ArmrestError {
  static httpCode = 401
}

export class Forbidden extends ArmrestError {
  static httpCode = 403
}

export class NotFound extends ArmrestError {
  static httpCode = 404
}

export class TooManyRequests extends ArmrestError {
  static httpCode = 429
}

export class InternalServerError extends ArmrestError {
  static httpCode = 500
}

export class ServiceUnavailable extends ArmrestError {
  static httpCode = 503
}

export default {
  UnknownResponse,
  ArmrestError,
  BadRequest,
  InvalidAttributes,
  Unauthorized,
  Forbidden,
  NotFound,
  TooManyRequests,
  InternalServerError,
  ServiceUnavailable,
}
