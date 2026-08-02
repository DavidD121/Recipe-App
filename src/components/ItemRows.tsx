import { useId } from 'react'
import { blankRow, type Row } from '../items'

interface Props {
  rows: Row[]
  onRowsChange: (next: Row[]) => void
  nameSuggestions: string[]
  unitSuggestions: string[]
  /** Singular noun for the heading, add button, and aria labels. */
  noun?: string
  namePlaceholder?: string
  unitPlaceholder?: string
}

export function ItemRows({
  rows,
  onRowsChange,
  nameSuggestions,
  unitSuggestions,
  noun = 'item',
  namePlaceholder = 'Name',
  unitPlaceholder = 'unit',
}: Props) {
  // Unique per instance, so several editors can be open at once.
  const listId = useId()
  const Noun = noun[0].toUpperCase() + noun.slice(1)
  // Naive pluralization — fine for "item" and "ingredient", not general.
  const heading = `${Noun}s`

  function updateRow(index: number, patch: Partial<Row>) {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index)
    onRowsChange(next.length > 0 ? next : [blankRow()])
  }

  return (
    <div className="field">
      <span>{heading}</span>
      <div className="item-row item-head" aria-hidden="true">
        <span>Name</span>
        <span>Amount</span>
        <span>Unit</span>
        <span />
      </div>
      {rows.map((row, index) => (
        <div className="item-row" key={index}>
          <input
            value={row.name}
            onChange={(e) => updateRow(index, { name: e.target.value })}
            placeholder={namePlaceholder}
            list={`${listId}-name`}
            aria-label={`${Noun} ${index + 1} name`}
          />
          <input
            type="number"
            step="any"
            min="0"
            value={row.amount}
            onChange={(e) => updateRow(index, { amount: e.target.value })}
            placeholder="1"
            aria-label={`${Noun} ${index + 1} amount`}
          />
          <input
            value={row.unit}
            onChange={(e) => updateRow(index, { unit: e.target.value })}
            placeholder={unitPlaceholder}
            list={`${listId}-unit`}
            aria-label={`${Noun} ${index + 1} unit`}
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => removeRow(index)}
            aria-label={`Remove ${noun} ${index + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <datalist id={`${listId}-name`}>
        {nameSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id={`${listId}-unit`}>
        {unitSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <button
        type="button"
        className="secondary"
        onClick={() => onRowsChange([...rows, blankRow()])}
      >
        + Add {noun}
      </button>
    </div>
  )
}
