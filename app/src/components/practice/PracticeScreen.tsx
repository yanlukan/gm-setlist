import { useState } from 'react'
import { useStore } from '../../store/use-store'
import { useShownSong } from '../../hooks/use-shown-song'
import { useSongChart } from '../../hooks/use-song-chart'
import { SongSheet } from '../song/SongSheet'
import { PracticeHeader } from './PracticeHeader'
import { PracticePanel } from './PracticePanel'

/**
 * For home and rehearsal: the header with the song's setup, the chart (which
 * may scroll), and the panel with the shapes and the book. While editing, the
 * chord keyboard under the chart takes the panel's place.
 */
export function PracticeScreen() {
  const { song, extraFrom } = useShownSong()
  const chart = useSongChart(song)
  const editMode = useStore(s => s.editMode)
  // The chord picked on the chart belongs to its song: a new song lets go of it
  const [picked, setPicked] = useState<{ title: string; chord: string } | null>(null)
  const pickedChord = picked && song && picked.title === song.title ? picked.chord : null
  const pick = (chord: string | null) => setPicked(chord && song ? { title: song.title, chord } : null)

  return (
    <main className={editMode ? 'practice-screen is-editing' : 'practice-screen'} aria-label="Practice">
      {chart && <PracticeHeader chart={chart} extraFrom={extraFrom} />}
      <div className="practice-body">
        {/* A second tap on the picked chord lets go of it */}
        <SongSheet picked={pickedChord} onPick={chord => pick(chord === pickedChord ? null : chord)} />
        {chart && !editMode && <PracticePanel chart={chart} picked={pickedChord} onPick={pick} />}
      </div>
    </main>
  )
}
