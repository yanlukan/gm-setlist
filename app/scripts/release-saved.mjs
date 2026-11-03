// The release check's saved charts (release-check.mjs): the player's edited copies, stored the way
// the live app stores them (IndexedDB `playbook`, object store `songEdits`, one record per song
// title, store/persistence.ts), written as a player or an old paste may have left them.

/** Each saved chart: the song it replaces, its sections as stored, and a chord that shows it is drawn. */
export const SAVED = [
  {
    title: 'Faith',
    marker: 'Bbmaj9(#11)/D',
    sections: [
      // Bars without dots, chords before the first bar line
      { name: 'Verse', chords: 'B  E  |  B  E  |  A  B  |  E  |' },
      // Extra spaces and tabs
      { name: 'Chorus', chords: '|   C\t\tG   |\tAm    F  |\n|  C   G  |   F\t|' },
      // % with a repeat count, and a bar of only dots
      { name: 'Bridge', chords: '|  E  |  %  (x2)  |  .  .  .  .  |  A  B  |' },
      // Six chords in one bar
      { name: 'Solo', chords: '|  C  Dm  Em  F  G  Am  |  G  |' },
      // One long chord
      { name: 'Outro', chords: '|  Bbmaj9(#11)/D  |  E  |' },
    ],
  },
  {
    title: 'Too Funky',
    marker: 'Em7b5/Bb',
    sections: [
      { name: 'Intro', chords: '|\tDm   G/D |  Am/D\tG/D  |  Dm  G/D  |  Am/D  G/D  |  (x2)' },
      { name: 'Verse', chords: '|  Dm  G/D  |  .  .  .  .  |  Dm  G/D  |  %  (x4)' },
      { name: 'Chorus', chords: '|  Dm  G/D  Am/D  G/D  Dm  Em7b5/Bb  |  Dm  |' },
    ],
  },
]

const unsure = (bar, chords) => ({
  bar,
  chords,
  from: 'Unsure',
  readings: [
    { from: 'Book', chords },
    { from: 'Record', chords: 'C' },
  ],
})

/**
 * The check's own song, kept as a custom song: an Unsure bar at each of the places the mark has
 * the least room (one long chord, six chords, a staggered bar, `%`, only dots, the last column of
 * a row, and a staggered bar in the last column), and one bar without a mark that has the chords of
 * a marked one. Bars count from 0 across the section's lines.
 */
export const CHECK_SONG = {
  title: 'Release check: unsure bars',
  artist: 'Release check',
  key: 'E',
  bpm: 100,
  timeSignature: '4/4',
  capo: null,
  notes: '',
  chordsFrom: 'Ear',
  sections: [
    {
      name: 'Marks',
      chords: [
        '|  Bbmaj9(#11)/D  |  C  Dm  Em  F  G  Am  |  B  F#/A#  G#m  .  |  %  |',
        '|  E  |  .  .  .  .  |  A  |  A  B  |',
        '|  C  |  G  |  Am  |  B  F#/A#  G#m  .  |',
        // The chords of marked bar 0, unmarked: drawn the same as the marked one
        '|  Bbmaj9(#11)/D  |  C  |  G  |  Am  |',
      ].join('\n'),
    },
  ],
  evidence: {
    Marks: {
      from: 'Ear',
      bars: [
        unsure(0, 'Bbmaj9(#11)/D'),
        unsure(1, 'C Dm Em F G Am'),
        unsure(2, 'B F#/A# G#m .'),
        unsure(3, '%'),
        unsure(5, '. . . .'),
        unsure(7, 'A B'),
        unsure(11, 'B F#/A# G#m .'),
      ],
    },
  },
}
/** How many marks the check's song draws. */
export const CHECK_MARKS = CHECK_SONG.evidence.Marks.bars.length

/** In the page: puts the saved charts and the check's song in the app's own store, as the app would have saved them; `list` is the setlist as the app shows it, `{ name, titles }`. */
export const PUT_SAVED = ({ saved, songs, list }) =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('playbook')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction(['songEdits', 'customSongs', 'setlists'], 'readwrite')
      for (const { title, sections } of saved) tx.objectStore('songEdits').put({ title, sections })
      tx.objectStore('customSongs').put(songs, 'all')
      // The Songs sheet lists the active setlist: the custom songs go at its end
      const titles = [...list.titles, ...songs.map(song => song.title)]
      tx.objectStore('setlists').put({ lists: { default: { id: 'default', name: list.name, songTitles: titles } }, activeId: 'default' }, 'current')
      tx.oncomplete = () => {
        open.result.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
