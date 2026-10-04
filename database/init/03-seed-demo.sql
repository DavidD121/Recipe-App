-- Demo content, ported from server/data/recipes.json so there is something real
-- to query on day one.

-- ============================================================
-- demo user
-- ============================================================
--
-- password_hash is null: auth is not built yet, and a fake hash would be worse
-- than an honest null. An OAuth-only account looks exactly like this.

insert into users (username, name, email, bio, email_verified_at) values
  ('david', 'David', 'david@example.com', 'Learning Postgres by rebuilding my recipe app.', now());

-- ============================================================
-- recipes
-- ============================================================
--
-- Slugs are immutable and generated at insert. The random suffix is what makes
-- them unguessable, so renaming a recipe never breaks a shared link.

insert into recipes (author_id, slug, name, description, servings, prep_minutes, cook_minutes)
select u.user_id, v.slug, v.name, v.description, v.servings, v.prep_minutes, v.cook_minutes
from (values
  ('easy-cheesy-mac-a7f3', 'Easy Cheesy Mac',
   $md$J Kenji Lopez Alt's 3 Ingredient mac n cheese, except I opt to use shredded cheese because the starches emulsify better

DO NOT USE SHREDDED CHEESE THAT HAS CELLULOSE! STARCHES ARE WHAT HELP MAKE THE SAUCE WORK!$md$,
   4, 5, 20),
  ('nachos-b2c1', 'Nachos', null, 4, 10, 15),
  ('cheese-sauce-9d4e', 'Cheese Sauce', null, 2, 2, 10)
) as v(slug, name, description, servings, prep_minutes, cook_minutes)
cross join users u
where u.username = 'david';

-- ============================================================
-- recipe ingredients
-- ============================================================
--
-- Note what happens to "oz" here. The JSON stored 16 oz of cheese and 12 oz of
-- evaporated milk as the same string, but they are different units: the cheese
-- is weight, the milk is a 12 fluid ounce can. The old shape could never have
-- told them apart. Here they land in different dimensions.
--
-- Cheese Sauce has ingredients with no amount and no unit at all. That is the
-- "to taste" case, and recipe_items_amount_needs_unit permits it.

insert into recipe_items (recipe_id, item_id, amount, unit_id, sort_order)
select r.recipe_id, i.item_id, v.amount, u.unit_id, v.sort_order
from (values
  ('Easy Cheesy Mac', 'Shredded Cheese', 16, 'ounce',       1),
  ('Easy Cheesy Mac', 'Evaporated Milk', 12, 'fluid ounce', 2),
  ('Easy Cheesy Mac', 'Pasta',            1, 'pound',       3),
  ('Nachos',          'Shredded Cheese',  1, 'pound',       1),
  ('Nachos',          'Ground Beef',      1, 'pound',       2),
  ('Nachos',          'Tortilla Chips',   1, 'pound',       3),
  ('Cheese Sauce',    'Shredded Cheese', null, null,        1),
  ('Cheese Sauce',    'Milk',            null, null,        2)
) as v(recipe_name, item_name, amount, unit_name, sort_order)
join recipes r on r.name = v.recipe_name
join items i on i.name = v.item_name
left join units u on u.name = v.unit_name;

-- ============================================================
-- recipe steps
-- ============================================================
--
-- recipes.json had no instructions, so these are written for the demo. They
-- exist mainly so recipe_steps and its deferrable ordering constraint are
-- exercised by real rows.

insert into recipe_steps (recipe_id, step, sort_order)
select r.recipe_id, v.step, v.sort_order
from (values
  ('Easy Cheesy Mac', 'Boil the pasta in heavily salted water until just shy of al dente.', 1),
  ('Easy Cheesy Mac', 'Drain, reserving a splash of the pasta water.', 2),
  ('Easy Cheesy Mac', 'Return to low heat, add the evaporated milk and cheese, and stir until the sauce emulsifies.', 3)
) as v(recipe_name, step, sort_order)
join recipes r on r.name = v.recipe_name;

-- ============================================================
-- shopping list
-- ============================================================
--
-- Built from Easy Cheesy Mac and Nachos, plus two hand-added lines.
--
-- Three cases are deliberately represented:
--   Shredded Cheese  16 oz + 1 lb    both mass, so it combines to 2 lb
--   Tortilla Chips   1 lb + 2 cups   mass and volume with no density: cannot combine
--   Egg              1 dozen         count, converts only via weights_per_count

insert into shopping_lists (user_id, name, description)
select user_id, 'Weekly Shop', 'Mac and nachos night' from users where username = 'david';

insert into shopping_list_items
  (shopping_list_id, item_id, amount, unit_id, recipe_id, recipe_name_snapshot, sort_order)
select sl.shopping_list_id, i.item_id, v.amount, u.unit_id, r.recipe_id, r.name, v.sort_order
from (values
  ('Shredded Cheese', 16, 'ounce',       'Easy Cheesy Mac', 1),
  ('Evaporated Milk', 12, 'fluid ounce', 'Easy Cheesy Mac', 2),
  ('Pasta',            1, 'pound',       'Easy Cheesy Mac', 3),
  ('Shredded Cheese',  1, 'pound',       'Nachos',          4),
  ('Ground Beef',      1, 'pound',       'Nachos',          5),
  ('Tortilla Chips',   1, 'pound',       'Nachos',          6)
) as v(item_name, amount, unit_name, recipe_name, sort_order)
cross join shopping_lists sl
join items i on i.name = v.item_name
join units u on u.name = v.unit_name
join recipes r on r.name = v.recipe_name
where sl.name = 'Weekly Shop';

-- Hand-added lines. recipe_id is null, which is what "added by hand" means,
-- and sli_recipe_needs_snapshot allows the snapshot to be null alongside it.
insert into shopping_list_items
  (shopping_list_id, item_id, amount, unit_id, sort_order)
select sl.shopping_list_id, i.item_id, v.amount, u.unit_id, v.sort_order
from (values
  ('Tortilla Chips', 2, 'cup',   7),
  ('Egg',            1, 'dozen', 8)
) as v(item_name, amount, unit_name, sort_order)
cross join shopping_lists sl
join items i on i.name = v.item_name
join units u on u.name = v.unit_name
where sl.name = 'Weekly Shop';
