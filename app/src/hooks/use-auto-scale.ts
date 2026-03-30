import { useRef, useLayoutEffect, useState } from 'react'

export function useAutoScale(deps: unknown[], maxFont = 32, minFont = 18): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFont)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Reset to max and measure by mutating DOM directly — no React re-renders
    let size = maxFont
    el.style.fontSize = size + 'px'
    while (el.scrollHeight > el.clientHeight && size > minFont) {
      size -= 2
      el.style.fontSize = size + 'px'
    }
    // Single state update at the end
    if (size !== fontSize) setFontSize(size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, maxFont, minFont])

  return [ref, fontSize]
}
