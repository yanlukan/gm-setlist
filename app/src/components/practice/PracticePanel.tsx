import type { SongChart } from '../../hooks/use-song-chart'
import { ShapeTiles } from './ShapeTiles'
import { BookFacts } from './BookFacts'

interface Props {
  chart: SongChart
  picked: string | null
  onPick: (chord: string | null) => void
  /** The player's size for the panel: its height upright, its width on its side. */
  size?: number
  side?: boolean
}

/**
 * Beside the chart on its side, under it upright: the song's shapes, then
 * the book and the notes. The keyboard player gets the book and the notes only.
 */
export function PracticePanel({ chart, picked, onPick, size, side = false }: Props) {
  const style = size === undefined ? undefined : side ? { width: size } : { height: size }
  return (
    <aside className="practice-panel" aria-label="Shapes and the book" style={style}>
      {!chart.keyboard && <ShapeTiles chart={chart} picked={picked} onPick={onPick} />}
      <BookFacts chart={chart} />
    </aside>
  )
}
