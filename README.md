# Recipe App

A prototype for keeping recipes and building a shopping list from them. React + TypeScript + Vite.

## Running it

```bash
npm install
npm run dev
```

Persistence only works under `npm run dev` — see below.

| Command | |
|---|---|
| `npm run dev` | dev server, with the storage API |
| `npm run build` | type-check (`tsc -b`) then build |
| `npm run lint` | eslint |
| `npm run preview` | serves `dist/` — **no persistence** |

## What it does

- **Recipes** — name, optional description, and a list of ingredients as name + amount + unit.
- **Shopping list** — freeform items, so it holds toilet paper as happily as flour.
- **Add to list** — each recipe has a button that opens a dialog where you can edit or drop ingredients before they're added, so you can skip what you already have.
- **Provenance** — items added from a recipe remember which one. The list shows a chip per recipe and can remove all of one recipe's items at once.
- **Autocomplete** — ingredient names and units are suggested from everything already used across recipes and the list, to keep naming consistent.

## Storage

A browser can't write to disk, so `vite.config.ts` registers a small middleware exposing `GET`/`PUT` on `/api/recipes` and `/api/shopping-list`, backed by `data/recipes.json` and `data/shopping-list.json`.

Both files are gitignored — they're runtime state, and the API recreates them as `[]` on first read.

Because this lives in the Vite dev server, **a built `dist/` has no backend and will not save anything**. That's a deliberate prototype tradeoff; the client only talks to those endpoints through `src/api.ts`, so swapping in a real backend is a contained change.

See [CLAUDE.md](CLAUDE.md) for architecture notes.
