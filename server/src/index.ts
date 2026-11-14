import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { config } from './config.ts'
import { createDb } from './db/client.ts'

const db = createDb()
const app = createApp({ db })

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api`)
})
