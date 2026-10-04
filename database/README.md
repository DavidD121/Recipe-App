# Database

Postgres 18 in Docker, with the schema and seed data applied on first boot.

## Start it

```bash
cd database
docker compose up -d
docker compose ps          # wait for "healthy"
```

Connection string for the API: `postgres://recipe:recipe@localhost:5432/recipe_app`

## Connect

```bash
docker compose exec db psql -U recipe -d recipe_app
```

Useful psql commands once you are in: `\dt` lists tables, `\d items` describes one,
`\df` lists functions, `\x` toggles expanded output for wide rows, `\q` quits.

## Reset after a schema change

**This is the one thing that trips people up.** The scripts in `init/` are run by the Postgres
image *only when the data directory is empty*. Editing `init/01-schema.sql` and restarting the
container does nothing, because the volume already has a database in it.

To apply a schema edit you have to drop the volume:

```bash
docker compose down -v     # the -v is what deletes the data
docker compose up -d
```

Anything you inserted by hand is destroyed by this. That tradeoff is fine while the schema is still
moving. Once it settles and there's data worth keeping, switch `init/` to numbered migrations
applied by a runner instead.

## Files

| File | Contents |
|---|---|
| `init/01-schema.sql` | Tables, indexes, constraints, `updated_at` triggers |
| `init/02-seed-reference.sql` | Dimensions, units with `factor_to_base`, items, densities, count weights |
| `init/03-seed-demo.sql` | Demo user, three recipes ported from `server/data/recipes.json`, a shopping list |
| `init/04-functions.sql` | `to_grams(item_id, amount, unit_id)`, the conversion function |
| `init/05-views.sql` | `shopping_list_combined`, one row per list item with lines rolled up |

## How unit conversion works

Every unit belongs to a dimension and carries `factor_to_base`, which is how many of that
dimension's base unit one of it is worth. Mass is based on grams, so a pound has
`factor_to_base = 453.592`. Volume is based on millilitres, so a cup has `236.588`.

Converting anything to grams takes at most two multiplications:

1. **Within the dimension.** `amount × factor_to_base`. Pure arithmetic against the unit's own row.
2. **Across dimensions.** Volume to mass needs the item's `grams_per_ml`. Count to mass needs a row
   in `weights_per_count`. Mass is already grams and skips this step.

Everything lands in grams, which is what makes two shopping list lines comparable.

Count units are the exception to step 1: they all have `factor_to_base = 1`. A clove, a head and an
egg all have dimension `count` but they count different things, so no universal factor relates them.
`weights_per_count` is the only route from a count to a mass, and each row reads "one `<unit>` of
`<item>` weighs this much".

When a density or a count weight is missing, the arithmetic produces NULL rather than an error.
That NULL is the signal that two lines cannot be combined and must be displayed separately.

## Combining a shopping list

`shopping_list_combined` is what the API reads. One row per item per list:

```sql
select item_name, can_combine, total_grams, lines
from shopping_list_combined
where shopping_list_id = 1;
```

The contract:

- `can_combine = true` — every line converted. Read `total_grams`.
- `can_combine = false` — at least one line could not convert. `total_grams` is NULL and the
  client should render the entries in `lines` separately.
- `lines` is always present, one JSON entry per original row in `sort_order`, each carrying its
  own `grams` (null when that line is the one that failed) plus `recipeName` and `checkedAt`.

`total_grams` is NULL rather than a partial sum on purpose. `sum()` skips NULLs instead of
propagating them, so a partial total would look authoritative while silently dropping the lines
that failed. The `case` guard makes it impossible to read a number that doesn't mean anything.

Formatting is the client's job. The view returns amounts and unit names, not display strings,
because pluralisation, abbreviation and locale are presentation decisions that shouldn't require a
database change. `"2 cups"` belongs in TypeScript.

The seeded list exercises both branches: Shredded Cheese arrives as 16 oz from one recipe and
1 lb from another and combines to 907.184 g, while Tortilla Chips arrives as 1 lb and 2 cups and
cannot, since chips have no `grams_per_ml`.
