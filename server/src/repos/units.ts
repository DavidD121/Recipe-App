import type { Database } from '../db/client.ts'

export type Unit = {
  id: string
  name: string
  abbreviation: string | null
  factorToBase: string
}

export type DimensionUnits = {
  dimension: string
  baseUnitName: string
  units: Unit[]
}

// Every unit, grouped under its dimension, smallest first (g, oz, lb, kg).
// Count units all have a factor of 1, so they fall back to alphabetical.
//
// unit_id is no use for ordering: the seed inserts through a join, and Postgres
// doesn't keep the VALUES order when it assigns identities.
export async function listUnitsByDimension(db: Database): Promise<DimensionUnits[]> {
  const rows = await db
    .selectFrom('units')
    .innerJoin('dimensions', 'dimensions.dimensionId', 'units.dimensionId')
    .select([
      'dimensions.name as dimension',
      'dimensions.baseUnitName',
      'units.unitId as id',
      'units.name',
      'units.abbreviation',
      'units.factorToBase',
    ])
    .orderBy('dimensions.dimensionId')
    .orderBy('units.factorToBase')
    .orderBy('units.name')
    .execute()

  const groups = new Map<string, DimensionUnits>()
  for (const { dimension, baseUnitName, ...unit } of rows) {
    let group = groups.get(dimension)
    if (!group) {
      group = { dimension, baseUnitName, units: [] }
      groups.set(dimension, group)
    }
    group.units.push(unit)
  }
  return [...groups.values()]
}
