import { useStore } from '../store/use-store'

// Faith as it was charted before bars (3.58.0), one line a section. The editor,
// capo and song-order tests tap chords and steps by their place, so they keep
// this chart; the built-in Faith is in bars from 3.59.0 and is pinned by
// songs-in-bars.test.ts.
export const FAITH_ONE_LINE = {
  form: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Solo', 'Pre-Chorus', 'Chorus'],
  sections: [
    { name: 'Intro', chords: 'B' },
    { name: 'Verse', chords: 'B  E  B  E  B' },
    { name: 'Pre-Chorus', chords: 'E  B  E  B  E  B  G#m  C#m  F#  N.C.' },
    { name: 'Chorus', chords: 'B' },
    { name: 'Solo', chords: 'B  E  B  E  B' },
  ],
}

/** Gives the store's built-in Faith the one-line chart. */
export function faithOneLine() {
  useStore.setState(state => ({
    songs: state.songs.map(song => (song.title === 'Faith' ? { ...song, ...FAITH_ONE_LINE } : song)),
  }))
}
