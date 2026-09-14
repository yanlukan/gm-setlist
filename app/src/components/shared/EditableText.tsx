import { useEffect, useRef, type CSSProperties } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  style?: CSSProperties
  /** ms to wait after typing stops before saving. */
  debounce?: number
}

/**
 * A contentEditable that actually keeps what you type.
 *
 * iOS WebKit does not reliably fire `blur` when the focused node is removed or
 * when a button is tapped, so a save-on-blur-only editor silently discards
 * edits — which is how chord changes made at a gig disappeared. This saves on
 * every keystroke (debounced), on blur, and on unmount, and it never rewrites
 * the DOM while the user is typing in it, so the caret stays put.
 */
export function EditableText({ value, onChange, style, debounce = 400 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Push external changes in only when this element is not being edited,
  // otherwise React would stomp on the caret mid-word.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.textContent !== value) el.textContent = value
    latest.current = value
  }, [value])

  const commit = (el: HTMLDivElement | null) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    // A missing element means we have nothing to save. It must NEVER be read
    // as "the user cleared this field" — doing so wipes real chords.
    if (!el) return
    const text = el.textContent ?? ''
    if (text !== latest.current) {
      latest.current = text
      onChangeRef.current(text)
    }
  }

  const flush = () => commit(ref.current)

  // Save whatever is in the box if this unmounts — switching song, leaving
  // edit mode, or a re-render that drops the node. React clears `ref.current`
  // before cleanup runs, so hold onto the node itself here.
  useEffect(() => {
    const el = ref.current
    return () => commit(el)
  }, [])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={style}
      onInput={() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(flush, debounce)
      }}
      onBlur={flush}
    />
  )
}
