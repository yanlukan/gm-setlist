import type { CSSProperties, ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  className?: string
}

export function Badge({ children, onClick, style, className }: BadgeProps) {
  const baseStyle: CSSProperties = {
    background: 'var(--badge-bg)',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 13,
    whiteSpace: 'nowrap',
    cursor: onClick ? 'pointer' : 'default',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  }

  return (
    <span
      className={className}
      style={baseStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </span>
  )
}
