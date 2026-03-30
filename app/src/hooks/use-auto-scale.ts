import { useRef, useCallback, useState } from 'react'

export function useAutoScale(maxFont = 32, minFont = 18): [React.RefCallback<HTMLDivElement>, number] {
  const [fontSize, setFontSize] = useState(maxFont)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!node) return

    const measure = () => {
      let size = maxFont
      node.style.fontSize = size + 'px'
      // Only shrink if content overflows
      while (node.scrollHeight > node.clientHeight && size > minFont) {
        size -= 2
        node.style.fontSize = size + 'px'
      }
      setFontSize(size)
    }

    // Measure now
    measure()

    // Re-measure when container resizes
    observerRef.current = new ResizeObserver(measure)
    observerRef.current.observe(node)
  }, [maxFont, minFont])

  return [ref, fontSize]
}
