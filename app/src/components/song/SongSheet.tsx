import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/use-store'
import { isChartMark, keySpelling, sectionColor, shouldUseFlats, transposeInKey, transposeText } from '../../music/theory'
import { voicingsFor } from '../../music/voicings'
import { useBandPositions } from '../../hooks/use-band-positions'
import { VoicingPicker } from '../diagrams/VoicingPicker'
import { EditableText } from '../shared/EditableText'
import { ChordLineEditor } from '../edit/ChordLineEditor'
import { playedKey, transposeFor } from '../../music/setlist-text'
import { useFitText } from '../../hooks/use-fit-text'
import { useSwipe } from '../../hooks/use-swipe'
import type { Song } from '../../types'

const SECTION_TYPES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Breakdown', 'Instrumental', 'Outro']

/** Chart text never goes below this — it scrolls instead. */
const MIN_CHART_PX = 20
/** Upper bound so a two-chord song does not become a wall of letters. */
const MAX_CHART_PX = 64
/** Keep progressions on one line if that still gives at least this size. */
const NO_WRAP_MIN_PX = 30

export function SongSheet() {
  const songs = useStore(s => s.songs)
  const customSongs = useStore(s => s.customSongs)
  const setlistData = useStore(s => s.setlistData)
  const edits = useStore(s => s.edits)
  const currentIndex = useStore(s => s.currentIndex)
  const editMode = useStore(s => s.editMode)
  const onStage = useStore(s => s.viewMode === 'stage')
  const diagramsVisible = useStore(s => s.diagramsVisible)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const selectVoicing = useStore(s => s.selectVoicing)
  const clearVoicing = useStore(s => s.clearVoicing)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const [pickerChord, setPickerChord] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const [customSectionName, setCustomSectionName] = useState('')
  /** Section whose chords are open in the tap-to-add palette. */
  const [paletteFor, setPaletteFor] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)

  const setlistSongs = useMemo(() => {
    const all = [...songs, ...customSongs]
    const active = setlistData.lists[setlistData.activeId]
    if (!active) return []
    return active.songTitles
      .map(title => all.find(s => s.title === title))
      .filter((s): s is Song => s !== undefined)
  }, [songs, customSongs, setlistData])

  const song = setlistSongs[currentIndex]
  const band = useBandPositions(song, song ? edits[song.title] : undefined)

  // Stored chords are always at the song's own pitch.
  const sections = useMemo(() => {
    if (!song) return []
    if (edits[song.title]?.sections) return edits[song.title].sections!
    return song.sections ?? []
  }, [song, edits])

  const semitones = song ? transposeFor(song, edits[song.title]) : 0
  const sourceKey = song ? (edits[song.title]?.key ?? song.key ?? '') : ''

  // What actually goes on the screen. Editing writes back through this, so the
  // guitarist edits what they see and the stored chart stays at source pitch.
  const displaySections = useMemo(() => {
    if (!semitones) return sections
    return sections.map(sec => ({ name: sec.name, chords: transposeInKey(sec.chords, sourceKey, semitones) }))
  }, [sections, semitones, sourceKey])

  const notes = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.notes !== undefined) return edits[song.title].notes!
    return song.notes ?? ''
  }, [song, edits])

  const showLowerKeyWarning = !!song?.lowerKey && semitones === 0

  // Fit the whole chart to the screen: biggest text that needs no scrolling.
  const fitKey = song
    ? JSON.stringify([song.title, displaySections, notes, song.cue ?? '', showLowerKeyWarning])
    : ''
  useFitText(scrollRef, fitRef, fitKey, {
    min: MIN_CHART_PX,
    max: MAX_CHART_PX,
    enabled: !!song && !editMode,
    preferNoWrapMin: NO_WRAP_MIN_PX,
  })

  // Swipe only on the chart itself, never while editing.
  useSwipe(scrollRef, { onSwipeLeft: nextSong, onSwipeRight: prevSong }, !editMode)

  // The reverse move, so an edit keeps the chart's own spelling (Bb7 in D is Cb7 in Eb)
  const toSourcePitch = (text: string) => {
    if (!semitones) return text
    const { letterShift } = keySpelling(sourceKey, semitones)
    return transposeText(text, -semitones, shouldUseFlats(sourceKey, 0), letterShift === undefined ? undefined : -letterShift)
  }

  // Chord edits arrive as shown on screen and are stored at the song's own pitch.
  const updateChordsAt = (index: number, chords: string) => {
    if (!song) return
    const atSource = toSourcePitch(chords)
    saveSections(song.title, sections.map((sec, i) => (i === index ? { ...sec, chords: atSource } : sec)))
  }

  // The palette belongs to one section of one song in edit mode.
  useEffect(() => {
    setPaletteFor(null)
  }, [song?.title, editMode])

  const renderBody = () => {
    if (!song) {
      // An empty setlist is a normal state, not an error — but don't leave the
      // player staring at a blank screen with nothing to tap.
      const listName = setlistData.lists[setlistData.activeId]?.name ?? 'this setlist'
      return (
        <div className="chart-empty">
          <div>&ldquo;{listName}&rdquo; is empty.</div>
          <div style={{ fontSize: 14 }}>
            Your other setlists are safe — open <strong>Setlists</strong> above to switch.
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

    const heading = (
      <div className="chart-head">
        <h1 className="chart-title">{song.title}</h1>
        {song.preset && (
          <span className="chart-preset" aria-label={`GX-10 sound: ${song.preset.name}`}>
            {song.preset.name}
          </span>
        )}
      </div>
    )

    const banners = (
      <>
        {song.cue && <div className="chart-cue">{song.cue}</div>}
        {showLowerKeyWarning && (
          <div className="chart-warning">
            LOWER KEY — showing original {sourceKey}. Set the transpose with &minus; / + above.
          </div>
        )}
      </>
    )

    if (!editMode) {
      return (
        <div ref={fitRef} className="chart">
          {heading}
          {banners}
          <div className="chart-sections">
            {displaySections.map((section, i) => {
              const focused = focusSection?.title === song.title && focusSection.index === i
              return (
                <Fragment key={`${song.title}-${i}`}>
                  {diagramsVisible ? (
                    // Tap a section to see just its chord shapes in the diagrams below
                    <button
                      type="button"
                      className={focused ? 'chart-label chart-label-btn is-focused' : 'chart-label chart-label-btn'}
                      style={{ color: sectionColor(section.name) }}
                      aria-pressed={focused}
                      onClick={() => setFocusSection(focused ? null : { title: song.title, index: i })}
                    >
                      {section.name}
                    </button>
                  ) : (
                    <div className="chart-label" style={{ color: sectionColor(section.name) }}>
                      {section.name}
                    </div>
                  )}
                  <div className="chart-chords">{renderChords(section.chords)}</div>
                </Fragment>
              )
            })}
          </div>
          {notes && <div className="chart-notes">{notes}</div>}
        </div>
      )
    }

    return renderEditor(song, heading, banners)
  }

  // Tappable chords open the voicing picker — except on stage, where a brushed
  // chord must not throw a pop-up over the chart mid-song.
  const renderChords = (text: string) =>
    text.split(/(\s+)/).map((token, i) => {
      if (!token.trim()) return <span key={i}>{token}</span>
      if (isChartMark(token)) return <span key={i} className="chart-mark">{token}</span>
      if (onStage) return <span key={i}>{token}</span>
      if (voicingsFor(token).length === 0) return <span key={i}>{token}</span>
      return (
        <span
          key={i}
          className="chart-chord-tap"
          onClick={e => {
            e.stopPropagation()
            setPickerChord(token)
          }}
        >
          {token}
        </span>
      )
    })

  const renderEditor = (song: Song, heading: React.ReactNode, banners: React.ReactNode) => {
    const moveSection = (index: number, dir: -1 | 1) => {
      const target = index + dir
      if (target < 0 || target >= sections.length) return
      const updated = [...sections]
      ;[updated[index], updated[target]] = [updated[target], updated[index]]
      saveSections(song.title, updated)
    }

    const deleteSection = (index: number) => {
      if (sections.length <= 1) return
      saveSections(song.title, sections.filter((_, i) => i !== index))
    }

    const addSection = (name: string) => {
      saveSections(song.title, [...sections, { name, chords: '' }])
      setShowAddSection(false)
      setCustomSectionName('')
    }


    const updateName = (index: number, name: string) => {
      saveSections(song.title, sections.map((s, i) => (i === index ? { ...s, name } : s)))
    }

    const smallBtn: React.CSSProperties = {
      minWidth: 36, minHeight: 36, fontSize: 16, borderRadius: 8,
      background: 'var(--badge-bg)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
    }

    return (
      <div className="chart" style={{ fontSize: 22 }}>
        {heading}
        {banners}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displaySections.map((section, i) => (
            <div
              key={`${song.title}-${i}`}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                padding: '4px 0', borderBottom: '1px solid var(--badge-bg)',
              }}
            >
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignSelf: 'center' }}>
                <button onClick={() => moveSection(i, -1)} style={smallBtn} disabled={i === 0}
                  aria-label={`Move ${section.name} up`}>▲</button>
                <button onClick={() => moveSection(i, 1)} style={smallBtn} disabled={i === sections.length - 1}
                  aria-label={`Move ${section.name} down`}>▼</button>
                <button
                  onClick={() => {
                    if (sections.length > 1 && confirm(`Delete the ${section.name} section?`)) deleteSection(i)
                  }}
                  style={{ ...smallBtn, color: '#ef4444' }}
                  disabled={sections.length <= 1}
                  aria-label={`Delete ${section.name}`}
                >&times;</button>
              </div>

              <EditableText
                value={section.name}
                onChange={name => updateName(i, name)}
                style={{
                  minWidth: 80, maxWidth: 130, fontSize: 13, fontWeight: 600,
                  textTransform: 'uppercase', color: sectionColor(section.name),
                  borderBottom: '1px dashed var(--edit-border, #f59e0b)',
                  outline: 'none', flexShrink: 0,
                }}
              />

              <EditableText
                value={section.chords}
                onChange={chords => updateChordsAt(i, chords)}
                style={{
                  fontSize: 22, fontWeight: 'bold', letterSpacing: 1, wordSpacing: 10,
                  background: 'var(--badge-bg)', borderRadius: 4, padding: '4px 8px',
                  outline: 'none', whiteSpace: 'pre-wrap', minWidth: 60, flex: 1,
                }}
              />

              <button
                onClick={() => {
                  // Commit and close any field being typed in first (this also
                  // drops the keyboard), so the field and the palette never
                  // disagree about the line.
                  const active = document.activeElement
                  if (active instanceof HTMLElement) active.blur()
                  setPaletteFor(i)
                }}
                style={{ ...smallBtn, padding: '0 12px', color: 'var(--text)', alignSelf: 'center', fontWeight: 600 }}
                aria-label={`Pick chords for ${section.name}`}
              >
                Chords
              </button>
            </div>
          ))}

          {showAddSection ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0' }}>
              {SECTION_TYPES.map(name => (
                <button key={name} onClick={() => addSection(name)} style={{
                  padding: '8px 14px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  background: 'var(--badge-bg)', color: 'var(--text)', border: 'none',
                }}>{name}</button>
              ))}
              <div style={{ display: 'flex', gap: 4, width: '100%', marginTop: 4 }}>
                <input
                  value={customSectionName}
                  onChange={e => setCustomSectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customSectionName.trim()) addSection(customSectionName.trim()) }}
                  placeholder="Custom name..."
                  style={{ flex: 1 }}
                />
                <button onClick={() => setShowAddSection(false)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 14,
                  background: 'var(--badge-bg)', color: 'var(--text-muted)', border: 'none',
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddSection(true)} style={{
              marginTop: 8, padding: '10px 16px', borderRadius: 8, fontSize: 15, fontWeight: 600,
              background: 'transparent', border: '2px dashed var(--edit-border, #f59e0b)',
              color: 'var(--edit-border, #f59e0b)', alignSelf: 'flex-start',
            }}>+ Add Section</button>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>NOTES</div>
          <EditableText
            value={notes}
            onChange={text => saveNotes(song.title, text)}
            style={{
              fontSize: 15, padding: 8, borderRadius: 6, background: 'var(--badge-bg)',
              outline: 'none', minHeight: 44, fontStyle: 'italic', color: 'var(--text-muted)',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={scrollRef} className="chart-scroll">
        {renderBody()}
      </div>

      {editMode && song && paletteFor !== null && displaySections[paletteFor] && (
        <ChordLineEditor
          sectionName={displaySections[paletteFor].name}
          chords={displaySections[paletteFor].chords}
          songKey={playedKey(song, edits[song.title]).key}
          onChange={chords => updateChordsAt(paletteFor, chords)}
          onClose={() => setPaletteFor(null)}
        />
      )}

      {/* Outside the chart, so swipes on the picker cannot change song */}
      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          selectedIndex={selectedVoicings[pickerChord] ?? band[pickerChord] ?? 0}
          recommendedIndex={band[pickerChord]}
          onSelect={i => { selectVoicing(pickerChord, i); setPickerChord(null) }}
          onUseBandPick={selectedVoicings[pickerChord] === undefined ? undefined : () => {
            clearVoicing(pickerChord)
            setPickerChord(null)
          }}
          onClose={() => setPickerChord(null)}
        />
      )}
    </>
  )
}
