-- Recipe app schema.
--
-- Conventions used throughout:
--   snake_case            unquoted identifiers fold to lowercase in Postgres
--   bigint identity       readable keys; public URLs use slugs instead
--   text, not varchar(n)  no performance difference; length limits go in CHECKs
--   timestamptz           plain `timestamp` silently discards the offset
--   numeric for amounts   float would make 1/3 cup into 0.30000000000000004
--
-- to_grams() is deliberately NOT here. It is written as an exercise once this
-- schema and its seed data exist. See 04-functions.sql.

-- ============================================================
-- helpers
-- ============================================================

-- Postgres has no ON UPDATE clause like MySQL, so updated_at needs a trigger.
create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- units
-- ============================================================

create table dimensions (
  dimension_id    bigint generated always as identity primary key,
  name            text not null unique,
  base_unit_name  text not null   -- documents what factor_to_base is relative to
);

-- factor_to_base: how many base units one of this unit is worth.
-- 1 lb = 453.592 g, so pounds have factor_to_base = 453.592.
--
-- This only carries real meaning for mass and volume, which have a genuine
-- shared base. Count units are all 1: a clove, a head and an egg all have
-- dimension 'count' but they count different things, so no universal factor
-- relates them. Count converts only via weights_per_count.
create table units (
  unit_id         bigint generated always as identity primary key,
  dimension_id    bigint not null references dimensions,
  name            text not null unique,
  abbreviation    text unique,
  factor_to_base  numeric not null check (factor_to_base > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- users and auth
-- ============================================================

create table users (
  user_id            bigint generated always as identity primary key,
  username           text not null unique
                       check (username = lower(username) and username ~ '^[a-z0-9_-]{3,30}$'),
  name               text not null,
  email              text,          -- nullable so account deletion can scrub it
  password_hash      text,          -- null for oauth-only accounts
  bio                text,
  email_verified_at  timestamptz,   -- timestamp beats a boolean: answers "is it" and "when"
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Case-insensitive email uniqueness. Postgres treats NULLs as distinct in
-- unique indexes, so any number of scrubbed accounts coexist without colliding.
create unique index users_email_lower_key on users (lower(email));

create table user_identities (
  user_identity_id  bigint generated always as identity primary key,
  user_id           bigint not null references users on delete cascade,
  provider          text not null check (provider in ('google', 'github')),
  provider_user_id  text not null,
  created_at        timestamptz not null default now(),
  unique (provider, provider_user_id)
);

-- Opaque session tokens, revocable by deleting the row. Store the HASH of the
-- token, never the token: a readable session token is a password.
create table sessions (
  session_id    bigint generated always as identity primary key,
  user_id       bigint not null references users on delete cascade,
  token_hash    text not null unique,
  expires_at    timestamptz not null,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on sessions (user_id);

-- One table with a purpose column rather than two near-identical tables.
-- Same hashing rule as sessions.
create table user_tokens (
  user_token_id  bigint generated always as identity primary key,
  user_id        bigint not null references users on delete cascade,
  purpose        text not null check (purpose in ('password_reset', 'email_verification')),
  token_hash     text not null unique,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index on user_tokens (user_id);

-- ============================================================
-- items
-- ============================================================

-- canonical_item_id lets a typo be repaired without deleting a row that other
-- people's recipes point at. NULL means this is a real item; set means it is an
-- alias that resolves elsewhere. Resolve with coalesce(canonical_item_id, item_id).
--
-- Not enforced here: alias chains (an alias pointing at another alias). A CHECK
-- cannot see other rows. Enforce in the API or add a trigger later.
create table items (
  item_id            bigint generated always as identity primary key,
  name               text not null,
  canonical_item_id  bigint references items,
  grams_per_ml       numeric check (grams_per_ml > 0),  -- null = density unknown
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint items_no_self_alias
    check (canonical_item_id is distinct from item_id),
  constraint items_alias_has_no_density
    check (canonical_item_id is null or grams_per_ml is null)
);

create unique index items_name_lower_key on items (lower(name));
create index on items (canonical_item_id);

-- "One <unit> of <item> weighs this much." One clove of garlic is 3 g.
-- Composite PK is correct here: it is a genuine natural key, not a shortcut.
create table weights_per_count (
  item_id         bigint not null references items on delete cascade,
  unit_id         bigint not null references units on delete cascade,
  grams_per_item  numeric not null check (grams_per_item > 0),
  created_at      timestamptz not null default now(),
  primary key (item_id, unit_id)
);

-- ============================================================
-- recipes
-- ============================================================

-- author_id RESTRICTs rather than CASCADEs. Users are soft-deleted and scrubbed,
-- so a hard delete should fail loudly instead of destroying public recipes that
-- other people have forked or added to their shopping lists.
create table recipes (
  recipe_id     bigint generated always as identity primary key,
  author_id     bigint not null references users on delete restrict,
  slug          text not null unique,   -- immutable, generated at insert; renaming must not break links
  name          text not null,
  description   text,
  image_link    text,
  servings      integer check (servings > 0),
  prep_minutes  integer check (prep_minutes >= 0),
  cook_minutes  integer check (cook_minutes >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on recipes (author_id);

-- Surrogate PK, not (recipe_id, item_id): a recipe may legitimately use the same
-- ingredient twice, e.g. flour for the dough and flour for dusting.
create table recipe_items (
  recipe_item_id  bigint generated always as identity primary key,
  recipe_id       bigint not null references recipes on delete cascade,
  item_id         bigint not null references items on delete restrict,
  amount          numeric check (amount > 0),   -- null means "to taste"
  unit_id         bigint references units on delete restrict,
  sort_order      integer not null,
  note            text,                          -- "finely chopped"
  created_at      timestamptz not null default now(),
  constraint recipe_items_amount_needs_unit
    check (amount is null or unit_id is not null),
  -- DEFERRABLE lets a reorder run as a single UPDATE without transiently colliding
  constraint recipe_items_order_key unique (recipe_id, sort_order) deferrable initially deferred
);
create index on recipe_items (recipe_id);
create index on recipe_items (item_id);

create table recipe_steps (
  recipe_step_id  bigint generated always as identity primary key,
  recipe_id       bigint not null references recipes on delete cascade,
  step            text not null,
  sort_order      integer not null,
  created_at      timestamptz not null default now(),
  constraint recipe_steps_order_key unique (recipe_id, sort_order) deferrable initially deferred
);
create index on recipe_steps (recipe_id);

-- ============================================================
-- shopping lists
-- ============================================================

create table shopping_lists (
  shopping_list_id  bigint generated always as identity primary key,
  user_id           bigint not null references users on delete cascade,
  name              text not null,
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on shopping_lists (user_id);

-- amount and unit_id are a SNAPSHOT taken when the recipe was added. They do not
-- follow later edits by the recipe's author. A shopping list records what you
-- decided to buy, it is not a live view of someone else's document.
--
-- recipe_name_snapshot exists so the line still reads "Easy Cheesy Mac" after the
-- author deletes the recipe and ON DELETE SET NULL clears recipe_id.
create table shopping_list_items (
  shopping_list_item_id  bigint generated always as identity primary key,
  shopping_list_id       bigint not null references shopping_lists on delete cascade,
  item_id                bigint not null references items on delete restrict,
  amount                 numeric check (amount > 0),
  unit_id                bigint references units on delete restrict,
  recipe_id              bigint references recipes on delete set null,  -- null = added by hand
  recipe_name_snapshot   text,
  checked_at             timestamptz,   -- null = not yet in the trolley
  sort_order             integer not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint sli_amount_needs_unit
    check (amount is null or unit_id is not null),
  constraint sli_recipe_needs_snapshot
    check (recipe_id is null or recipe_name_snapshot is not null)
);
create index on shopping_list_items (shopping_list_id);
create index on shopping_list_items (recipe_id);

-- ============================================================
-- updated_at triggers
-- ============================================================

create trigger set_updated_at before update on users
  for each row execute function set_updated_at();
create trigger set_updated_at before update on units
  for each row execute function set_updated_at();
create trigger set_updated_at before update on items
  for each row execute function set_updated_at();
create trigger set_updated_at before update on recipes
  for each row execute function set_updated_at();
create trigger set_updated_at before update on shopping_lists
  for each row execute function set_updated_at();
create trigger set_updated_at before update on shopping_list_items
  for each row execute function set_updated_at();
