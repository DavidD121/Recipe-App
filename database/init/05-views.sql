-- Views. These load after 04-functions.sql because they call to_grams().

-- One row per (shopping list, item), with the item's lines rolled up.
--
-- Contract for the API:
--   can_combine  true  -> read total_grams, ignore lines except for provenance
--                false -> total_grams is NULL, render the entries in lines
--   lines        always present, one entry per original row, in sort_order
--
-- total_grams is deliberately NULL when the group cannot combine. sum() skips
-- NULLs rather than propagating them, so a partial total would look
-- authoritative while silently omitting every line that failed to convert.
-- Better to return no answer than a plausible wrong one.
--
-- Grouping resolves items.canonical_item_id, so an aliased duplicate and the
-- item it points at land in the same group instead of appearing twice.
--
-- shopping_list_id is a grouping key, which lets Postgres push a
-- "where shopping_list_id = ?" filter down below the aggregation rather than
-- combining every list in the table and discarding the rest.
create or replace view shopping_list_combined as
with lines as (
  select sli.shopping_list_id,
         c.item_id               as item_id,
         c.name                  as item_name,
         sli.shopping_list_item_id,
         sli.amount,
         sli.sort_order,
         u.name                  as unit_name,
         u.abbreviation          as unit_abbreviation,
         sli.unit_id,
         sli.recipe_id,
         sli.recipe_name_snapshot,
         sli.checked_at,
         -- Called once per line and named here, so the aggregates below can
         -- each reuse it. A SELECT list cannot reference its own aliases, so
         -- a CTE is how you name an intermediate value in SQL.
         to_grams(sli.item_id, sli.amount, sli.unit_id) as grams
  from shopping_list_items sli
  join items i on i.item_id = sli.item_id
  join items c on c.item_id = coalesce(i.canonical_item_id, i.item_id)
  left join units u on u.unit_id = sli.unit_id
)
select shopping_list_id,
       item_id,
       item_name,
       bool_and(grams is not null) as can_combine,
       case when bool_and(grams is not null) then sum(grams) end as total_grams,
       -- Everything numeric is cast to text. jsonb would otherwise store these as JSON
       -- numbers, and JSON.parse on the client side turns those into IEEE doubles:
       -- bigint ids past 2^53 lose precision, and 453.592 stops being exactly 453.592.
       -- Text keeps both lossless, and matches how `pg` already returns bigint and
       -- numeric columns outside of JSON.
       jsonb_agg(jsonb_build_object(
        'id',                shopping_list_item_id::text,
        'amount',            amount::text,
        'unitId',            unit_id::text,
        'unitName',          unit_name::text,
        'unitAbbreviation',  unit_abbreviation::text,
        'grams',             grams::text,
        'recipeId',          recipe_id::text,
        'recipeName',        recipe_name_snapshot,
        'checkedAt',         checked_at
       ) order by sort_order) as lines
from lines
group by shopping_list_id, item_id, item_name;
