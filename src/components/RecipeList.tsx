import type { Recipe } from '../types'
import { RecipeForm } from './RecipeForm'

interface Props {
  recipes: Recipe[]
  nameSuggestions: string[]
  unitSuggestions: string[]
  editingId: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAddToList: (recipe: Recipe) => void
  onSaveEdit: (id: string, recipe: Omit<Recipe, 'id'>) => void
  onCancelEdit: () => void
}

export function RecipeList({
  recipes,
  nameSuggestions,
  unitSuggestions,
  editingId,
  onEdit,
  onDelete,
  onAddToList,
  onSaveEdit,
  onCancelEdit,
}: Props) {
  if (recipes.length === 0) {
    return <p className="empty">No recipes yet.</p>
  }

  return (
    <ul className="recipe-list">
      {recipes.map((recipe) =>
        recipe.id === editingId ? (
          <li key={recipe.id} className="recipe-card editing">
            <RecipeForm
              nameSuggestions={nameSuggestions}
              unitSuggestions={unitSuggestions}
              initialRecipe={recipe}
              onSubmit={(updated) => onSaveEdit(recipe.id, updated)}
              onCancel={onCancelEdit}
            />
          </li>
        ) : (
          <li key={recipe.id} className="recipe-card">
            <h3>{recipe.name}</h3>
            {recipe.description && (
              <p className="description">{recipe.description}</p>
            )}
            <ul className="item-list">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index}>
                  <span>{ingredient.name}</span>
                  <span className="amount">
                    {ingredient.amount}
                    {ingredient.unit && ` ${ingredient.unit}`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="card-actions">
              <button type="button" onClick={() => onAddToList(recipe)}>
                Add to list
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => onEdit(recipe.id)}
              >
                Edit
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => onDelete(recipe.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ),
      )}
    </ul>
  )
}
