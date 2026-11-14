import { Hono } from 'hono'
import type { AppEnv } from '../app.ts'
import { listUnitsByDimension } from '../repos/units.ts'

export const unitsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await listUnitsByDimension(c.var.db)))
