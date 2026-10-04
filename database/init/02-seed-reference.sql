-- Reference data. The app cannot function without dimensions and units.

-- ============================================================
-- dimensions
-- ============================================================

insert into dimensions (name, base_unit_name) values
  ('mass',   'gram'),
  ('volume', 'millilitre'),
  ('count',  'item');

-- ============================================================
-- units
-- ============================================================
--
-- Mass and volume factors are physics and apply to everything.
-- Count factors are all 1 on purpose: see the comment on the units table.
-- "1 dozen eggs" resolves through weights_per_count(egg, dozen), not by
-- multiplying weights_per_count(egg, each) by twelve.

insert into units (dimension_id, name, abbreviation, factor_to_base)
select d.dimension_id, v.name, v.abbreviation, v.factor_to_base
from (values
  -- mass, base = gram
  ('mass',   'gram',         'g',     1),
  ('mass',   'kilogram',     'kg',    1000),
  ('mass',   'ounce',        'oz',    28.3495),
  ('mass',   'pound',        'lb',    453.592),
  -- volume, base = millilitre (US customary volumes)
  ('volume', 'millilitre',   'ml',    1),
  ('volume', 'litre',        'l',     1000),
  ('volume', 'teaspoon',     'tsp',   4.92892),
  ('volume', 'tablespoon',   'tbsp',  14.7868),
  ('volume', 'fluid ounce',  'fl oz', 29.5735),
  ('volume', 'cup',          'cup',   236.588),
  -- count, every factor is 1
  ('count',  'each',         'ea',    1),
  ('count',  'dozen',        'doz',   1),
  ('count',  'clove',        null,    1),
  ('count',  'sprig',        null,    1),
  ('count',  'pinch',        null,    1)
) as v(dimension, name, abbreviation, factor_to_base)
join dimensions d on d.name = v.dimension;

-- ============================================================
-- items
-- ============================================================
--
-- grams_per_ml is the density that lets a volume convert to a mass. NULL means
-- unknown, which is not a failure: it is the signal that two lines using
-- different dimensions cannot be combined and must be shown separately.

insert into items (name, grams_per_ml) values
  -- common ingredients with well-known densities
  ('Water',              1.00),
  ('All-Purpose Flour',  0.53),
  ('Granulated Sugar',   0.85),
  ('Honey',              1.42),
  ('Milk',               1.03),
  ('Vegetable Oil',      0.92),
  ('Evaporated Milk',    1.07),
  -- ingredients that are bought by weight or count; density left unknown
  ('Shredded Cheese',    null),
  ('Pasta',              null),
  ('Ground Beef',        null),
  ('Tortilla Chips',     null),
  ('Egg',                null),
  ('Garlic',             null);

-- Worked examples of the alias mechanism from items.canonical_item_id.
-- Someone typos an ingredient, or adds the plural of one that already exists.
-- Rather than delete the row, since other people's recipes may point at it,
-- point it at the real item. Queries resolve with
-- coalesce(canonical_item_id, item_id), so lines using either row combine.
--
-- These three are chosen to cover all three conversion paths, so a broken
-- alias resolution cannot pass unnoticed:
--
--   Shreddded Cheese  -> target has no density and no count weight, so only
--                        the mass path is reachable through it
--   All-Purpose Flor  -> target has grams_per_ml, so it exercises volume
--   Eggs              -> target has weights_per_count rows, so it exercises count
--
-- Without the last two, to_grams could ignore canonical_item_id entirely and
-- every test would still return NULL. A fixture that cannot fail tests nothing.
insert into items (name, canonical_item_id)
select v.alias, i.item_id
from (values
  ('Shreddded Cheese', 'Shredded Cheese'),
  ('All-Purpose Flor', 'All-Purpose Flour'),
  ('Eggs',             'Egg')
) as v(alias, real_name)
join items i on i.name = v.real_name;

-- ============================================================
-- weights per count
-- ============================================================
--
-- The only way a count unit reaches grams. Each row reads:
-- "one <unit> of <item> weighs <grams_per_item> grams".

insert into weights_per_count (item_id, unit_id, grams_per_item)
select i.item_id, u.unit_id, v.grams_per_item
from (values
  ('Egg',    'each',  50),
  ('Egg',    'dozen', 600),
  ('Garlic', 'clove', 3)
) as v(item_name, unit_name, grams_per_item)
join items i on i.name = v.item_name
join units u on u.name = v.unit_name;
