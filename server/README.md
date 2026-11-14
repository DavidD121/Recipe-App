# Server

The REST API over the Postgres database in `../database`. It uses Hono for HTTP and Kysely for
queries, and Node runs the TypeScript directly, with no build step.

## Run it

You need Node 24+ and Docker. From the repo root:

```bash
cd database && docker compose up -d && cd ..   # wait for "healthy"
npm install
npm run dev                                    # http://localhost:3000/api
```

`DATABASE_URL` and `PORT` override the defaults, which match `database/docker-compose.yml`.

## Commands

Run these from the repo root, or with `-w server`.

| Command | |
|---|---|
| `npm run dev` | API with restart on change |
| `npm test` | Vitest against the running database |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run codegen` | regenerate `src/db/types.ts` from the live schema |

## Database types

`src/db/types.ts` is generated, so never edit it by hand. After changing anything in
`database/init/`:

```bash
cd database && docker compose down -v && docker compose up -d && cd ..
npm run codegen
```

The reset is needed because the init scripts only run on an empty volume. Without it, codegen
reads the old schema and reports nothing wrong. See [ADR 0001](../docs/adr/0001-sql-first-schema-with-generated-types.md)
for why the SQL, not TypeScript, owns the schema.

Column and table names are camelCase in TypeScript (`factorToBase`). `CamelCasePlugin` maps them
to snake_case in SQL. `bigint` and `numeric` are strings everywhere, including JSON responses.

## Tests

Tests need the database running. Each test gets its own transaction, and the app under test is
built on it, so requests read and write real tables and the transaction rolls back when the test
ends. The seed data is never changed. Use the `test` exported from `test/fixtures.ts`, which
provides `app` and `db`:

```ts
test('lists units', async ({ app }) => {
  const res = await app.request('/api/units')
  expect(res.status).toBe(200)
})
```

Test through HTTP (`app.request`) and assert on status and JSON. Use `db` only to set up state
that no endpoint can create yet.

## Layout

| Path | |
|---|---|
| `src/app.ts` | `createApp({ db })`: mounts routers and the error handler, exports `AppType` |
| `src/routes/` | one Hono router per resource: validation, auth, status codes |
| `src/repos/` | queries, each taking a `Database` (or a transaction) |
| `src/lib/errors.ts` | `HttpError` and the `{ error: { code, message, details? } }` contract |
| `src/db/` | Kysely client and generated types |

Throw `HttpError` for an expected failure. Unique violations become 409 and foreign-key violations
become 400 automatically. Anything else is logged and returned as a 500.
