import { describe, expect, it } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { parseChordText, unknownChords } from '../../music/chord-text'
import { hasShapes, indexOfShape, voicingsFor } from '../../music/voicings'
import { DEFAULT_VIEW, shownSections, type ChartView } from '../../music/chart-view'
import { formMatches } from '../../music/form'
import { isChartMark } from '../../music/theory'

const VIEWS: ChartView[] = [
  DEFAULT_VIEW,
  { simple: true, guitar: 'acoustic', instrument: 'guitar' },
  { simple: true, guitar: 'electric', instrument: 'guitar' },
]

describe('every built-in chart', () => {
  it('names only real chords', () => {
    const bad = DEFAULT_SONGS.flatMap(song =>
      song.sections.flatMap(s => unknownChords(s.chords).map(c => `${song.title} [${s.name}]: ${c}`)))
    expect(bad).toEqual([])
  })

  it('has a diagram for every chord, in the band key and with plain chords on either guitar', () => {
    const missing = DEFAULT_SONGS.flatMap(song =>
      VIEWS.flatMap(view => shownSections(song, undefined, view).flatMap(s =>
        parseChordText(s.chords).flat()
          .filter(c => !isChartMark(c) && !hasShapes(c))
          .map(c => `${song.title} (${view.simple ? view.guitar : 'as charted'}): ${c}`))))
    expect([...new Set(missing)]).toEqual([])
  })

  it('has researched shapes that exist and play the notes of their chord', () => {
    const bad = DEFAULT_SONGS.flatMap(song =>
      Object.entries(song.shapes ?? {}).flatMap(([name, shape]) => {
        const i = indexOfShape(name, shape)
        if (i < 0) return [`${song.title}: ${name} ${shape} not found`]
        return voicingsFor(name)[i].wrong ? [`${song.title}: ${name} ${shape} plays a wrong note`] : []
      }))
    expect(bad).toEqual([])
  })

  it('has a song order made of its own sections', () => {
    const bad = DEFAULT_SONGS.filter(song => song.form?.length && !formMatches(song.form, song.sections)).map(s => s.title)
    expect(bad).toEqual([])
  })

  it('has a key and a tempo', () => {
    expect(DEFAULT_SONGS.filter(song => !song.key || !song.bpm).map(s => s.title)).toEqual([])
  })
})
