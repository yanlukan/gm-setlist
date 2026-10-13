import { describe, it, expect } from 'vitest'
import { letterAt, letterByName, sectionLetters } from '../../music/letters'
import { DEFAULT_SONGS } from '../../data/songs'

const letters = (title: string) => sectionLetters(DEFAULT_SONGS.find(s => s.title === title)!.sections.map(s => s.name))

describe('section letters', () => {
  it('goes A to Z, then AA, AB', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(letterAt)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA'])
  })

  it('gives each section of a song its letter in chart order', () => {
    expect(letters('Kissing a Fool')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    expect(letters('Faith')).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    const longest = letters('Somebody to Love')
    expect(longest[longest.length - 1]).toBe('L')
  })

  it('keeps the first letter for a name used twice', () => {
    expect(Object.fromEntries(letterByName(['Intro', 'Verse', 'Verse', 'Outro']))).toEqual({ Intro: 'A', Verse: 'B', Outro: 'D' })
  })
})
