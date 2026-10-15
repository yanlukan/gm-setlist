import { useStore, useChartView } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { playedKey } from '../../music/setlist-text'
import { SongsSheet } from '../sheets/SongsSheet'
import { SetlistsSheet } from '../sheets/SetlistsSheet'
import { capoFor, songChordsOf } from '../../music/chart-view'
import { soundFor, soundLabel } from '../../music/gx10'
import { NotesSheet } from '../sheets/NotesSheet'
import { MoreSheet } from '../sheets/MoreSheet'
import { ChordFinder } from '../finder/ChordFinder'


/**
 * The only bar, at the bottom of both screens. Getting around comes first and
 * is the same on Stage and Practice; the screen's own buttons follow. Next is
 * the big one: it names the song it goes to, with its key and GX-10 sound, and
 * after an extra it reads Back to the set.
 */
export function BottomBar() {
  const { song, previous, next, returning, setSongs, place: index } = useShownSong()
  const view = useChartView()
  const edits = useStore(s => s.edits)
  const instrument = useStore(s => s.instrument)
  const onStage = useStore(s => s.viewMode === 'stage')
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)
  const toggleViewMode = useStore(s => s.toggleViewMode)
  // Held in the store so the pedal and arrow keys can close it too
  const open = useStore(s => s.openSheet)
  const toggle = useStore(s => s.toggleSheet)
  const close = useStore(s => s.closeSheet)
  const total = setSongs.length
  const place = total ? index + 1 : 0
  const nextKey = next ? playedKey(next, edits[next.title]).key : ''
  // The memory to step to with ▲ before the next song
  const nextSound = soundFor(next?.title)
  const nextLabel = !next ? 'End of set' : returning ? `Back to the set: ${next.title}` : `Next song: ${next.title}`

  return (
    <>
      <nav className="bottom-bar" aria-label="Song controls">
        <button
          className="bb-btn"
          aria-label="Setlists"
          aria-expanded={open === 'setlists'}
          onClick={() => toggle('setlists')}
        >
          Setlists
        </button>

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
                {nextSound && instrument === 'guitar' && <span className="bb-preset">{soundLabel(nextSound)}</span>}
              </span>
            )}
          </span>
          <span className="bb-arrow" aria-hidden="true">&#9654;</span>
        </button>

        <span className="bb-spacer" />

        {onStage ? (
          <>
            <button className="bb-btn" aria-label="Notes" aria-expanded={open === 'notes'} onClick={() => toggle('notes')}>
              Notes
            </button>
            <button className="bb-btn" aria-label="Switch to Practice" onClick={() => { close(); toggleViewMode() }}>
              Practice
            </button>
          </>
        ) : (
          <>
            <button className="bb-btn" aria-label="Chord Finder" aria-expanded={open === 'finder'} onClick={() => toggle('finder')}>
              Finder
            </button>
            <button className="bb-btn" aria-label="More" aria-expanded={open === 'more'} onClick={() => toggle('more')}>
              More
            </button>
            <button className="bb-btn" aria-label="Switch to Stage" onClick={() => { close(); toggleViewMode() }}>
              Stage
            </button>
          </>
        )}
      </nav>

      {open === 'songs' && <SongsSheet onStage={onStage} onClose={close} />}
      {open === 'setlists' && <SetlistsSheet onStage={onStage} onClose={close} />}
      {open === 'notes' && onStage && <NotesSheet onClose={close} />}
      {open === 'more' && !onStage && <MoreSheet onClose={close} />}
      {open === 'finder' && !onStage && (
        <ChordFinder
          songChords={song ? songChordsOf(song, edits[song.title], view) : []}
          capo={song ? capoFor(song, edits[song.title], view) : 0}
          onClose={close}
        />
      )}
    </>
  )
}
