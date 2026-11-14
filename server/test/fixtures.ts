import { test as base } from 'vitest'
import { createApp } from '../src/app.ts'
import { createDb } from '../src/db/client.ts'

// Tests run against the real seeded database from database/docker-compose.yml.
//
// Each test gets its own transaction, and the app under test is built on it, so
// every query a request makes is inside that transaction. Rolling it back
// afterwards leaves the seed data exactly as it was, whatever the test wrote.
export const test = base
  .extend('pool', { scope: 'worker' }, async ({}, { onCleanup }) => {
    const pool = createDb()
    onCleanup(() => pool.destroy())
    return pool
  })
  .extend('db', async ({ pool }, { onCleanup }) => {
    const trx = await pool.startTransaction().execute()
    onCleanup(() => trx.rollback().execute())
    return trx
  })
  .extend('app', async ({ db }) => createApp({ db }))

export { expect, describe } from 'vitest'
