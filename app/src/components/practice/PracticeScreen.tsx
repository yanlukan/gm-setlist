import { useEffect, useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { SongSheet } from '../song/SongSheet'
import { ChordShapesSheet } from '../song/ChordShapesSheet'
import { UnsureSheet } from '../song/UnsureSheet'
import type { UnsureBar } from '../../music/evidence'
import { SongHeader } from '../song/SongHeader'
import { ShapesRow } from './ShapesRow'

/**
 * For home and rehearsal: the title line, the chart (which may scroll) and,
 * under it, a row with the shape of every chord in the song. Tap a chord, on
 * the chart or in the row, and all its shapes open over the chart. While
 * editing, the chord keyboard sits under the chart instead of the row.
 */
export function PracticeScreen() {
  const { song, extraFrom } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  const openSheet = useStore(s => s.openSheet)
  // The chord tapped on the chart belongs to its song: a new song lets go of it
  const [picked, setPicked] = useState<{ title: string; chord: string } | null>(null)
  // The unsure bar tapped belongs to its song too
  const [unsure, setUnsure] = useState<{ title: string; bar: UnsureBar } | null>(null)
  const pickedChord = picked && song && picked.title === song.title ? picked.chord : null
  // A chord tapped before editing is not the sheet to come back to after it
  useEffect(() => {
    if (editMode) {
      setPicked(null)
      setUnsure(null)
    }
  }, [editMode])
  // Another sheet opening takes the player's attention: the shapes close
  useEffect(() => {
    if (openSheet) {
      setPicked(null)
      setUnsure(null)
    }
  }, [openSheet])
  // The shapes and the sources never show together: opening one closes the other
  const pick = (chord: string | null) => {
    setPicked(chord && song ? { title: song.title, chord } : null)
    if (chord) setUnsure(null)
  }
  const askUnsure = (bar: UnsureBar) => {
    setUnsure(song ? { title: song.title, bar } : null)
    setPicked(null)
  }
  const shownUnsure = unsure && song && unsure.title === song.title ? unsure.bar : null

  return (
    <main className={editMode ? 'practice-screen is-editing' : 'practice-screen'} aria-label="Practice">
      {chart && <SongHeader chart={chart} extraFrom={extraFrom} screen="practice" />}
      <div className="practice-body">
        {/* A second tap on the picked chord lets go of it */}
        <SongSheet picked={pickedChord} onPick={chord => pick(chord === pickedChord ? null : chord)} onUnsure={askUnsure} />
        {chart && !editMode && !chart.keyboard && <ShapesRow chart={chart} picked={pickedChord} onPick={pick} />}
      </div>
      {chart && !editMode && !chart.keyboard && pickedChord && (
        <ChordShapesSheet chart={chart} chord={pickedChord} onClose={() => pick(null)} />
      )}
      {chart && !editMode && shownUnsure && (
        <UnsureSheet chart={chart} unsure={shownUnsure} onClose={() => setUnsure(null)} />
      )}
    </main>
  )
}
