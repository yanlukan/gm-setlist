import { useStore } from '../../store/use-store'

/**
 * An empty setlist is a normal state, not an error, but the player must not
 * be left staring at a blank screen with nothing to tap.
 */
export function EmptyList() {
  const listName = useStore(s => s.setlistData.lists[s.setlistData.activeId]?.name ?? 'this setlist')
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  return (
    <div className="chart-empty">
      <div>&ldquo;{listName}&rdquo; is empty.</div>
      <div style={{ fontSize: 14 }}>
        Your other setlists are safe — open <strong>Setlists</strong> in the bar below to switch.
      </div>
      <button
        onClick={() => {
          if (confirm(`Fill "${listName}" with the GM Tribute running order?`)) restoreGigOrder()
        }}
        className="tb-btn is-active"
        style={{ minHeight: 48, padding: '0 20px', fontSize: 16 }}
      >
        Load GM Tribute running order
      </button>
    </div>
  )
}
