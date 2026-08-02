import type { ShoppingItem, Recipe } from './types'

const RECIPES = '/api/recipes'
const SHOPPING_LIST = '/api/shopping-list'

async function loadJson<T>(endpoint: string, label: string): Promise<T> {
  const res = await fetch(endpoint)
  if (!res.ok) throw new Error(`Could not load ${label} (${res.status})`)
  return res.json()
}

async function saveJson<T>(
  endpoint: string,
  label: string,
  data: T,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Could not save ${label} (${res.status})`)
}

export function loadRecipes(): Promise<Recipe[]> {
  return loadJson(RECIPES, 'recipes')
}

export function saveRecipes(recipes: Recipe[]): Promise<void> {
  return saveJson(RECIPES, 'recipes', recipes)
}

export function loadShoppingList(): Promise<ShoppingItem[]> {
  return loadJson(SHOPPING_LIST, 'shopping list')
}

export function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  return saveJson(SHOPPING_LIST, 'shopping list', items)
}
