import { useStore } from '../../store/use-store'

const TEXT = {
  saved: 'Saved',
  saving: 'Saving...',
  failed: 'Not saved!',
  readonly: 'Not saving',
} as const

/** Beside Done while editing: whether the changes are safely written. */
export function SaveStatus() {
  const status = useStore(s => s.saveStatus)
  const bad = status === 'failed' || status === 'readonly'
  return (
    <span
      className={`tb-save is-${status}`}
      role="status"
      title={bad ? 'Your changes are NOT being saved. Take a backup from the menu, then reload.' : undefined}
    >
      {status === 'saved' && <span aria-hidden="true">&#10003; </span>}
      {TEXT[status]}
    </span>
  )
}
