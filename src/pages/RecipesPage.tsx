import { useState } from 'react'
import { AddToListDialog } from '../components/AddToListDialog'
import { RecipeForm } from '../components/RecipeForm'
import { RecipeList } from '../components/RecipeList'
import { withoutRecipe } from '../items'
import type { Recipe, ShoppingItem } from '../types'

interface Props {
  recipes: Recipe[]
  onChange: (next: Recipe[]) => void
  shoppingList: ShoppingItem[]
  onShoppingListChange: (next: ShoppingItem[]) => void
  nameSuggestions: string[]
  unitSuggestions: string[]
}

export function RecipesPage({
  recipes,
  onChange,
  shoppingList,
  onShoppingListChange,
  nameSuggestions,
  unitSuggestions,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingRecipe, setAddingRecipe] = useState<Recipe | null>(null)

  function handleCreate(recipe: Omit<Recipe, 'id'>) {
    onChange([...recipes, { ...recipe, id: crypto.randomUUID() }])
  }

  function handleSaveEdit(id: string, recipe: Omit<Recipe, 'id'>) {
    onChange(recipes.map((r) => (r.id === id ? { ...recipe, id } : r)))
    setEditingId(null)
  }

  function handleDelete(id: string) {
    onChange(recipes.filter((r) => r.id !== id))
    if (editingId === id) setEditingId(null)
  }

  function handleConfirmAdd(items: ShoppingItem[]) {
    if (!addingRecipe) return
    // Replace rather than duplicate, so re-adding a recipe is predictable.
    onShoppingListChange([
      ...withoutRecipe(shoppingList, addingRecipe.id),
      ...items,
    ])
    setAddingRecipe(null)
  }

  const existingCount = addingRecipe
    ? shoppingList.filter((i) => i.source?.recipeId === addingRecipe.id).length
    : 0

  return (
    <>
      <h1>Recipes</h1>

      <RecipeForm
        nameSuggestions={nameSuggestions}
        unitSuggestions={unitSuggestions}
        onSubmit={handleCreate}
      />

      <section className="saved">
        <h2>Saved recipes</h2>
        <RecipeList
          recipes={recipes}
          nameSuggestions={nameSuggestions}
          unitSuggestions={unitSuggestions}
          editingId={editingId}
          onEdit={setEditingId}
          onDelete={handleDelete}
          onAddToList={setAddingRecipe}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
        />
      </section>

      {addingRecipe && (
        <AddToListDialog
          // Remount when switching recipes, so the rows re-seed.
          key={addingRecipe.id}
          recipe={addingRecipe}
          existingCount={existingCount}
          nameSuggestions={nameSuggestions}
          unitSuggestions={unitSuggestions}
          onConfirm={handleConfirmAdd}
          onClose={() => setAddingRecipe(null)}
        />
      )}
    </>
  )
}
