import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/use-store'
import { DEFAULT_SONGS, GIG_SETLIST_2026 } from '../../data/songs'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
})

describe('useStore', () => {
  describe('initial state', () => {
    it('starts at index 0', () => {
      expect(useStore.getState().currentIndex).toBe(0)
    })

    it('has dark theme by default', () => {
      expect(useStore.getState().theme).toBe('dark')
    })

    it('has default songs loaded', () => {
      expect(useStore.getState().songs).toBe(DEFAULT_SONGS)
    })
  })

  describe('navigation', () => {
    it('nextSong increments currentIndex', () => {
      useStore.getState().nextSong()
      expect(useStore.getState().currentIndex).toBe(1)
    })

    it('nextSong clamps to max', () => {
      const max = DEFAULT_SONGS.length - 1
      useStore.setState({ currentIndex: max })
      useStore.getState().nextSong()
      expect(useStore.getState().currentIndex).toBe(max)
    })

    it('prevSong decrements currentIndex', () => {
      useStore.setState({ currentIndex: 3 })
      useStore.getState().prevSong()
      expect(useStore.getState().currentIndex).toBe(2)
    })

    it('prevSong clamps to 0', () => {
      useStore.setState({ currentIndex: 0 })
      useStore.getState().prevSong()
      expect(useStore.getState().currentIndex).toBe(0)
    })

    it('goToSong sets index and disables editMode', () => {
      useStore.setState({ editMode: true })
      useStore.getState().goToSong(5)
      expect(useStore.getState().currentIndex).toBe(5)
      expect(useStore.getState().editMode).toBe(false)
    })

    it('goToSong clamps to valid range', () => {
      useStore.getState().goToSong(-1)
      expect(useStore.getState().currentIndex).toBe(0)

      useStore.getState().goToSong(9999)
      expect(useStore.getState().currentIndex).toBe(DEFAULT_SONGS.length - 1)
    })
  })

  describe('currentSong', () => {
    it('returns the correct song at currentIndex', () => {
      // The default setlist is the printed running order, which is not the
      // same as the order songs happen to sit in the data file.
      useStore.setState({ currentIndex: 0 })
      expect(useStore.getState().currentSong()?.title).toBe(GIG_SETLIST_2026[0])

      useStore.setState({ currentIndex: 2 })
      expect(useStore.getState().currentSong()?.title).toBe(GIG_SETLIST_2026[2])
    })
  })

  describe('editMode', () => {
    it('toggleEditMode flips editMode', () => {
      expect(useStore.getState().editMode).toBe(false)
      useStore.getState().toggleEditMode()
      expect(useStore.getState().editMode).toBe(true)
      useStore.getState().toggleEditMode()
      expect(useStore.getState().editMode).toBe(false)
    })
  })

  describe('edits', () => {
    it('saveSections stores and getEditedSections retrieves', () => {
      const title = DEFAULT_SONGS[0].title
      const newSections = [{ name: 'Custom', chords: 'Am G' }]
      useStore.getState().saveSections(title, newSections)
      expect(useStore.getState().getEditedSections(title)).toEqual(newSections)
    })

    it('getEditedSections falls back to original sections when no edits', () => {
      const song = DEFAULT_SONGS[0]
      expect(useStore.getState().getEditedSections(song.title)).toEqual(song.sections)
    })

    it('getEditedNotes falls back to original notes when no edits', () => {
      const song = DEFAULT_SONGS[0]
      expect(useStore.getState().getEditedNotes(song.title)).toBe(song.notes)
    })

    it('getCurrentKey falls back to original key when no edits', () => {
      const song = DEFAULT_SONGS[0]
      expect(useStore.getState().getCurrentKey(song.title)).toBe(song.key)
    })

    it('resetEdits removes edits for a song', () => {
      const title = DEFAULT_SONGS[0].title
      useStore.getState().saveSections(title, [{ name: 'X', chords: 'C' }])
      useStore.getState().resetEdits(title)
      expect(useStore.getState().edits[title]).toBeUndefined()
    })
  })

  describe('theme', () => {
    it('defaults to dark', () => {
      expect(useStore.getState().theme).toBe('dark')
    })

    it('toggles to light', () => {
      useStore.getState().toggleTheme()
      expect(useStore.getState().theme).toBe('light')
    })

    it('toggles back to dark', () => {
      useStore.getState().toggleTheme()
      useStore.getState().toggleTheme()
      expect(useStore.getState().theme).toBe('dark')
    })
  })

  describe('setlist actions', () => {
    it('setActiveSetlist changes active and resets index', () => {
      useStore.setState({ currentIndex: 5 })
      useStore.getState().setActiveSetlist('default')
      expect(useStore.getState().setlistData.activeId).toBe('default')
      expect(useStore.getState().currentIndex).toBe(0)
    })

    it('createSetlist adds a new setlist and sets it active', () => {
      useStore.getState().createSetlist('My Set')
      const { setlistData } = useStore.getState()
      const ids = Object.keys(setlistData.lists)
      const newId = ids.find(id => id !== 'default')!
      expect(setlistData.lists[newId].name).toBe('My Set')
      expect(setlistData.activeId).toBe(newId)
    })

    it('deleteSetlist prevents deleting default', () => {
      useStore.getState().deleteSetlist('default')
      expect(useStore.getState().setlistData.lists['default']).toBeDefined()
    })

    it('addSongToSetlist prevents duplicates', () => {
      const title = DEFAULT_SONGS[0].title
      const before = useStore.getState().setlistData.lists['default'].songTitles.length
      useStore.getState().addSongToSetlist('default', title)
      const after = useStore.getState().setlistData.lists['default'].songTitles.length
      expect(after).toBe(before)
    })
  })
})

describe('gig-critical behaviour', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })

  describe('the default setlist', () => {
    it('is the full 21-song September 2026 running order', () => {
      const { setlistData } = useStore.getState()
      const active = setlistData.lists[setlistData.activeId]
      expect(active.songTitles).toEqual(GIG_SETLIST_2026)
      expect(active.songTitles).toHaveLength(21)
    })

    it('resolves every title to a real song', () => {
      const titles = new Set(DEFAULT_SONGS.map(s => s.title))
      for (const title of GIG_SETLIST_2026) {
        expect(titles.has(title)).toBe(true)
      }
      expect(useStore.getState().setlistSongs()).toHaveLength(21)
    })
  })

  describe('transpose', () => {
    it('does not rewrite the stored chords', () => {
      const title = GIG_SETLIST_2026[0]
      const original = useStore.getState().getEditedSections(title).map(s => s.chords)

      useStore.getState().setTranspose(title, -2)

      expect(useStore.getState().getEditedSections(title).map(s => s.chords)).toEqual(original)
      expect(useStore.getState().edits[title]?.sections).toBeUndefined()
    })

    it('transposes what is displayed, and back again', () => {
      const title = 'Faith' // stored in B
      useStore.getState().setTranspose(title, -2)

      expect(useStore.getState().getDisplayKey(title)).toBe('A')
      expect(useStore.getState().getDisplaySections(title)[0].chords).toBe('A')

      useStore.getState().setTranspose(title, 0)
      expect(useStore.getState().getDisplayKey(title)).toBe('B')
      expect(useStore.getState().getDisplaySections(title)[0].chords).toBe('B')
    })

    it('is clamped to +/- 11 semitones', () => {
      const title = GIG_SETLIST_2026[0]
      useStore.getState().setTranspose(title, 99)
      expect(useStore.getState().getTranspose(title)).toBe(11)
      useStore.getState().setTranspose(title, -99)
      expect(useStore.getState().getTranspose(title)).toBe(-11)
    })
  })

  describe('setlist position', () => {
    it('stays in range when the last song is removed', () => {
      const { setlistData, removeSongFromSetlist } = useStore.getState()
      const id = setlistData.activeId
      useStore.setState({ currentIndex: 20 })

      removeSongFromSetlist(id, GIG_SETLIST_2026[20])

      expect(useStore.getState().currentIndex).toBe(19)
      expect(useStore.getState().currentSong()).toBeDefined()
    })
  })

  describe('restoreGigOrder', () => {
    it('rebuilds the running order after songs are removed', () => {
      const id = useStore.getState().setlistData.activeId
      useStore.getState().removeSongFromSetlist(id, 'Faith')
      useStore.getState().removeSongFromSetlist(id, 'Outside')
      expect(useStore.getState().setlistSongs()).toHaveLength(19)

      useStore.getState().restoreGigOrder()

      expect(useStore.getState().setlistData.lists[id].songTitles).toEqual(GIG_SETLIST_2026)
      expect(useStore.getState().currentIndex).toBe(0)
    })
  })
})

describe('navigation on an empty setlist', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })

  it('stays at position 0 instead of going to -1', () => {
    useStore.getState().createSetlist('Empty')
    useStore.getState().nextSong()
    expect(useStore.getState().currentIndex).toBe(0)
    useStore.getState().prevSong()
    expect(useStore.getState().currentIndex).toBe(0)
  })
})

describe('duplicateSetlist', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })

  it('copies the songs into a new setlist and switches to it', () => {
    const original = useStore.getState().setlistData.activeId
    useStore.getState().duplicateSetlist(original)

    const { setlistData } = useStore.getState()
    expect(setlistData.activeId).not.toBe(original)
    const copy = setlistData.lists[setlistData.activeId]
    expect(copy.name).toBe('GM Tribute — Sept 2026 (copy)')
    expect(copy.songTitles).toEqual(GIG_SETLIST_2026)
  })

  it('leaves the original untouched when the copy is changed', () => {
    const original = useStore.getState().setlistData.activeId
    useStore.getState().duplicateSetlist(original)
    const copyId = useStore.getState().setlistData.activeId
    useStore.getState().removeSongFromSetlist(copyId, 'Faith')

    expect(useStore.getState().setlistData.lists[original].songTitles).toEqual(GIG_SETLIST_2026)
    expect(useStore.getState().setlistData.lists[copyId].songTitles).toHaveLength(20)
  })
})

describe('band keys that ship with the songs', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })

  it('plays Amazing in Am, a semitone under the chart, with no setup on the iPad', () => {
    const s = useStore.getState()
    expect(s.getTranspose('Amazing')).toBe(-1)
    expect(s.getDisplayKey('Amazing')).toBe('Am')
    expect(s.getDisplaySections('Amazing')[0].chords.split(/\s+/)[0]).toBe('Am7')
  })

  it("lets the player's own transpose win over the band key", () => {
    useStore.getState().setTranspose('Amazing', -2)
    // G# minor (five sharps) is the conventional name, not Ab minor (seven flats)
    expect(useStore.getState().getDisplayKey('Amazing')).toBe('G#m')
  })

  it('goes back to the band key on Reset, not to the recording key', () => {
    useStore.getState().setTranspose('Amazing', 3)
    useStore.getState().resetEdits('Amazing')
    expect(useStore.getState().getDisplayKey('Amazing')).toBe('Am')
  })

  it("has Freedom! '90 in C, with the Cm line cliche", () => {
    const freedom = useStore.getState().allSongs().find(s => s.title === "Freedom! '90")!
    expect(freedom.key).toBe('C')
    // The songbook's line cliche (no. 19)
    expect(freedom.sections.map(s => s.chords).join(' ')).toContain('Cm  Cm(maj7)  Cm7  Cm6')
    expect(freedom.transpose ?? 0).toBe(0)
  })
})

describe('all five lower-key songs', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })

  it('open in the band key with no lower-key warning', () => {
    const s = useStore.getState()
    const played = Object.fromEntries(
      ["I'm Your Man", 'Club Tropicana', 'Amazing', 'Wake Me Up Before You Go-Go', 'Careless Whisper']
        .map(t => [t, s.getDisplayKey(t)]),
    )
    expect(played).toEqual({
      "I'm Your Man": 'C',
      'Club Tropicana': 'A',
      Amazing: 'Am',
      'Wake Me Up Before You Go-Go': 'B',
      'Careless Whisper': 'Cm',
    })
  })

  it('clearing your own transpose returns to the band key', () => {
    useStore.getState().setTranspose('Careless Whisper', 0)
    expect(useStore.getState().getDisplayKey('Careless Whisper')).toBe('Dm')
    useStore.getState().clearTranspose('Careless Whisper')
    expect(useStore.getState().getDisplayKey('Careless Whisper')).toBe('Cm')
  })
})

describe('Club Tropicana', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })

  it('is played in A, two semitones under the chart', () => {
    const s = useStore.getState()
    expect(s.getDisplayKey('Club Tropicana')).toBe('A')
    // The bass transcription and two guitar charts: a chromatic slide into the verse
    const chorus = s.getDisplaySections('Club Tropicana').find(sec => sec.name === 'Chorus')!
    expect(chorus.chords).toBe('A  C#m7  A  C#m7  A  C#m7  A  C#m7  Cm7  Bm7')
    const verse = s.getDisplaySections('Club Tropicana').find(sec => sec.name === 'Verse')!
    expect(verse.chords).toBe('Em7  A7  Em7  A7  Em7  A7  Em7  A7  A/C#  D')
  })
})

describe('Outside', () => {
  it('matches the songbook: Gm9/C6 groove, chorus three times round, turning on Dsus4', () => {
    const outside = useStore.getInitialState().allSongs().find(s => s.title === 'Outside')!
    const byName = Object.fromEntries(outside.sections.map(s => [s.name, s.chords]))
    expect(outside.key).toBe('Gm')
    expect(byName.Verse).toBe('Gm9  C6  Gm9  C6')
    expect(byName.Chorus).toBe('Cm7  Cm6  Gm9  Gm  (x3)')
    expect(byName['Chorus end']).toBe('Cm7  Cm6  Dsus4') // the turnaround belongs to the chorus
    expect(byName.Instrumental).toBe('N.C.')             // guitar lays out
    expect(byName.Outro).toBe('Gm9  C6  Gm9  C6')
    expect(byName.Bridge).toBeUndefined()                // the chorus was once mislabelled Bridge
  })
})

describe('charts checked against the recordings', () => {
  const song = (title: string) => useStore.getInitialState().allSongs().find(s => s.title === title)!
  const first = (title: string) => song(title).sections[0].chords.split(/\s+/)[0]

  it('has Somebody to Love in G, as George Michael sang it with Queen', () => {
    expect(song('Somebody to Love').key).toBe('G')
    expect(first('Somebody to Love')).toBe('G')
  })

  it("has I Can't Make You Love Me in G, George Michael's key, not Bonnie Raitt's Bb", () => {
    expect(song("I Can't Make You Love Me").key).toBe('G')
    expect(song("I Can't Make You Love Me").bpm).toBe(58)
  })

  it('has A Different Corner a semitone below the book, in Gb, every chord moved down', () => {
    // The user, 2026-09-29: "G semitone lower is Gb like we play. but then D/G and Am7 semitone lower?"
    const corner = song('A Different Corner')
    expect(corner.key).toBe('Gb')
    const chords = new Set(corner.sections.flatMap(s => s.chords.split(/\s+/).filter(Boolean)))
    expect([...chords].sort()).toEqual(['Abm7', 'Db/Gb', 'Gb'])
    // The book's G, D/G and Am7 voicings a semitone lower, fingered as barres
    expect(corner.shapes).toEqual({ Gb: '2-4-4-3-2-2', 'Db/Gb': '2-x-x-1-2-1', Abm7: '4-6-4-4-4-x' })
    expect(corner.cue).toBeUndefined()
  })

  it('has the Killer / Papa medley as written in the songbook', () => {
    const byName = Object.fromEntries(song('Papa Was a Rolling Stone').sections.map(s => [s.name, s.chords]))
    expect(byName['Killer verse']).toBe('N.C.')        // riff only, no chords
    expect(byName.Killer).toBe('Bbm  Gb  Fm  Bbm  Gb  Fm')
    expect(byName['Trumpet solo']).toContain('Ab')
    expect(byName.Papa).toBe('Bbm7')                  // one-chord vamp
  })

  it('has Fastlove in Am, the band\'s key, on its real groove', () => {
    const byName = Object.fromEntries(song('Fastlove').sections.map(s => [s.name, s.chords]))
    expect(song('Fastlove').key).toBe('Am')
    expect(song('Fastlove').transpose ?? 0).toBe(0) // charted in Am, not Bbm moved down
    expect(byName.Verse).toBe('Dm9  Am11  Dm9  Am11')
    expect(byName.Chorus).toBe('Am7  Fmaj7  Am7  Dm9  Am7  Fmaj7  Em7  Dm9') // songbook no. 13
  })

  it('has the Everything She Wants chorus as the songbook writes it', () => {
    // Songbook no. 11, and the band plays it as the book has it (user,
    // 2026-09-29). It replaced the F# Bm7 E given earlier for the chorus.
    const chorus = song('Everything She Wants').sections.find(s => s.name === 'Chorus')!
    expect(chorus.chords).toBe('F#m  Bm  C#aug  C#  F#m')
  })

  it('uses the recorded tempos for Roxanne and Kissing a Fool', () => {
    expect(song('Roxanne').bpm).toBe(82)
    expect(song('Kissing a Fool').bpm).toBe(78)
  })
})
