import { useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../../store/use-store'
import { shapesShown } from '../../store/view-settings'
import { keySpelling, shouldUseFlats, transposeText } from '../../music/theory'
import { normalizeChordText } from '../../music/chord-text'
import { positionLabel, shapeChoice } from '../../hooks/use-band-positions'
import { clearSongShape, pickSongShape } from '../../store/song-shapes'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart, type SongChart } from '../../hooks/use-song-chart'
import { useChartFit } from '../../hooks/use-chart-fit'
import { useSwipe } from '../../hooks/use-swipe'
import { VoicingPicker } from '../diagrams/VoicingPicker'
import { MoveChordsSheet } from './MoveChordsSheet'
import { ChartEditor } from '../edit/ChartEditor'
import { FormStrip } from './FormStrip'
import { ChartBody } from './ChartBody'
import { EmptyList } from './EmptyList'
import type { Song } from '../../types'

export function SongSheet() {
  const { song } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  const onStage = useStore(s => s.viewMode === 'stage')
  const diagramsVisible = useStore(shapesShown)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const selectedVoicings = useStore(s => s.selectedVoicings)
  const clearVoicing = useStore(s => s.clearVoicing)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)
  const saveForm = useStore(s => s.saveForm)
  const useBuiltInChart = useStore(s => s.useBuiltInChart)
  const showToast = useStore(s => s.showToast)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const [pickerChord, setPickerChord] = useState<string | null>(null)
  const [movingChords, setMovingChords] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  // A chart with the player's own chords says so, and one tap goes back to the
  // original. Not on stage, where nothing on the chart should change.
  const edited = !!chart && !editMode && !onStage && chart.edited

  const fitKey = chart
    ? JSON.stringify([chart.fitKey, chart.notes, chart.song.cue ?? '', chart.lowerKey, edited, onStage])
    : ''
  useChartFit(scrollRef, fitRef, sectionsRef, fitKey, { bands: chart?.bands ?? false, enabled: !!chart && !editMode })

  // Every song opens at its top, not as far down as the last one was scrolled
  const songTitle = song?.title
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [songTitle])

  // Swipe only on the chart itself, never while editing.
  useSwipe(scrollRef, { onSwipeLeft: nextSong, onSwipeRight: prevSong }, !editMode)

  if (!chart) {
    return (
      <div ref={scrollRef} className="chart-scroll">
        <EmptyList />
      </div>
    )
  }

  const goBackToOriginal = (song: Song) => {
    if (!confirm(`Go back to the original chart for "${song.title}"?\n\nYour chords are kept under Earlier versions (Edit, at the bottom of the chart).`)) return
    useBuiltInChart(song.title)
    showToast(`${song.title} shows the original chart`)
  }

  // The reverse move, so an edit keeps the chart's own spelling (Bb7 in D is Cb7 in Eb)
  const toSourcePitch = (text: string) => {
    if (!chart.shift) return text
    const { letterShift } = keySpelling(chart.sourceKey, chart.shift)
    return transposeText(text, -chart.shift, shouldUseFlats(chart.sourceKey, 0), letterShift === undefined ? undefined : -letterShift)
  }

  // Chord edits arrive as shown on screen and are stored at the song's own pitch.
  const updateChordsAt = (index: number, chords: string) => {
    // Tidy first: Return is a line break, never a join, and stray spaces go
    const atSource = toSourcePitch(normalizeChordText(chords))
    saveSections(chart.song.title, chart.sections.map((sec, i) => (i === index ? { ...sec, chords: atSource } : sec)))
  }

  // The title line, the same on the stage chart and while editing
  const renderHeading = ({ song, keyboard, span, songEdits }: SongChart) => (
    <div className="chart-head">
      <h1 className="chart-title">{song.title}</h1>
      {/* The GX-10 sound and the neck position are the guitarist's: the keyboard has neither */}
      {song.preset && !keyboard && (
        <span
          className="chart-preset"
          aria-label={`GX-10 sound: ${song.preset.name}${song.preset.solo ? `, ${song.preset.solo} for the solo` : ''}`}
        >
          {song.preset.name}
          {song.preset.solo && ` → ${song.preset.solo} solo`}
        </span>
      )}
      {span && !keyboard && (() => {
        // The song's area of the neck. Tap it to move every chord, except on stage
        const moved = songEdits?.neck !== undefined
        const where = `${moved ? 'Your' : 'Recommended'} position: ${positionLabel(span).toLowerCase().replace('–', ' to ')}`
        return onStage ? (
          <span className="chart-position" aria-label={where}>
            {positionLabel(span)}
          </span>
        ) : (
          <button
            type="button"
            className={moved ? 'chart-position is-moved' : 'chart-position'}
            aria-label={`${where}. Move the chords`}
            onClick={() => setMovingChords(true)}
          >
            {positionLabel(span)}
          </button>
        )
      })()}
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

  const renderBanners = ({ song, capo, shapesKey, playedKey, lowerKey, sourceKey }: SongChart) => (
    <>
      {song.cue && <div className="chart-cue">{song.cue}</div>}
      {capo > 0 && (
        <div className="chart-capo">
          Capo {capo}: play {shapesKey} shapes, sounds in {playedKey}
        </div>
      )}
      {lowerKey && (
        <div className="chart-warning">
          LOWER KEY — showing original {sourceKey}. Set the transpose with &minus; / + above.
        </div>
      )}
    </>
  )

  const { song: shown, songEdits, band } = chart
  const choice = (name: string) => shapeChoice(name, songEdits, selectedVoicings, band[name])

  return (
    <>
      {editMode ? (
        // The chart itself, editable, with the chord keyboard under it
        <ChartEditor
          // Undo, the cursor and the rest belong to one song: a new song starts a new editor
          key={shown.title}
          title={shown.title}
          heading={renderHeading(chart)}
          banners={renderBanners(chart)}
          sections={chart.sections}
          displaySections={chart.displaySections}
          form={chart.form}
          songKey={chart.shapesKey}
          capo={chart.capo}
          notes={chart.notes}
          onChords={updateChordsAt}
          onSections={next => saveSections(shown.title, next)}
          onNotes={text => saveNotes(shown.title, text)}
          onForm={next => saveForm(shown.title, next)}
          onShape={(chord, pick) => pickSongShape(shown.title, chord, pick)}
        />
      ) : (
        <div ref={scrollRef} className="chart-scroll">
          <div ref={fitRef} className={chart.bands ? 'chart band-chart' : 'chart'}>
            {renderHeading(chart)}
            {renderBanners(chart)}
            {chart.showForm && <FormStrip form={chart.form} letters={chart.letters} />}
            <ChartBody
              chart={chart}
              sectionsRef={sectionsRef}
              // Tappable chords open the voicing picker, except on stage, where a
              // brushed chord must not throw a pop-up over the chart mid-song.
              onChord={onStage ? undefined : setPickerChord}
              focus={
                diagramsVisible
                  ? {
                      index: focusSection?.title === shown.title ? focusSection.index : null,
                      onFocus: index => setFocusSection(index === null ? null : { title: shown.title, index }),
                    }
                  : undefined
              }
            />
            {chart.notes && <div className="chart-notes">{chart.notes}</div>}
          </div>
        </div>
      )}

      {movingChords && !onStage && (
        <MoveChordsSheet song={shown} edits={songEdits} onClose={() => setMovingChords(false)} />
      )}

      {/* Outside the chart, so swipes on the picker cannot change song */}
      {pickerChord && (
        <VoicingPicker
          chord={pickerChord}
          capo={chart.capo}
          selectedIndex={choice(pickerChord).index}
          recommendedIndex={band[pickerChord]}
          onSelect={pick => { pickSongShape(shown.title, pickerChord, pick); setPickerChord(null) }}
          onUseRecommended={!choice(pickerChord).mine ? undefined : () => {
            if (songEdits?.shapes?.[pickerChord] !== undefined) clearSongShape(shown.title, pickerChord)
            else clearVoicing(pickerChord)
            setPickerChord(null)
          }}
          onClose={() => setPickerChord(null)}
        />
      )}
    </>
  )
}
