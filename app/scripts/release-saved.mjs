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

/** In the page: puts the saved charts in the app's own store, as the app would have saved them. */
export const PUT_SAVED = saved =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open('playbook')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction('songEdits', 'readwrite')
      for (const { title, sections } of saved) tx.objectStore('songEdits').put({ title, sections })
      tx.oncomplete = () => {
        open.result.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
