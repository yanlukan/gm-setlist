import { useStore } from '../../store/use-store'
import { SaveStatus } from './SaveStatus'

/**
 * While editing, in the title line: Done, Reset and whether the changes are
 * safely written. Done is always there, or the player is stuck in the editor.
 */
export function EditBar({ song }: { song: string }) {
  const toggleEditMode = useStore(s => s.toggleEditMode)
  const resetEdits = useStore(s => s.resetEdits)
  return (
    <span className="edit-bar">
      <button type="button" className="setup-btn is-active" onClick={toggleEditMode}>Done</button>
      <button
        type="button"
        className="setup-btn is-danger"
        onClick={() => {
          if (confirm(`Reset "${song}" to the original chart?\n\nYour version is kept under Earlier versions, at the bottom of the chart.`)) {
            resetEdits(song)
          }
        }}
      >
        Reset
      </button>
      <SaveStatus />
    </span>
  )
}
