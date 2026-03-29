import type { ReactNode, CSSProperties } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  fullScreen?: boolean
  style?: CSSProperties
}

export function Modal({ open, onClose, children, fullScreen, style }: ModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: fullScreen ? 'var(--bg)' : 'rgba(0,0,0,0.8)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: fullScreen ? 'stretch' : 'center',
        justifyContent: fullScreen ? 'stretch' : 'center',
        ...style,
      }}
      onClick={fullScreen ? undefined : (e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}
