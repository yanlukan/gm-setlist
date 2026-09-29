import { useState, useMemo } from 'react'
import { useStore } from '../../store/use-store'
import { transposeFor } from '../../music/setlist-text'
import { shapeText, voicingsFor } from '../../music/voicings'
import { useBandPositions } from '../../hooks/use-band-positions'
import { transposeInKey } from '../../music/theory'
import { ChordDiagram } from './ChordDiagram'
import { VoicingPicker } from './VoicingPicker'

export function DiagramsBar() {
  // Primitive selectors — no method calls
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const selectVoicing = useStore(s => s.selectVoicing)
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
  const band = useBandPositions(song, song ? edits[song.title] : undefined).picks
  const shapeFor = (name: string) => selectedVoicings[name] ?? band[name] ?? 0

  // The section tapped on the chart, if it belongs to this song
  const focus = useMemo(() => {
    if (!song || !focusSection || focusSection.title !== song.title) return null
    const sections = edits[song.title]?.sections ?? song.sections ?? []
    const section = sections[focusSection.index]
    return section ? { index: focusSection.index, name: section.name } : null
  }, [song, edits, focusSection])

  const uniqueChords = useMemo(() => {
    if (!song) return []
    const songEdits = edits[song.title]
    const stored = songEdits?.sections ?? song.sections ?? []
    // Show the shapes actually being played, not the ones at source pitch.
    const semitones = transposeFor(song, songEdits)
    const sourceKey = songEdits?.key ?? song.key ?? ''
    const sections = semitones
      ? stored.map(sec => ({ ...sec, chords: transposeInKey(sec.chords, sourceKey, semitones) }))
      : stored
    const seen = new Set<string>()
    const result: string[] = []
    for (const section of focus ? [sections[focus.index]] : sections) {
      const names = section.chords.split(/[\s|,]+/).filter(Boolean)
      for (const name of names) {
        if (!seen.has(name) && voicingsFor(name).length > 0) {
          seen.add(name)
          result.push(name)
        }
      }
    }
    return result
  }, [song, edits, focus])

  if (!song || uniqueChords.length === 0) return null

  return (
    <>
      <div
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
        {uniqueChords.map(name => {
          const voicings = voicingsFor(name)
          if (voicings.length === 0) return null
          const voicing = voicings[shapeFor(name)] ?? voicings[0]
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
              <ChordDiagram voicing={voicing} size={80} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {voicing.l}
              </span>
              {band[name] !== undefined && shapeFor(name) === band[name] ? (
                // A shape a lesson or transcription of the record shows, or the usual one
                song.shapes?.[name] === shapeText(voicing) ? (
                  <span className="diagram-mark is-researched">{song.shapesFrom ?? 'Researched'}</span>
                ) : (
                  <span className="diagram-mark is-recommended">Recommended</span>
                )
              ) : selectedVoicings[name] !== undefined ? (
                <span className="diagram-mark is-own">Your pick</span>
              ) : null}
            </div>
          )
        })}
      </div>

      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          selectedIndex={shapeFor(pickerChord)}
          recommendedIndex={band[pickerChord]}
          onSelect={(index) => {
            selectVoicing(pickerChord, index)
            setPickerChord(null)
          }}
          onUseRecommended={selectedVoicings[pickerChord] === undefined ? undefined : () => {
            clearVoicing(pickerChord)
            setPickerChord(null)
          }}
          onClose={() => setPickerChord(null)}
        />
      )}
    </>
  )
}
