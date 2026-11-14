import { describe, expect, test } from './fixtures.ts'

describe('GET /api/units', () => {
  test('groups every unit under its dimension, smallest first', async ({ app }) => {
    const res = await app.request('/api/units')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.map((d: { dimension: string }) => d.dimension)).toEqual(['mass', 'volume', 'count'])

    const [mass, volume, count] = body
    const names = (d: { units: { name: string }[] }) => d.units.map((u) => u.name)
    expect(mass.baseUnitName).toBe('gram')
    expect(names(mass)).toEqual(['gram', 'ounce', 'pound', 'kilogram'])
    expect(volume.baseUnitName).toBe('millilitre')
    expect(names(volume)).toEqual(['millilitre', 'teaspoon', 'tablespoon', 'fluid ounce', 'cup', 'litre'])
    // every count factor is 1, so these are alphabetical
    expect(names(count)).toEqual(['clove', 'dozen', 'each', 'pinch', 'sprig'])
  })

  test('returns ids and factors as exact strings', async ({ app }) => {
    const body = await (await app.request('/api/units')).json()
    const pound = body[0].units.find((u: { name: string }) => u.name === 'pound')

    expect(pound).toEqual({
      id: expect.any(String),
      name: 'pound',
      abbreviation: 'lb',
      factorToBase: '453.592',
    })
  })

  test('returns a null abbreviation for units that have none', async ({ app }) => {
    const body = await (await app.request('/api/units')).json()
    const clove = body[2].units.find((u: { name: string }) => u.name === 'clove')

    expect(clove.abbreviation).toBeNull()
  })
})

// The two tests below rely on running in order: the first writes, the second
// checks the write didn't survive the first test's rollback.
describe('test isolation', () => {
  test('a test can write to the database', async ({ app, db }) => {
    const { dimensionId } = await db
      .insertInto('dimensions')
      .values({ name: 'temperature', baseUnitName: 'kelvin' })
      .returning('dimensionId')
      .executeTakeFirstOrThrow()
    await db.insertInto('units').values({ dimensionId, name: 'kelvin', factorToBase: 1 }).execute()

    const body = await (await app.request('/api/units')).json()
    expect(body.map((d: { dimension: string }) => d.dimension)).toContain('temperature')
  })

  test('and the next test does not see it', async ({ app }) => {
    const body = await (await app.request('/api/units')).json()
    expect(body.map((d: { dimension: string }) => d.dimension)).toEqual(['mass', 'volume', 'count'])
  })
})
