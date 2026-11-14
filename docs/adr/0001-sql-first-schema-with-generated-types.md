# SQL-first schema with generated types

The hand-written SQL in `database/init/` is the only definition of the schema, and the API's
TypeScript types are generated from the live database by kysely-codegen. The schema's important
behaviour lives in the database: CHECK constraints, deferrable ordering keys, the `to_grams()`
conversion function and the `shopping_list_combined` view. An ORM that owns the schema (Drizzle,
Prisma) would either mirror that SQL in a second source of truth or treat views and functions as
second-class. Kysely is a query builder, not an ORM, so it gives typed queries over whatever the
SQL defines.

## Consequences

- A schema change is a SQL edit, then a volume reset (see `database/README.md`), then `npm run codegen`. Skip the last step and the types silently describe the old schema.
- The generated types are committed, so type-checking and CI don't need a live database.
- `bigint` and `numeric` are `string` in TypeScript and in JSON, end to end. That's deliberate: it keeps ids and amounts exact, and it matches the view's text casting.
- Unit conversion is never reimplemented in TypeScript. The API reads `to_grams()` and the view.
