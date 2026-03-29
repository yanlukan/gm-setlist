import { useRef, useEffect, useState } from 'react'

export function useAutoScale(deps: unknown[], maxFont = 32, minFont = 18): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(maxFont)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let size = maxFont
    el.style.fontSize = size + 'px'
    const check = () => {
      while (el.scrollHeight > el.clientHeight && size > minFont) {
        size -= 2
        el.style.fontSize = size + 'px'
      }
      setFontSize(size)
    }
    requestAnimationFrame(check)
  }, [deps, maxFont, minFont])

  return [ref, fontSize]
}
