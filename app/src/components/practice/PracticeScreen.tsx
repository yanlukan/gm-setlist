import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { SongSheet } from '../song/SongSheet'
import { ChordShapesSheet } from '../song/ChordShapesSheet'
import { PracticeHeader } from './PracticeHeader'

/**
 * For home and rehearsal: the header with the song's setup, and the chart
 * (which may scroll). Tap a chord and its shapes open over the chart. While
 * editing, the chord keyboard sits under the chart.
 */
export function PracticeScreen() {
  const { song, extraFrom } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  // The chord tapped on the chart belongs to its song: a new song lets go of it
  const [picked, setPicked] = useState<{ title: string; chord: string } | null>(null)
  const pickedChord = picked && song && picked.title === song.title ? picked.chord : null
  const pick = (chord: string | null) => setPicked(chord && song ? { title: song.title, chord } : null)

  return (
    <main className={editMode ? 'practice-screen is-editing' : 'practice-screen'} aria-label="Practice">
      {chart && <PracticeHeader chart={chart} extraFrom={extraFrom} />}
      <div className="practice-body">
        {/* A second tap on the picked chord lets go of it */}
        <SongSheet picked={pickedChord} onPick={chord => pick(chord === pickedChord ? null : chord)} />
      </div>
      {chart && !editMode && !chart.keyboard && pickedChord && (
        <ChordShapesSheet chart={chart} chord={pickedChord} onClose={() => pick(null)} />
      )}
    </main>
  )
}
