import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../../store/use-store'
import { differingSections, hasEditedChart } from '../../music/chart-edits'
import { isChordToken, unknownChords } from '../../music/chord-text'
import { transposeFor } from '../../music/setlist-text'
import { transposeInKey } from '../../music/theory'
import type { Song } from '../../types'

interface Props {
  onClose: () => void
}

/** The chords as the band plays them, like the chart on screen. */
function inBandKey(key: string, semitones: number, chords: string): string {
  return semitones ? transposeInKey(chords, key, semitones) : chords
}

/** A line of chords with anything that is not a chord picked out in red. */
function Chords({ text, className }: { text: string; className: string }) {
  return (
    <span className={className}>
      {text.split(/(\s+)/).map((token, i) =>
        token.trim() && !isChordToken(token)
          ? <mark key={i} className="sc-bad">{token}</mark>
          : <Fragment key={i}>{token}</Fragment>)}
    </span>
  )
}

/**
 * Every song that shows chords saved on this device instead of the built-in
 * chart, with what differs. A song keeps what was saved for it, so a fix to
 * the built-in chart never reaches it, and a chord line broken by an old
 * slip (two chords joined into one) stays broken. One tap goes back to the
 * built-in chart; the saved chords are kept as an earlier version.
 */
export function SavedChartsModal({ onClose }: Props) {
  const edits = useStore(s => s.edits)
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => {
    const all = [...songs, ...customSongs]
    return all
      .filter(song => hasEditedChart(song, edits[song.title]))
      .map(song => {
        const saved = edits[song.title].sections!
        const notChords = Array.from(new Set(saved.flatMap(section => unknownChords(section.chords))))
        return { song, saved, notChords, differences: differingSections(saved, song.sections ?? []) }
      })
      // Broken chord lines first: they are the ones to fix
      .sort((a, b) => Number(b.notChords.length > 0) - Number(a.notChords.length > 0) || a.song.title.localeCompare(b.song.title))
  }, [songs, customSongs, edits])

  const broken = rows.filter(r => r.notChords.length > 0).length

  const goBack = (song: Song) => {
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the built-in chart. Your chords are under Earlier versions.`)
    setOpen(null)
  }

  return (
    <div className="hist-backdrop" onClick={onClose}>
      <div className="hist-sheet" role="dialog" aria-label="Your saved charts" onClick={e => e.stopPropagation()}>
        <div className="hist-header">
          <strong>Your saved charts</strong>
          <button className="songgrid-close" onClick={onClose}>Close</button>
        </div>

        <div className="hist-body">
          {rows.length === 0 ? (
            <div className="hist-note">Every song shows its built-in chart.</div>
          ) : (
            <div className="hist-note">
              {rows.length} {rows.length === 1 ? 'song shows chords you saved' : 'songs show chords you saved'}, not the built-in chart.
              {broken > 0 && ` ${broken} ${broken === 1 ? 'has entries' : 'have entries'} that are not chords.`}
              {' '}A fix to the built-in chart does not reach these songs.
            </div>
          )}

          {rows.map(({ song, saved, notChords, differences }) => {
            const key = edits[song.title]?.key ?? song.key
            const semitones = transposeFor(song, edits[song.title])
            return (
              <div key={song.title} className="hist-item">
                <button
                  className="hist-row"
                  aria-expanded={open === song.title}
                  onClick={() => setOpen(open === song.title ? null : song.title)}
                >
                  <span className="hist-when">{song.title}</span>
                  {notChords.length > 0 && <span className="sc-flag is-bad">Not a chord: {notChords.join(', ')}</span>}
                  <span className="hist-diff">
                    {differences.length} {differences.length === 1 ? 'section differs' : 'sections differ'} from the built-in chart
                  </span>
                </button>
                {open === song.title && (
                  <div className="hist-preview">
                    {differences.map(d => (
                      <div key={d.name} className="sc-diff">
                        <div className="hist-section-name">{d.name}</div>
                        <div className="sc-line">
                          <span className="sc-label">Yours</span>
                          {d.mine === null ? <span className="sc-none">no such section</span>
                            : <Chords className="sc-mine" text={inBandKey(key, semitones, d.mine)} />}
                        </div>
                        <div className="sc-line">
                          <span className="sc-label">Built-in</span>
                          {d.builtIn === null ? <span className="sc-none">no such section</span> : (
                            <>
                              {d.builtInName !== d.name && <span className="sc-as">{d.builtInName}</span>}
                              <Chords className="sc-builtin" text={inBandKey(song.key, transposeFor(song), d.builtIn)} />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <button className="hist-restore" onClick={() => goBack(song)} disabled={saved.length === 0}>
                      Use the built-in chart
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
