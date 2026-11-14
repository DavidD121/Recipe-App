import { describe, expect, test } from './fixtures.ts'

describe('error contract', () => {
  test('an unknown route is a 404 in the error shape', async ({ app }) => {
    const res = await app.request('/api/nope')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: { code: 'not_found', message: 'No route for GET /api/nope' },
    })
  })

  // No endpoint writes yet, so these mount a throwaway route that hits the
  // constraint directly. It still goes through the real app's error handler.
  test('a unique violation is a 409', async ({ app }) => {
    app.get('/test/duplicate', async (c) => {
      await c.var.db.insertInto('dimensions').values({ name: 'mass', baseUnitName: 'gram' }).execute()
      return c.body(null, 204)
    })

    const res = await app.request('/test/duplicate')

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: {
        code: 'conflict',
        message: 'That conflicts with an existing record.',
        details: { constraint: 'dimensions_name_key' },
      },
    })
  })

  test('a foreign key violation is a 400', async ({ app }) => {
    app.get('/test/dangling', async (c) => {
      await c.var.db.insertInto('units').values({ dimensionId: '999999', name: 'nothing', factorToBase: 1 }).execute()
      return c.body(null, 204)
    })

    const res = await app.request('/test/dangling')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: {
        code: 'invalid_reference',
        message: 'That refers to a record that does not exist.',
        details: { constraint: 'units_dimension_id_fkey' },
      },
    })
  })
})
