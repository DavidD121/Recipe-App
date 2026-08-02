# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server — REQUIRED for persistence (see below)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # serves dist/ — the storage API does NOT run here
```

**There is no test framework installed.** Pure logic in `src/items.ts` has been verified ad hoc with `npx --yes tsx <script>` against a scratch file of `node:assert` calls; that runs from the npx cache without touching `package.json`. If tests become a standing need, add a real runner rather than growing that pattern.

`npm run build` is the meaningful gate — it runs `tsc -b` first, and the tsconfig flags below make it catch things `npm run dev` happily ignores.

## Persistence: a dev-server-only storage API

A browser can't write to disk, so `vite.config.ts` registers a `jsonFileApi(route, relativePath)` middleware factory twice:

| Route | File |
|---|---|
| `/api/recipes` | `data/recipes.json` |
| `/api/shopping-list` | `data/shopping-list.json` |

`GET` reads the file (seeding it with `[]` on `ENOENT`); `PUT` overwrites it wholesale, pretty-printed. **Whole-array replace, not per-item routes** — the client holds the full list in state, which keeps the server trivial and sidesteps read-modify-write races.

This lives in the Vite dev server, so **`npm run preview` and any deployed `dist/` will load and save nothing.** That's an accepted prototype tradeoff. Moving to a real backend is contained: the client only touches these endpoints through the four functions in `src/api.ts`.

To add a third store, register another `jsonFileApi(...)` and add a load/save pair in `src/api.ts` — don't hand-roll a new middleware.

## Architecture

**State lives in `App`, pages are given data.** `src/App.tsx` loads both `recipes` and `shoppingList` in one `Promise.all` on mount, owns `persist` / `persistShoppingList` (each sets state then writes the file), and passes data plus change callbacks down. Pages own only their own UI state (which recipe is being edited, whether the list editor is open). A shared `status` string renders above the routes, so a load/save failure on either store surfaces the same way.

Routing is `react-router` v8 (`BrowserRouter` in `src/main.tsx`): `/` → `RecipesPage`, `/shopping-list` → `ShoppingListPage`, `*` → redirect to `/`. Note `react-router-dom` is the legacy package name — v8 consolidated the DOM exports into `react-router`.

**One vocabulary for autocomplete.** `App` derives `nameSuggestions` / `unitSuggestions` via `uniqueSorted` from recipe ingredients *and* shopping list items combined, then passes both arrays to both pages. This is deliberate — the point of the datalists is that "oz" doesn't drift into "ounces" across screens. Don't re-derive suggestions locally in a page.

### The `Item` / `Row` / `ShoppingItem` triangle

`src/items.ts` is the center of gravity. Three shapes that are easy to confuse:

- **`Item`** (`src/types.ts`) — `{ name, amount: number, unit }`. A recipe ingredient. `unit` is optional in practice (empty string) since "2 eggs" needs none; the unit is *not* baked into the name.
- **`ShoppingItem extends Item`** — adds `source?: { recipeId, recipeName }`. No `source` means added by hand. `recipeName` is denormalized on purpose so the cart still reads correctly after a recipe is renamed or deleted.
- **`Row`** — the *editing* shape. `amount` is a **string** here so a field can be empty or mid-typed; `Number()` conversion happens only in `parseRows`.

`rowsFrom(items) → Row[]` and `parseRows(rows) → { items } | { error }` are the only bridge between them. Two things that look like details but aren't:

1. **`Row` carries `source` straight through.** The shopping list's "Edit List" rebuilds the entire array from rows — without the passthrough, every recipe association would be silently stripped on save.
2. **`parseRows` does not require at least one item.** An all-blank set parses to `[]`, which the shopping list allows. `RecipeForm` adds its own "at least one ingredient" check, because that rule is recipe-specific.

Its error strings are deliberately context-free ("Every row needs a name.") since both screens surface them.

### Component reuse

`ItemRows` is the shared name/amount/unit grid — used by `RecipeForm`, the shopping list editor, and `AddToListDialog`. It's controlled (parent owns the rows) and takes a `noun` prop from which the heading, add button, and aria labels are derived, so the same component reads "Ingredients" on one screen and "Items" on the other. Its datalist ids come from `useId()`, which is what lets several editors be open simultaneously.

Adding a recipe to the shopping list goes through `AddToListDialog`, a native `<dialog>` opened with `showModal()` — focus trapping, Esc, and the backdrop are the browser's, so don't add a modal library or focus-management code. **Re-adding a recipe replaces its existing lines** (`withoutRecipe` then append) rather than duplicating them.

## Constraints that bite

`tsconfig.app.json` omits `strict` but enables:

- `verbatimModuleSyntax` — type-only imports **must** be `import type { … }` or the build fails.
- `noUnusedLocals` / `noUnusedParameters` — any stray local or import fails `npm run build` while `npm run dev` stays green.

The **React Compiler** is on (`babel-plugin-react-compiler` in `vite.config.ts`): skip manual `useMemo`/`useCallback`, and never mutate state in place — always build new arrays and objects.

ESLint's `react-refresh/only-export-components` means a module exporting a component shouldn't also export non-components. That's why shared helpers live in `src/items.ts` rather than alongside the components that use them.

## Styling

Plain global CSS, no framework, no CSS modules. `src/index.css` holds a `:root` custom-property token set (`--text`, `--bg`, `--border`, `--accent`, `--shadow`, …) with a `prefers-color-scheme: dark` override — **build new styles on those tokens and dark mode comes free.** `src/App.css` holds everything else and uses native CSS nesting (`&`, nested `@media`); match that style.
