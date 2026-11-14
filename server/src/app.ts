import { Hono } from 'hono'
import type { Database } from './db/client.ts'
import { errorBody, handleError } from './lib/errors.ts'
import { unitsRoutes } from './routes/units.ts'

export type AppEnv = {
  Variables: { db: Database }
}

export type AppDeps = { db: Database }

// The database is injected rather than imported so tests can pass a
// transaction that is rolled back after each test.
//
// Routers are mounted in one chain, so the app's type carries every route.
// That's what the client's typed `hc<AppType>` reads.
export function createApp({ db }: AppDeps) {
  const api = new Hono<AppEnv>()
    .route('/units', unitsRoutes)

  const app = new Hono<AppEnv>()
    .use(async (c, next) => {
      c.set('db', db)
      await next()
    })
    .route('/api', api)

  app.notFound((c) => c.json(errorBody('not_found', `No route for ${c.req.method} ${c.req.path}`), 404))
  app.onError(handleError)
  return app
}

export type AppType = ReturnType<typeof createApp>
