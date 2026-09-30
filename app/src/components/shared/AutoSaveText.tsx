import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  /** Several lines (a box that grows with its text) or, by default, one. */
  multiline?: boolean
  className?: string
  style?: CSSProperties
  placeholder?: string
  'aria-label'?: string
  /** ms to wait after typing stops before saving. */
  debounce?: number
}

/**
 * A text field that keeps what you type.
 *
 * It replaces a contentEditable that read `textContent`: Return put a line
 * break in the page, `textContent` threw it away, and the chords on either
 * side of it were glued into one ("D" and "E" became "DE"). A real text field
 * keeps every line break.
 *
 * iOS WebKit does not reliably fire `blur` when the focused node is removed
 * or when a button is tapped, so a save-on-blur-only editor silently discards
 * edits, which is how chord changes made at a gig disappeared. This saves on
 * every keystroke (debounced), on blur, when the page is hidden and on
 * unmount, and it never rewrites the field while the user is typing in it,
 * so the caret stays put.
 */
export function AutoSaveText({
  value, onChange, multiline = false, className, style, placeholder, debounce = 400, ...rest
}: Props) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el || !multiline) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`
  }

  // Push external changes in only when this field is not being typed in,
  // otherwise React would stomp on the caret mid-word.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el && el.value !== value) el.value = value
    if (document.activeElement !== el) latest.current = value
    grow(el)
  })

  const commit = (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    // A missing field means we have nothing to save. It must NEVER be read
    // as "the user cleared this field": doing so wipes real chords.
    if (!el) return
    const text = el.value
    if (text !== latest.current) {
      latest.current = text
      onChangeRef.current(text)
    }
  }

  // Save whatever is in the field if this unmounts (switching song, leaving
  // edit mode, a re-render that drops the node) or if the page goes away.
  // React clears `ref.current` before cleanup runs, so hold on to the node.
  useEffect(() => {
    const el = ref.current
    const onHide = () => { if (document.visibilityState === 'hidden') commit(el) }
    const onPageHide = () => commit(el)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      commit(el)
    }
  }, [])

  const common = {
    defaultValue: value,
    className,
    style,
    placeholder,
    'aria-label': rest['aria-label'],
    // Phone keyboards would "fix" chord names: capitals, corrections, and the
    // double-space full stop.
    autoCapitalize: 'off',
    autoCorrect: 'off',
    autoComplete: 'off',
    spellCheck: false,
    onBlur: () => commit(ref.current),
  }

  const typed = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => commit(ref.current), debounce)
  }

  if (multiline) {
    return (
      <textarea
        {...common}
        ref={ref}
        rows={1}
        onInput={() => { grow(ref.current); typed() }}
      />
    )
  }

  return (
    <input
      {...common}
      ref={ref}
      type="text"
      enterKeyHint="done"
      onInput={typed}
      onKeyDown={e => { if (e.key === 'Enter') commit(ref.current) }}
    />
  )
}
