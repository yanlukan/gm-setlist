import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_SONGS } from '../../data/songs'
import { bandPlanFor, neckFor, shapeChoice } from '../../hooks/use-band-positions'
import { fretSpan, voicingsFor } from '../../music/voicings'
import { useStore } from '../../store/use-store'
import { moveChords, backToSongShapes, pickSongShape, clearSongShape } from '../../store/song-shapes'

const roxanne = DEFAULT_SONGS.find(s => s.title === 'Roxanne')!
const electric = { simple: false, guitar: 'electric' as const }

const shapesOf = (picks: Record<string, number>) => Object.entries(picks).map(([name, i]) => voicingsFor(name)[i])
const middle = (picks: Record<string, number>) => {
  const span = fretSpan(shapesOf(picks))!
  return (span.min + span.max) / 2
}

describe('moving a song\'s chords up the neck', () => {
  it('finds an area off the open strings for Roxanne on electric', () => {
    expect(neckFor(roxanne, undefined, electric)).toBeGreaterThanOrEqual(5)
  })

  it('sets the songbook\'s open shapes aside and keeps every chord near the area asked for', () => {
    const neck = neckFor(roxanne, undefined, electric)
    const { picks, researched, span } = bandPlanFor(roxanne, { neck }, electric)
    expect(researched).toEqual({})
    expect(span!.open).toBe(false)
    for (const v of shapesOf(picks)) {
      const fretted = v.f.filter((f): f is number => f !== null && f > 0).map(f => (v.s === 0 ? f : v.s + f - 1))
      expect(Math.max(...fretted)).toBeGreaterThan(4)
    }
  })

  it('goes lower or higher when asked', () => {
    const low = bandPlanFor(roxanne, { neck: 5 }, electric).picks
    const high = bandPlanFor(roxanne, { neck: 10 }, electric).picks
    expect(middle(high)).toBeGreaterThan(middle(low) + 2)
  })
})

describe('which shape a chord shows', () => {
  it('this song\'s own pick, then a pick made for every song, then the plan', () => {
    expect(shapeChoice('Bm', { shapes: { Bm: 3 } }, { Bm: 2 }, 1)).toEqual({ index: 3, mine: true })
    expect(shapeChoice('Bm', {}, { Bm: 2 }, 1)).toEqual({ index: 2, mine: true })
    expect(shapeChoice('Bm', {}, {}, 1)).toEqual({ index: 1, mine: false })
  })

  it('a moved song leaves out picks made for every song, which are where the chords were', () => {
    expect(shapeChoice('Bm', { neck: 7 }, { Bm: 2 }, 1)).toEqual({ index: 1, mine: false })
  })
})

describe('saving moved chords', () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState())
  })
  const edits = () => useStore.getState().edits.Roxanne

  it('keeps the area and the song\'s own picks, and goes back to the songbook in one tap', () => {
    pickSongShape('Roxanne', 'Bm', 2)
    expect(edits().shapes).toEqual({ Bm: 2 })
    // Moving starts every chord afresh in the new area
    moveChords('Roxanne', 7)
    expect(edits().neck).toBe(7)
    expect(edits().shapes).toBeUndefined()
    pickSongShape('Roxanne', 'E', 1)
    clearSongShape('Roxanne', 'E')
    expect(edits().shapes).toBeUndefined()
    pickSongShape('Roxanne', 'E', 1)
    backToSongShapes('Roxanne')
    expect(edits().neck).toBeUndefined()
    expect(edits().shapes).toBeUndefined()
    // A pick for one song leaves every other song alone
    expect(useStore.getState().selectedVoicings).toEqual({})
  })
})
