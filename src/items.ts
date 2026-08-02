import type { Item, ItemSource, ShoppingItem } from './types'

/** Amounts stay strings while editing so the field can be empty or mid-typed. */
export interface Row {
  name: string
  amount: string
  unit: string
  /** Carried through editing untouched, so an edit doesn't strip provenance. */
  source?: ItemSource
}

export const blankRow = (): Row => ({ name: '', amount: '', unit: '' })

export function rowsFrom(items: ShoppingItem[]): Row[] {
  if (items.length === 0) return [blankRow()]
  return items.map((i) => ({
    name: i.name,
    amount: String(i.amount),
    unit: i.unit ?? '',
    source: i.source,
  }))
}

/**
 * Validates edited rows into items. Rows left entirely blank are dropped rather
 * than rejected, so an all-blank set parses to `[]` — callers that require at
 * least one item check that themselves.
 */
export function parseRows(
  rows: Row[],
): { items: ShoppingItem[] } | { error: string } {
  const filled = rows.filter(
    (row) => row.name.trim() || row.amount.trim() || row.unit.trim(),
  )

  const items: ShoppingItem[] = []
  for (const row of filled) {
    const name = row.name.trim()
    const amount = Number(row.amount)
    if (!name) {
      // Deliberately context-free: this reads correctly on both screens.
      return { error: 'Every row needs a name.' }
    }
    if (!row.amount.trim() || !Number.isFinite(amount) || amount < 0) {
      return { error: `Enter a valid amount for "${name}".` }
    }
    // Unit stays optional — "2 eggs" needs no unit.
    const item: ShoppingItem = { name, amount, unit: row.unit.trim() }
    if (row.source) item.source = row.source
    items.push(item)
  }

  return { items }
}

/** Tags items with the recipe they came from as they enter the shopping list. */
export function stampSource(items: Item[], source: ItemSource): ShoppingItem[] {
  return items.map((item) => ({ ...item, source }))
}

/** Distinct recipes represented in the list, in first-appearance order. */
export function recipeSummaries(
  items: ShoppingItem[],
): { recipeId: string; recipeName: string; count: number }[] {
  const summaries = new Map<
    string,
    { recipeId: string; recipeName: string; count: number }
  >()
  for (const item of items) {
    if (!item.source) continue
    const { recipeId, recipeName } = item.source
    const existing = summaries.get(recipeId)
    if (existing) {
      existing.count += 1
    } else {
      summaries.set(recipeId, { recipeId, recipeName, count: 1 })
    }
  }
  return [...summaries.values()]
}

/** Drops one recipe's items, leaving hand-added items and other recipes alone. */
export function withoutRecipe(
  items: ShoppingItem[],
  recipeId: string,
): ShoppingItem[] {
  return items.filter((item) => item.source?.recipeId !== recipeId)
}

/**
 * Deduped case-insensitively (first spelling wins), blanks dropped, sorted —
 * so the editor can nudge toward consistent naming.
 */
export function uniqueSorted(values: string[]): string[] {
  const seen = new Map<string, string>()
  for (const value of values) {
    if (!value) continue
    const key = value.toLowerCase()
    if (!seen.has(key)) seen.set(key, value)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}
