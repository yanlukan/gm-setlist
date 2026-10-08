import { Fragment, useMemo, useRef, useState } from 'react'
import { useChartView, useStore } from '../../store/use-store'
import { isChartMark, keySpelling, sectionColor, shouldUseFlats, transposeText } from '../../music/theory'
import { capoFor, shapeKey, shapeSections, shapeShift, simplifyText } from '../../music/chart-view'
import { hasShapes, shapeToShow } from '../../music/voicings'
import { positionLabel, useBandPositions } from '../../hooks/use-band-positions'
import { VoicingPicker } from '../diagrams/VoicingPicker'
import { ChartEditor } from '../edit/ChartEditor'
import { FormStrip } from './FormStrip'
import { formMatches } from '../../music/form'
import { hasEditedChart } from '../../music/chart-edits'
import { playedKey, transposeFor } from '../../music/setlist-text'
import { normalizeChordText } from '../../music/chord-text'
import { useFitText } from '../../hooks/use-fit-text'
import { useSwipe } from '../../hooks/use-swipe'
import type { Song } from '../../types'

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
  const saveForm = useStore(s => s.saveForm)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  const restoreGigOrder = useStore(s => s.restoreGigOrder)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const [pickerChord, setPickerChord] = useState<string | null>(null)

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
  const { picks: band, span } = useBandPositions(song, song ? edits[song.title] : undefined)

  // Stored chords are always at the song's own pitch.
  const sections = useMemo(() => {
    if (!song) return []
    if (edits[song.title]?.sections) return edits[song.title].sections!
    return song.sections ?? []
  }, [song, edits])

  const view = useChartView()
  const semitones = song ? transposeFor(song, edits[song.title]) : 0
  const capo = song ? capoFor(song, edits[song.title]) : 0
  // From the stored chart to the shapes played: the band's key, less the capo
  const shift = song ? shapeShift(song, edits[song.title]) : 0
  const sourceKey = song ? (edits[song.title]?.key ?? song.key ?? '') : ''

  // The chart at the shapes' pitch. Editing writes back through this, so the
  // guitarist edits what they see and the stored chart stays at source pitch.
  const displaySections = useMemo(
    () => (song ? shapeSections(song, edits[song.title]) : []),
    [song, edits],
  )
  // What is read: the same, made plain if the player asked for plain chords.
  // Never edited, so a plain chart can never overwrite the real chords.
  const readSections = useMemo(
    () => (view.simple ? displaySections.map(sec => ({ ...sec, chords: simplifyText(sec.chords) })) : displaySections),
    [displaySections, view.simple],
  )

  const notes = useMemo(() => {
    if (!song) return ''
    if (edits[song.title]?.notes !== undefined) return edits[song.title].notes!
    return song.notes ?? ''
  }, [song, edits])

  // The order the song is played in: the player's own, else the built-in one
  const form = useMemo(() => {
    if (!song) return []
    return edits[song.title]?.form ?? song.form ?? []
  }, [song, edits])

  const showLowerKeyWarning = !!song?.lowerKey && semitones === 0

  // A chart with the player's own chords says so, and one tap goes back to the
  // original. Not on stage, where nothing on the chart should change.
  const edited = !!song && !editMode && !onStage && hasEditedChart(song, edits[song.title])
  const goBackToOriginal = (song: Song) => {
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  // Fit the whole chart to the screen: biggest text that needs no scrolling.
  const fitKey = song
    ? JSON.stringify([song.title, readSections, form, notes, song.cue ?? '', showLowerKeyWarning, edited, capo])
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
    if (!shift) return text
    const { letterShift } = keySpelling(sourceKey, shift)
    return transposeText(text, -shift, shouldUseFlats(sourceKey, 0), letterShift === undefined ? undefined : -letterShift)
  }

  // Chord edits arrive as shown on screen and are stored at the song's own pitch.
  const updateChordsAt = (index: number, chords: string) => {
    if (!song) return
    // Tidy first: Return is a line break, never a join, and stray spaces go
    const atSource = toSourcePitch(normalizeChordText(chords))
    saveSections(song.title, sections.map((sec, i) => (i === index ? { ...sec, chords: atSource } : sec)))
  }

  // The title line, the same on the stage chart and while editing
  const renderHeading = (song: Song) => (
    <div className="chart-head">
      <h1 className="chart-title">{song.title}</h1>
      {song.preset && (
        <span
          className="chart-preset"
          aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
        >
          {song.preset.name}
          {song.preset.solo && ` → ${song.preset.solo} solo`}
        </span>
      )}
      {span && (
        <span
          className="chart-position"
          aria-label={`Recommended position: ${positionLabel(span).toLowerCase().replace('–', ' to ')}`}
        >
          {positionLabel(span)}
        </span>
      )}
      {edited && (
        <button
          type="button"
          className="chart-edited"
          aria-label="This chart has your own edits. Go back to the original chart"
          onClick={() => goBackToOriginal(song)}
        >
          EDITED &middot; back to original
        </button>
      )}
    </div>
  )

  const renderBanners = (song: Song) => (
    <>
      {song.cue && <div className="chart-cue">{song.cue}</div>}
      {capo > 0 && (
        <div className="chart-capo">
          Capo {capo}: play {shapeKey(playedKey(song, edits[song.title]).key, -capo)} shapes, sounds in {playedKey(song, edits[song.title]).key}
        </div>
      )}
      {showLowerKeyWarning && (
        <div className="chart-warning">
          LOWER KEY — showing original {sourceKey}. Set the transpose with &minus; / + above.
        </div>
      )}
    </>
  )

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

    const heading = renderHeading(song)
    const banners = renderBanners(song)

    return (
      <div ref={fitRef} className="chart">
        {heading}
        {banners}
        {formMatches(form, readSections) && <FormStrip form={form} />}
        <div className="chart-sections">
          {readSections.map((section, i) => {
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

  // Tappable chords open the voicing picker — except on stage, where a brushed
  // chord must not throw a pop-up over the chart mid-song.
  const renderChords = (text: string) =>
    text.split(/(\s+)/).map((token, i) => {
      if (!token.trim()) return <span key={i}>{token}</span>
      if (isChartMark(token)) return <span key={i} className="chart-mark">{token}</span>
      if (onStage) return <span key={i}>{token}</span>
      if (!hasShapes(token)) return <span key={i}>{token}</span>
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

  return (
    <>
      {editMode && song ? (
        // The chart itself, editable, with the chord keyboard under it
        <ChartEditor
          // Undo, the cursor and the rest belong to one song: a new song starts a new editor
          key={song.title}
          title={song.title}
          heading={renderHeading(song)}
          banners={renderBanners(song)}
          sections={sections}
          displaySections={displaySections}
          form={form}
          songKey={shapeKey(playedKey(song, edits[song.title]).key, -capo)}
          notes={notes}
          onChords={updateChordsAt}
          onSections={next => saveSections(song.title, next)}
          onNotes={text => saveNotes(song.title, text)}
          onForm={next => saveForm(song.title, next)}
        />
      ) : (
        <div ref={scrollRef} className="chart-scroll">
          {renderBody()}
        </div>
      )}

      {/* Outside the chart, so swipes on the picker cannot change song */}
      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          selectedIndex={shapeToShow(pickerChord, selectedVoicings[pickerChord], band[pickerChord])}
          recommendedIndex={band[pickerChord]}
          onSelect={i => { selectVoicing(pickerChord, i); setPickerChord(null) }}
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
