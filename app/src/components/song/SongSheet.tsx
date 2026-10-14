import { useLayoutEffect, useRef } from 'react'
import { useStore } from '../../store/use-store'
import { keySpelling, shouldUseFlats, transposeText } from '../../music/theory'
import { normalizeChordText } from '../../music/chord-text'
import { pickSongShape } from '../../store/song-shapes'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { useChartFit } from '../../hooks/use-chart-fit'
import { useSwipe } from '../../hooks/use-swipe'
import { ChartEditor } from '../edit/ChartEditor'
import { ChartBody } from './ChartBody'
import { EmptyList } from './EmptyList'

interface Props {
  /** The chord picked on the chart, drawn as picked. */
  picked?: string | null
  /** A chord with shapes is a button that picks it. Without this, chords are plain. */
  onPick?: (chord: string) => void
}

/**
 * Practice's chart: read, with a part's name picking the part for the panel's
 * shapes, or edited in place with the chord keyboard under it.
 */
export function SongSheet({ picked = null, onPick }: Props) {
  const { song } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  const focusSection = useStore(s => s.focusSection)
  const setFocusSection = useStore(s => s.setFocusSection)
  const saveSections = useStore(s => s.saveSections)
  const saveNotes = useStore(s => s.saveNotes)
  const saveForm = useStore(s => s.saveForm)
  const nextSong = useStore(s => s.nextSong)
  const prevSong = useStore(s => s.prevSong)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  const fitKey = chart ? JSON.stringify([chart.fitKey, 'practice']) : ''
  // Practice draws every chord at one size: no bar shrinks alone
  useChartFit(scrollRef, fitRef, sectionsRef, fitKey, { bands: chart?.bands ?? false, enabled: !!chart && !editMode, oneSize: true })

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

  const { song: shown } = chart

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
    saveSections(shown.title, chart.sections.map((sec, i) => (i === index ? { ...sec, chords: atSource } : sec)))
  }

  if (editMode) {
    return (
      // The chart itself, editable, with the chord keyboard under it. The
      // title, the key and Done are in the header above.
      <ChartEditor
        // Undo, the cursor and the rest belong to one song: a new song starts a new editor
        key={shown.title}
        title={shown.title}
        heading={null}
        banners={null}
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
    )
  }

  return (
    <div ref={scrollRef} className="chart-scroll">
      <div ref={fitRef} className={chart.bands ? 'chart band-chart' : 'chart'}>
        <ChartBody
          chart={chart}
          sectionsRef={sectionsRef}
          onChord={onPick}
          picked={picked}
          focus={{
            index: focusSection?.title === shown.title ? focusSection.index : null,
            onFocus: index => setFocusSection(index === null ? null : { title: shown.title, index }),
          }}
        />
      </div>
    </div>
  )
}
