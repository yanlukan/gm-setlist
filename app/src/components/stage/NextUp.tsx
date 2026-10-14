import type { Song } from '../../types'

/**
 * A heads-up one song early: time to grab the acoustic, or put the guitar
 * down. One line above the bar, only when the next song has a cue.
 */
export function NextUp({ next }: { next: Song | undefined }) {
  if (!next?.cue) return null
  return (
    <div className="next-up" role="note">
      <span className="next-up-label">Next up</span>
      <span className="next-up-text">{next.cue}</span>
    </div>
  )
}
