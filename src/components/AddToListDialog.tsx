import { useEffect, useRef, useState } from 'react'
import { parseRows, rowsFrom, stampSource, type Row } from '../items'
import type { Recipe, ShoppingItem } from '../types'
import { ItemRows } from './ItemRows'

interface Props {
  recipe: Recipe
  /** How many items from this recipe are already on the list. */
  existingCount: number
  nameSuggestions: string[]
  unitSuggestions: string[]
  onConfirm: (items: ShoppingItem[]) => void
  onClose: () => void
}

export function AddToListDialog({
  recipe,
  existingCount,
  nameSuggestions,
  unitSuggestions,
  onConfirm,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(recipe.ingredients))
  const [error, setError] = useState('')

  useEffect(() => {
    // showModal() gives focus trapping, Esc, and the backdrop for free, and
    // promotes the dialog to the top layer wherever it sits in the DOM.
    ref.current?.showModal()
  }, [])

  function handleConfirm() {
    const parsed = parseRows(rows)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    onConfirm(
      stampSource(parsed.items, {
        recipeId: recipe.id,
        recipeName: recipe.name,
      }),
    )
  }

  return (
    // `close` fires for Esc as well as close(), so this covers both exits.
    <dialog ref={ref} onClose={onClose} className="add-dialog">
      <h2>Add to shopping list</h2>
      <p className="hint">From — {recipe.name}</p>

      {existingCount > 0 && (
        <p className="notice">
          Already in your list — confirming replaces its {existingCount}{' '}
          {existingCount === 1 ? 'item' : 'items'}.
        </p>
      )}

      <ItemRows
        rows={rows}
        onRowsChange={setRows}
        nameSuggestions={nameSuggestions}
        unitSuggestions={unitSuggestions}
        noun="item"
        namePlaceholder="Flour"
        unitPlaceholder="g"
      />

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" onClick={handleConfirm}>
          Add to list
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => ref.current?.close()}
        >
          Cancel
        </button>
      </div>
    </dialog>
  )
}
