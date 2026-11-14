import pg from 'pg'
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import { config } from '../config.ts'
import type { DB } from './types.ts'

// Routes and repos take a Database, never a concrete Kysely instance, so a test
// can hand them a transaction instead (ControlledTransaction extends Kysely).
export type Database = Kysely<DB>

// CamelCasePlugin pairs with `kysely-codegen --camel-case`: the generated types
// say `factorToBase`, and the plugin rewrites it to `factor_to_base` on the wire.
//
// pg is left on its defaults for bigint and numeric, which arrive as strings.
// That is deliberate and matches the text casting in shopping_list_combined.
export function createDb(connectionString = config.databaseUrl): Database {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString }) }),
    plugins: [new CamelCasePlugin()],
  })
}
