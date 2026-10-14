import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { playedKey } from '../../music/setlist-text'
import { SongsSheet } from '../sheets/SongsSheet'

/** The sheets the bar opens; only one is open at a time. */
export type SheetName = 'setlists' | 'songs' | 'notes' | 'more' | 'finder'

/**
 * The only bar, at the bottom of both screens. Getting around comes first and
 * is the same on Stage and Practice; the screen's own buttons follow. Next is
 * the big one: it names the song it goes to, with its key and GX-10 sound, and
 * after an extra it reads Back to the set.
 */
export function BottomBar() {
  const { previous, next, returning, setSongs } = useShownSong()
  const currentIndex = useStore(s => s.currentIndex)
  const edits = useStore(s => s.edits)
  const instrument = useStore(s => s.instrument)
  const onStage = useStore(s => s.viewMode === 'stage')
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  const [open, setOpen] = useState<SheetName | null>(null)

  const toggle = (name: SheetName) => setOpen(shown => (shown === name ? null : name))
  const close = () => setOpen(null)
  const total = setSongs.length
  const place = total ? currentIndex + 1 : 0
  const nextKey = next ? playedKey(next, edits[next.title]).key : ''
  const nextLabel = !next ? 'End of set' : returning ? `Back to the set: ${next.title}` : `Next song: ${next.title}`

  return (
    <>
      <nav className="bottom-bar" aria-label="Song controls">
        <button
          className="bb-btn bb-songs"
          aria-label={`Songs, ${place} of ${total}`}
          aria-expanded={open === 'songs'}
          disabled={total === 0}
          onClick={() => toggle('songs')}
        >
          Songs <span className="bb-count">{place}/{total}</span>
        </button>

        <button
          className="bb-btn bb-prev"
          aria-label={previous ? `Previous song: ${previous.title}` : 'Start of set'}
          disabled={!previous}
          onClick={() => {
            close()
            prevSong()
          }}
        >
          <span className="bb-arrow" aria-hidden="true">&#9664;</span>
          {previous ? (
            <span className="bb-text">
              <span className="bb-kicker">Previous</span>
              <span className="bb-title">{previous.title}</span>
            </span>
          ) : (
            <span className="bb-text">
              <span className="bb-kicker">Start of set</span>
            </span>
          )}
        </button>

        <button
          className={returning ? 'bb-btn bb-next is-return' : 'bb-btn bb-next'}
          aria-label={nextLabel}
          disabled={!next}
          onClick={() => {
            close()
            nextSong()
          }}
        >
          <span className="bb-text">
            <span className="bb-kicker">{!next ? 'End of set' : returning ? 'Back to the set' : 'Next'}</span>
            {next && <span className="bb-title">{next.title}</span>}
            {next && (
              <span className="bb-meta">
                {nextKey && <span className="bb-key">{nextKey}</span>}
                {/* The sound to switch to before the next song: the guitarist's GX-10, not the keyboard's */}
                {next.preset && instrument === 'guitar' && <span className="bb-preset">{next.preset.name}</span>}
              </span>
            )}
          </span>
          <span className="bb-arrow" aria-hidden="true">&#9654;</span>
        </button>

        <span className="bb-spacer" />

        {onStage ? (
          <button className="bb-btn" aria-label="Switch to Practice" onClick={() => { close(); toggleViewMode() }}>
            Practice
          </button>
        ) : (
          <button className="bb-btn" aria-label="Switch to Stage" onClick={() => { close(); toggleViewMode() }}>
            Stage
          </button>
        )}
      </nav>

      {open === 'songs' && <SongsSheet onStage={onStage} onClose={close} />}
    </>
  )
}
