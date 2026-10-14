import { describe, it, expect } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { songbookOf } from '../../music/songbook'
import type { Song } from '../../types'

/** Numbers in the George Michael Complete songbook, from the user's own copy. */
const BOOK: Record<string, number> = {
  'Faith': 12,
  "I'm Your Man": 31,
  'Fastlove': 13,
  'Outside': 47,
  'Papa Was a Rolling Stone': 36,
  'Father Figure': 15,
  "Freedom! '90": 19,
  'Jesus to a Child': 35,
  'A Different Corner': 8,
  'Too Funky': 61,
  'Everything She Wants': 11,
  'Somebody to Love': 52,
  'Careless Whisper': 4,
  "I Can't Make You Love Me": 25,
  'Roxanne': 49,
  'Waiting (Reprise)': 63,
  'Kissing a Fool': 37,
}

const songNamed = (title: string) => DEFAULT_SONGS.find(s => s.title === title)!

describe('songbook numbers', () => {
  it('gives each of the 17 songs in the book its number', () => {
    for (const [title, number] of Object.entries(BOOK)) {
      expect(songNamed(title), title).toBeDefined()
      expect(songbookOf(songNamed(title)), title).toBe(number)
    }
  })

  it('has no number for the four songs not in the book', () => {
    const others = DEFAULT_SONGS.filter(s => !(s.title in BOOK)).map(s => s.title).sort()
    expect(others).toEqual(['Amazing', 'Club Tropicana', 'Last Christmas', 'Wake Me Up Before You Go-Go'])
    for (const title of others) expect(songbookOf(songNamed(title))).toBeUndefined()
  })

  it('finds the number for a copy of a built-in song that lost it, such as one from an old backup', () => {
    const copy: Song = { ...songNamed('Roxanne'), songbook: undefined }
    expect(songbookOf(copy)).toBe(49)
  })

  it('has no number for a song the player added', () => {
    const added = { title: 'Encore Jam', sections: [] } as unknown as Song
    expect(songbookOf(added)).toBeUndefined()
  })
})
