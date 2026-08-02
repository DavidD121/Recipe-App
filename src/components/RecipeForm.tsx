import { useState } from 'react'
import type { FormEvent } from 'react'
import { blankRow, parseRows, rowsFrom, type Row } from '../items'
import type { Recipe } from '../types'
import { ItemRows } from './ItemRows'

interface Props {
  /** Item names already in use, offered as autocomplete options. */
  nameSuggestions: string[]
  /** Units already in use, likewise. */
  unitSuggestions: string[]
  initialRecipe?: Recipe
  onSubmit: (recipe: Omit<Recipe, 'id'>) => void
  onCancel?: () => void
}

export function RecipeForm({
  nameSuggestions,
  unitSuggestions,
  initialRecipe,
  onSubmit,
  onCancel,
}: Props) {
  const editing = Boolean(initialRecipe)
  const [name, setName] = useState(initialRecipe?.name ?? '')
  const [description, setDescription] = useState(
    initialRecipe?.description ?? '',
  )
  const [rows, setRows] = useState<Row[]>(() =>
    rowsFrom(initialRecipe?.ingredients ?? []),
  )
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Give the recipe a name.')
      return
    }

    const parsed = parseRows(rows)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    // A recipe needs ingredients, unlike the shopping list.
    if (parsed.items.length === 0) {
      setError('Add at least one ingredient.')
      return
    }

    setError('')

    // Leave `description` off entirely when blank, so clearing it on an edit
    // drops the key rather than persisting an empty string.
    const submitted: Omit<Recipe, 'id'> = {
      name: trimmedName,
      ingredients: parsed.items,
    }
    const trimmedDescription = description.trim()
    if (trimmedDescription) submitted.description = trimmedDescription
    onSubmit(submitted)

    if (!editing) {
      setName('')
      setDescription('')
      setRows([blankRow()])
    }
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <h2>{editing ? 'Edit recipe' : 'New recipe'}</h2>

      <label className="field">
        <span>Recipe name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pancakes"
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — notes, method, where it came from…"
          rows={3}
        />
      </label>

      <ItemRows
        rows={rows}
        onRowsChange={setRows}
        nameSuggestions={nameSuggestions}
        unitSuggestions={unitSuggestions}
        noun="ingredient"
        namePlaceholder="Flour"
        unitPlaceholder="g"
      />

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="submit">{editing ? 'Save changes' : 'Save recipe'}</button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
