import { Link } from "react-router"
import type { ShoppingItem } from "../types"
import { useState } from "react"
import {
  parseRows,
  recipeSummaries,
  rowsFrom,
  withoutRecipe,
  type Row,
} from "../items"
import { ItemRows } from "../components/ItemRows"

interface Props {
  shopping_list: ShoppingItem[]
  onChange: (next: ShoppingItem[]) => void
  nameSuggestions: string[]
  unitSuggestions: string[]
}

export function ShoppingListPage({
  shopping_list,
  onChange,
  nameSuggestions,
  unitSuggestions,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')

  function startEditing() {
    // Seed from the saved list so existing items are editable, not just added to.
    setRows(rowsFrom(shopping_list))
    setError('')
    setIsEditing(true)
  }

  function handleSave() {
    const parsed = parseRows(rows)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    // An emptied list is allowed here, unlike a recipe.
    onChange(parsed.items)
    setError('')
    setIsEditing(false)
  }

  const summaries = recipeSummaries(shopping_list)

  return (
    <>
      <h1>Shopping list</h1>

      {isEditing ? (
        <div className="recipe-form">
          <ItemRows
            rows={rows}
            onRowsChange={setRows}
            nameSuggestions={nameSuggestions}
            unitSuggestions={unitSuggestions}
            noun="item"
            namePlaceholder="Toilet paper"
            unitPlaceholder="rolls"
          />

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button type="button" onClick={handleSave}>
              Save changes
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {summaries.length > 0 && (
            <ul className="recipe-chips">
              {summaries.map((summary) => (
                <li key={summary.recipeId} className="chip">
                  <span>
                    {summary.recipeName} · {summary.count}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      onChange(withoutRecipe(shopping_list, summary.recipeId))
                    }
                    aria-label={`Remove ${summary.recipeName} items from the list`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {shopping_list.length === 0 && (<p>There's nothing here yet...</p>)}
          {shopping_list.length > 0 && (
            <ul className="item-list">
              {shopping_list.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.name}
                    {item.source && (
                      <span className="source">{item.source.recipeName}</span>
                    )}
                  </span>
                  <span className="amount">
                    {item.amount}
                    {item.unit && ` ${item.unit}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="form-actions">
            <button type="button" className="secondary" onClick={startEditing}>Edit List</button>
            <Link to="/" className="button-link">+ Add items from recipes</Link>
            <button type="button" onClick={() => onChange([])} className="danger">Clear list</button>
          </div>
        </>
      )}
    </>
  )
}
