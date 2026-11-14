import { hc } from 'hono/client'
import type { AppType } from '../src/app.ts'
import { expect, test } from './fixtures.ts'

// The React client will call the API through hc<AppType>. This pins that the
// exported type carries the routes and response shapes. If it stopped doing so,
// the property accesses below would fail typecheck, not just this test.
test('the typed client reaches routes with inferred response types', async ({ app }) => {
  const client = hc<AppType>('http://localhost', {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init),
  })

  const res = await client.api.units.$get()
  const [mass] = await res.json()

  expect(mass?.dimension).toBe('mass')
  expect(mass?.units[0]?.factorToBase).toBe('1')
})
