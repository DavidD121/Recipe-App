import pg from 'pg'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// Every error response has this shape, whatever produced it.
export type ErrorBody = {
  error: { code: string; message: string; details?: unknown }
}

// Throw from a route or repo to send a specific error response.
export class HttpError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: string
  readonly details: unknown

  constructor(status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// Constraint violations the schema already enforces. Mapping them here means a
// route doesn't have to pre-check what the database will reject anyway.
const PG_ERRORS: Record<string, { status: ContentfulStatusCode; code: string; message: string }> = {
  '23505': { status: 409, code: 'conflict', message: 'That conflicts with an existing record.' },
  '23503': { status: 400, code: 'invalid_reference', message: 'That refers to a record that does not exist.' },
}

export function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } }
}

export function handleError(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json(errorBody(err.code, err.message, err.details), err.status)
  }
  if (err instanceof HTTPException) {
    return c.json(errorBody('http_error', err.message), err.status as ContentfulStatusCode)
  }
  if (err instanceof pg.DatabaseError) {
    const mapped = err.code ? PG_ERRORS[err.code] : undefined
    if (mapped) {
      // constraint is the only detail worth exposing; the rest describes the schema
      return c.json(errorBody(mapped.code, mapped.message, { constraint: err.constraint }), mapped.status)
    }
  }
  console.error(err)
  return c.json(errorBody('internal_error', 'Something went wrong.'), 500)
}
