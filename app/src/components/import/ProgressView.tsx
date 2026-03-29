interface Props {
  steps: { label: string; status: 'pending' | 'active' | 'done' }[]
}

export function ProgressView({ steps }: Props) {
  return (
    <div style={{ padding: 16 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <span style={{ fontSize: 16 }}>
            {step.status === 'done' ? '\u2713' : step.status === 'active' ? '\u25CF' : '\u25CB'}
          </span>
          <span style={{
            color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text)',
            fontWeight: step.status === 'active' ? 600 : 400,
          }}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
