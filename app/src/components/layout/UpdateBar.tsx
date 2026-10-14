import { updateNow, useUpdateCheck } from '../../hooks/use-update-check'

/**
 * A slim bar above the bottom bar when a newer version is published. Practice
 * only: on Stage nothing appears or reloads in the middle of a song.
 */
export function UpdateBar() {
  const { latest, available } = useUpdateCheck()
  if (!available) return null
  return (
    <div className="update-bar" role="status">
      <span>PlayBook {latest} is ready</span>
      <button type="button" className="update-btn" onClick={updateNow}>Update</button>
    </div>
  )
}
