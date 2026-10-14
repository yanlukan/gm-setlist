import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { SongChart } from '../../hooks/use-song-chart'
import { ShapeTiles } from './ShapeTiles'
import { BookFacts } from './BookFacts'
import { SongOrder } from './SongOrder'
import { useStore } from '../../store/use-store'
import { useTilesFit } from '../../hooks/use-tiles-fit'

interface Props {
  chart: SongChart
  picked: string | null
  onPick: (chord: string | null) => void
  /** The player's size for the panel: its height upright, its width on its side. */
  size?: number
  side?: boolean
  panelRef?: RefObject<HTMLElement | null>
}

/**
 * Beside the chart on its side, under it upright: the song's shapes, the
 * song order in words, then the book and the notes. The keyboard player gets the book and the notes only.
 */
export function PracticePanel({ chart, picked, onPick, size, side = false, panelRef }: Props) {
  const ownRef = useRef<HTMLElement>(null)
  const editMode = useStore(s => s.editMode)
  const ref = panelRef ?? ownRef
  // A new song, a picked chord or a turned iPad: the shapes refit
  useTilesFit(ref, `${chart.fitKey}|${picked ?? ''}|${side}|${size ?? ''}`, side)
  // A new song starts with its shapes in view, not where the last one was scrolled to
  const title = chart.song.title
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [ref, title])
  const style = size === undefined ? undefined : side ? { width: size } : { height: size }
  return (
    <aside ref={ref} className="practice-panel" aria-label="Shapes and the book" style={style}>
      {!chart.keyboard && <ShapeTiles chart={chart} picked={picked} onPick={onPick} />}
      {/* While editing, the editor has the song order: two would read as a mistake */}
      {chart.showForm && !editMode && <SongOrder chart={chart} />}
      <BookFacts chart={chart} />
    </aside>
  )
}
