import { useState } from 'react'
import { formLabel } from '../../music/form'
import { sectionColor } from '../../music/theory'

interface Props {
  /** The order as saved: section names in the order they are played. */
  form: string[]
  /** The names of the chart's sections, to choose from. */
  names: string[]
  /** The whole new order. The caller keeps it so Undo can bring the old one back. */
  onChange: (next: string[]) => void
}

/**
 * The song's order, edited as a row of tags like the one on the chart. Tap a
 * tag to pick it: it can then move earlier or later, or go. Add opens a button
 * per section, which adds it after the picked tag, or at the end when none is
 * picked. The buttons stay put until Done, so the chart below keeps the room.
 */
export function FormEditor({ form, names, onChange }: Props) {
  const [picked, setPicked] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  // Undo can shorten the order under a tag that was picked
  const at = picked !== null && picked < form.length ? picked : null
  const missing = Array.from(new Set(form.filter(name => !names.includes(name))))
  // An empty order has nothing to look at yet: go straight to adding
  const showAdd = adding || form.length === 0

  const add = (name: string) => {
    const index = at === null ? form.length : at + 1
    onChange([...form.slice(0, index), name, ...form.slice(index)])
    setPicked(index) // the next one follows it
    setAdding(true)
  }
  const shift = (dir: -1 | 1) => {
    if (at === null) return
    const target = at + dir
    if (target < 0 || target >= form.length) return
    const next = [...form]
    ;[next[at], next[target]] = [next[target], next[at]]
    onChange(next)
    setPicked(target)
  }
  const remove = () => {
    if (at === null) return
    onChange(form.filter((_, i) => i !== at))
    setPicked(null)
  }
  const clear = () => {
    onChange([])
    setPicked(null)
  }

  return (
    <div className="fe" role="group" aria-label="Song order">
      <div className="fe-head">
        <span className="fe-label">SONG ORDER</span>
        {form.length > 0 && (
          <div className="fe-head-tools">
            <button className="fe-clear" onClick={clear} aria-label="Clear the song order">Clear</button>
            <button
              className="fe-clear"
              onClick={() => setAdding(!adding)}
              aria-expanded={showAdd}
              aria-label={showAdd ? 'Finish adding to the song order' : 'Add a section to the song order'}
            >
              {showAdd ? 'Done' : '+ Add'}
            </button>
          </div>
        )}
      </div>

      {form.length === 0 ? (
        <div className="fe-empty">No order yet. Tap a section to start it.</div>
      ) : (
        <div className="fe-steps">
          {form.map((name, i) => (
            <button
              key={i}
              type="button"
              className={['fe-step', at === i ? 'is-picked' : '', names.includes(name) ? '' : 'is-bad'].filter(Boolean).join(' ')}
              style={{ color: sectionColor(name) }}
              aria-pressed={at === i}
              aria-label={`Step ${i + 1}: ${name}`}
              onClick={() => setPicked(at === i ? null : i)}
            >
              {formLabel(name)}
            </button>
          ))}
        </div>
      )}

      {at !== null && (
        <div className="fe-tools">
          <button className="fe-tool" onClick={() => shift(-1)} disabled={at === 0}
            aria-label={`Move step ${at + 1} earlier`}>&#9664; Earlier</button>
          <button className="fe-tool" onClick={() => shift(1)} disabled={at === form.length - 1}
            aria-label={`Move step ${at + 1} later`}>Later &#9654;</button>
          <button className="fe-tool is-danger" onClick={remove}
            aria-label={`Remove step ${at + 1}`}>Remove</button>
        </div>
      )}

      {missing.length > 0 && (
        <div className="edit-warning" role="status">
          Not in the chart: {missing.join(', ')}. The order stays off the chart until they are gone.
        </div>
      )}

      {showAdd && (
        <div className="fe-add">
          <span className="fe-add-label">{at === null ? 'Add to the end' : `Add after step ${at + 1}`}</span>
          {names.map(name => (
            <button
              key={name}
              type="button"
              className="fe-add-btn"
              style={{ color: sectionColor(name) }}
              aria-label={`Add ${name} to the order`}
              onClick={() => add(name)}
            >
              + {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
