/** A named thing with an amount — a recipe ingredient or a shopping list item. */
export interface Item {
  name: string
  amount: number
  unit: string
}

export interface ItemSource {
  recipeId: string
  /** Denormalized so the cart still reads right if the recipe is renamed or deleted. */
  recipeName: string
}

/** An item on the shopping list. No `source` means it was added by hand. */
export interface ShoppingItem extends Item {
  source?: ItemSource
}

export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: Item[]
}
