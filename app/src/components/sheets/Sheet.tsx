import { useEffect, type ReactNode } from 'react'

interface Props {
  label: string
  onClose: () => void
  className?: string
  children: ReactNode
}

/** A panel that opens above the bottom bar, over the chart. Escape or a tap outside closes it. */
export function Sheet({ label, onClose, className, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="sheet-backdrop" aria-hidden="true" onClick={onClose} />
      <section role="dialog" aria-label={label} className={className ? `sheet ${className}` : 'sheet'}>
        {children}
      </section>
    </>
  )
}
