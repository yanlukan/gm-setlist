import { useState, useMemo } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { capoFor, guitarFor, shownSections } from '../../music/chart-view'
import { strum } from '../../music/sound'
import { hasShapes, voicingsFor } from '../../music/voicings'
import { neckFor, positionLabel, shapeChoice, useBandPositions } from '../../hooks/use-band-positions'
import { backToSongShapes, clearSongShape, moveChords, pickSongShape } from '../../store/song-shapes'
import { ChordDiagram } from './ChordDiagram'
import { VoicingPicker } from './VoicingPicker'

/** How far Lower and Higher move the chords, and how far they go. */
const NECK_STEP = 2
const MIN_NECK = 3
const MAX_NECK = 12

export function DiagramsBar() {
  // Primitive selectors — no method calls
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const clearVoicing = useStore(s => s.clearVoicing)
  const onStage = useStore(s => s.viewMode === 'stage')
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)

  const [pickerChord, setPickerChord] = useState<string | null>(null)

  const allSongs = useMemo(() => [...songs, ...customSongs], [songs, customSongs])

  const song = useMemo(() => {
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return undefined
    const setlistArr = active.songTitles
      .map(title => allSongs.find(s => s.title === title))
      .filter(Boolean)
    return setlistArr[currentIndex]
  }, [allSongs, setlistData, currentIndex])

  // A shape picked by hand wins; otherwise the song's band shape
  const songEdits = song ? edits[song.title] : undefined
  const { picks: band, researched, span } = useBandPositions(song, songEdits)
  const choice = (name: string) => shapeChoice(name, songEdits, selectedVoicings, band[name])
  const shapeFor = (name: string) => choice(name).index

  // The section tapped on the chart, if it belongs to this song
  const focus = useMemo(() => {
    if (!song || !focusSection || focusSection.title !== song.title) return null
    const sections = edits[song.title]?.sections ?? song.sections ?? []
    const section = sections[focusSection.index]
    return section ? { index: focusSection.index, name: section.name } : null
  }, [song, edits, focusSection])

  const view = useChartView()
  const uniqueChords = useMemo(() => {
    if (!song) return []
    // The shapes actually played: band key, less any capo, plain if asked for
    const sections = shownSections(song, edits[song.title], view)
    const seen = new Set<string>()
    const result: string[] = []
    for (const section of focus ? [sections[focus.index]] : sections) {
      const names = section.chords.split(/[\s|,]+/).filter(Boolean)
      for (const name of names) {
        if (!seen.has(name) && hasShapes(name)) {
          seen.add(name)
          result.push(name)
        }
      }
    }
    return result
  }, [song, edits, focus, view])

  if (!song || uniqueChords.length === 0) return null

  return (
    <>
      <div
        className="diagrams-strip"
        role="list"
        aria-label={focus ? `Chord shapes for ${focus.name}` : 'Chord shapes'}
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 8,
          padding: '8px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {focus && (
          <button
            type="button"
            className="diagrams-focus"
            onClick={() => setFocusSection(null)}
            aria-label={`Showing ${focus.name} only. Show the whole song`}
          >
            <span>{focus.name}</span>
            <span className="diagrams-focus-all">All &#10005;</span>
          </button>
        )}
        {!onStage && (
          // Every chord up or down the neck at once, then a few changed by hand
          <div className="diagrams-move" role="group" aria-label="Move the chords on the neck">
            {songEdits?.neck === undefined ? (
              <button type="button" onClick={() => moveChords(song.title, neckFor(song, songEdits, view))}>
                Move chords
              </button>
            ) : (
              <>
                <span className="diagrams-move-area">{positionLabel(span)}</span>
                <span className="diagrams-move-steps">
                  <button type="button" aria-label="Move the chords lower on the neck" disabled={songEdits.neck <= MIN_NECK}
                    onClick={() => moveChords(song.title, Math.max(MIN_NECK, songEdits.neck! - NECK_STEP))}>
                    Lower
                  </button>
                  <button type="button" aria-label="Move the chords higher on the neck" disabled={songEdits.neck >= MAX_NECK}
                    onClick={() => moveChords(song.title, Math.min(MAX_NECK, songEdits.neck! + NECK_STEP))}>
                    Higher
                  </button>
                </span>
                <button type="button" onClick={() => backToSongShapes(song.title)}>
                  {song.shapesFrom ? `Back to ${song.shapesFrom.toLowerCase()}` : 'Put back'}
                </button>
              </>
            )}
          </div>
        )}
        {uniqueChords.map(name => {
          const voicings = voicingsFor(name)
          const voicing = voicings[shapeFor(name)]
          if (!voicing) return null
          return (
            <div
              key={name}
              role="listitem"
              aria-label={name}
              onClick={onStage ? undefined : () => setPickerChord(name)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: onStage ? 'default' : 'pointer',
                padding: 4,
                borderRadius: 6,
                background: 'var(--diagram-tile)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                {name}
              </span>
              <ChordDiagram voicing={voicing} size={112} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {voicing.l}
              </span>
              {!onStage && (
                <button
                  type="button"
                  className="diagram-play"
                  aria-label={`Play ${name}`}
                  onClick={e => {
                    e.stopPropagation()
                    strum(voicing, capoFor(song, edits[song.title]))
                  }}
                >
                  &#9654;
                </button>
              )}
              {researched[name] !== undefined && shapeFor(name) === researched[name] ? (
                // The shape the songbook or a lesson shows for this song
                <span className="diagram-mark is-researched">{song.shapesFrom ?? 'Researched'}</span>
              ) : band[name] !== undefined && shapeFor(name) === band[name] ? (
                // Says which guitar it was chosen for, so the shape's style makes sense
                <span className="diagram-mark is-recommended">
                  {guitarFor(song, edits[song.title], view) === 'electric' ? 'Electric' : 'Acoustic'}
                </span>
              ) : choice(name).mine ? (
                <span className="diagram-mark is-own">Your pick</span>
              ) : null}
            </div>
          )
        })}
      </div>

      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          capo={capoFor(song, edits[song.title])}
          selectedIndex={shapeFor(pickerChord)}
          recommendedIndex={band[pickerChord]}
          onSelect={(index) => {
            // For this song only: the same chord elsewhere keeps its own shape
            pickSongShape(song.title, pickerChord, index)
            setPickerChord(null)
          }}
          onUseRecommended={!choice(pickerChord).mine ? undefined : () => {
            if (songEdits?.shapes?.[pickerChord] !== undefined) clearSongShape(song.title, pickerChord)
            else clearVoicing(pickerChord)
            setPickerChord(null)
          }}
          onClose={() => setPickerChord(null)}
        />
      )}
    </>
  )
}
